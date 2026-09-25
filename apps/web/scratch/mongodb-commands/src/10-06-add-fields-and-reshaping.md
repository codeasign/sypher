---
title: "Reshaping: $addFields, $set, $unset, $replaceRoot"
order: 0
---

`$project` selects fields. Often you want to **keep everything and add a few computed fields**, remove one or two, or promote a nested document to the top level. Four stages do that: `$addFields` (alias `$set`), `$unset`, `$replaceRoot` and `$replaceWith`.

## What you'll learn

- `$addFields` and `$set` to add or overwrite fields
- `$unset` to remove fields
- `$replaceRoot` / `$replaceWith` to make a subdocument the whole document
- `$project` versus `$addFields`: when to use which

## Syntax

```js show
{ $addFields: { newField: <expression>, existing: <expression> } }
{ $set: { ... } }                       // alias of $addFields
{ $unset: ["a", "b.c"] }
{ $replaceRoot: { newRoot: "$subdoc" } }
{ $replaceWith: "$subdoc" }
```

## Examples

### Add computed fields, keep the rest

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $set: {
      hours: { $round: [{ $divide: ["$lengthMinutes", 60] }, 2] },
      castSize: { $size: "$actors" },
      isLong: { $gt: ["$lengthMinutes", 120] }
  } },
  { $project: { title: 1, hours: 1, castSize: 1, isLong: 1, _id: 0 } }
])
```

Without the final `$project`, all original fields would appear as well. That is the point of `$set`: it adds to what is there.

### Overwrite a field

If the name already exists, `$set` replaces its value:

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $set: { title: { $concat: ["$title", " (", { $toString: "$releaseYear" }, ")"] } } },
  { $project: { _id: 0, title: 1 } }
])
```

### Add into a nested field

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $set: { "category.short": { $toUpper: { $substrCP: ["$category.name", 0, 3] } } } },
  { $project: { _id: 0, category: 1 } }
])
```

### $unset: remove fields

Handy for dropping heavy or private fields before returning data. The stores hold staff password hashes:

```js run
db.stores.aggregate([
  { $unset: ["staff", "inventory"] }
])
```

```js run
db.stores.aggregate([
  { $project: { staffNames: { $map: { input: "$staff", as: "s", in: { $concat: ["$$s.name.first", " ", "$$s.name.last"] } } } } },
  { $sort: { _id: 1 } }
])
```

### $replaceRoot: promote a subdocument

Make the embedded `address` the whole document:

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $replaceRoot: { newRoot: "$address" } }
])
```

### $replaceWith: the short form, with a merge

Combine parent fields with a nested document using `$mergeObjects`:

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $replaceWith: { $mergeObjects: [{ customerId: "$_id", email: "$email" }, "$address"] } },
  { $project: { customerId: 1, email: 1, city: 1, country: 1 } }
])
```

### Turn the result of an unwind into a flat list

`$unwind` a nested array, then promote each element to be the document:

```js run
db.films.aggregate([
  { $match: { _id: 3 } },
  { $unwind: "$actors" },
  { $replaceWith: { $mergeObjects: [{ film: "$title" }, "$actors"] } }
])
```

### $project versus $addFields

| Use | When |
|---|---|
| `$project` | You want to define the exact output shape (a whitelist) |
| `$addFields` / `$set` | You want to keep everything and add or change a few fields |
| `$unset` | You want to keep everything except a few fields |

## Try it yourself

For film 4, add `costPerHour` (`rentalRate` divided by hours, rounded to 2 decimals) and remove `actors` and `description` from the output with `$unset`.

## Watch out

### `$addFields` on an array field with dotted path

`{ $set: { "actors.x": 1 } }` adds `x` to **every element** of the array, which is often a surprise. To change one element use `$map`.

### `$replaceRoot` fails if the target is not a document

If `$address` is missing or `null` for some documents, the stage raises an error. Guard with `$ifNull` or `$match` first.

### New fields are added at the end

Overwriting an existing field keeps its position; a new field goes last. Do not rely on field order when comparing documents.

### Do not use `$project` just to hide fields

With `{ $project: { actors: 0 } }` you still list only the excluded fields, which is fine, but `$unset` says what you mean and is easier to read.

## Interview corner

**"What is the difference between `$project` and `$addFields`?"**
`$project` defines exactly which fields exist in the output. `$addFields` keeps all existing fields and adds or overwrites some.

**"What does `$replaceRoot` do?"**
It replaces the input document with a specified document, usually a subdocument, so nested data becomes the top level.

**"How do you merge two objects in an aggregation?"**
With `$mergeObjects`, often inside `$replaceWith`.

## Practice

### Warm-up: add a field

For film 5, return `title` and `long` (`true` when `lengthMinutes` is more than 100).

```js practice
// hint: `$set` then `$project`.
db.films.aggregate([
  { $match: { _id: 5 } },
  { $set: { long: { $gt: ["$lengthMinutes", 100] } } },
  { $project: { _id: 0, title: 1, long: 1 } }
])
```

### Core: promote

For film 5, return only its `category` document as the top-level result.

```js practice
// hint: `$replaceRoot: { newRoot: "$category" }`.
db.films.aggregate([{ $match: { _id: 5 } }, { $replaceRoot: { newRoot: "$category" } }])
```

### Stretch: flat cast list

For film 5, return one document per actor with `film` and `actor` (full name).

```js practice
// hint: `$unwind` then `$project` with `$concat`.
db.films.aggregate([
  { $match: { _id: 5 } },
  { $unwind: "$actors" },
  { $project: { _id: 0, film: "$title", actor: { $concat: ["$actors.firstName", " ", "$actors.lastName"] } } }
])
```
