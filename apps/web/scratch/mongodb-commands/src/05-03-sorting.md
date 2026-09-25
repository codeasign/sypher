---
title: "Sorting Results"
order: 0
---

`sort()` orders the documents of a cursor. It looks simple, but a few details (ties, missing fields, mixed types) decide whether your result is stable and correct.

## What you'll learn

- Ascending and descending sort on one or several fields
- Sorting nested fields and dates
- How `null`, missing values and mixed types sort
- Making a sort deterministic

## Syntax

```js show
db.collection.find(filter).sort({ field: 1 })              // ascending
db.collection.find(filter).sort({ a: -1, b: 1 })           // a descending, then b ascending
```

## Examples

### One field

The 3 longest films:

```js run
db.films.find({}, { title: 1, lengthMinutes: 1, _id: 0 }).sort({ lengthMinutes: -1, title: 1 }).limit(3)
```

### Several fields: ties broken by the next key

Films rated `G` at 0.99, ordered by length (descending) then title:

```js run
db.films.find({ rating: "G", rentalRate: 0.99 }, { title: 1, lengthMinutes: 1, _id: 0 }).sort({ lengthMinutes: -1, title: 1 }).limit(4)
```

### Nested fields and text

```js run
db.films.find({}, { title: 1, "category.name": 1, _id: 0 }).sort({ "category.name": 1, title: -1 }).limit(3)
```

### Sorting text dates

The dates in this database are text in `YYYY-MM-DD hh:mm:ss` form. That format sorts correctly as text, so the earliest customers are:

```js run
db.customers.find({}, { "name.last": 1, createdAt: 1, _id: 1 }).sort({ createdAt: 1, _id: 1 }).limit(2)
```

### Nulls and missing values

`null` sorts before every number and string. In this data 183 rentals have `returnDate: null` (not returned yet). Sorted ascending, they come first:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $project: { _id: 0, rentalId: "$rentals.rentalId", returnDate: "$rentals.returnDate" } },
  { $sort: { returnDate: 1, rentalId: 1 } },
  { $limit: 3 }
])
```

### The order across types

When one field holds different types, MongoDB sorts by type first: null, numbers, strings, objects, arrays, booleans, dates. You can see that on a scratch collection:

```js run destructive
const lab = db.getSiblingDB("lab_sort")
lab.mixed.insertMany([{ v: "b" }, { v: 10 }, { v: null }, { v: true }, { v: "a" }, { v: 2 }, { v: new Date(0) }, { v: { x: 1 } }]);
lab.mixed.find({}, { _id: 0 }).sort({ v: 1 }).toArray().map((d) => JSON.stringify(d.v))
```

```js run destructive
lab.dropDatabase()
```

### Sorting arrays

A sort on an array field uses the smallest element (ascending) or the largest (descending):

```js run
db.films.find({ _id: { $in: [1, 2, 3] } }, { title: 1, "specialFeatures": 1, _id: 0 }).sort({ specialFeatures: 1, title: 1 })
```

## Try it yourself

Find the 5 cheapest rentals (`rentalRate`) in the `Horror` category, shortest film first among equals.

## Watch out

### Ties have no guaranteed order

If two documents have the same sort key, their relative order can change between runs. Add a unique field (`_id` or `title`) as the last sort key for a stable order. This matters most when paging.

### Sorting a big result needs an index, or memory

A sort that cannot use an index happens in memory and is limited to 100 MB unless `allowDiskUse` is on. Index the sort fields for large collections (module 12).

### Text does not sort like a dictionary by default

Comparison is by binary value, so uppercase sorts before lowercase (`"Zebra" < "apple"`). For language-aware ordering use a **collation**:

```js show
db.films.find().sort({ title: 1 }).collation({ locale: "en", strength: 2 })
```

### Order of keys in `sort()` matters

`{ a: 1, b: -1 }` and `{ b: -1, a: 1 }` are different sorts. Write the most important key first.

## Interview corner

**"How do you sort in MongoDB?"**
`find().sort({ field: 1 })` for ascending and `-1` for descending, with several keys for tie-breaking.

**"How does MongoDB sort a field with mixed types?"**
By BSON type order first (null, numbers, strings, objects, arrays, binary, ObjectId, booleans, dates, ...), then by value inside a type.

**"Why should a sort include a unique field?"**
To make the order deterministic. Ties otherwise come back in an unspecified order, which breaks pagination.

## Practice

### Warm-up: shortest films

Return the titles and lengths of the 2 shortest films (ties by title).

```js practice
// hint: `sort({ lengthMinutes: 1, title: 1 }).limit(2)`.
db.films.find({}, { title: 1, lengthMinutes: 1, _id: 0 }).sort({ lengthMinutes: 1, title: 1 }).limit(2)
```

### Core: two keys

List the first 3 films by `rating` ascending, then `title` descending. Return `rating` and `title`.

```js practice
// hint: `sort({ rating: 1, title: -1 })`.
db.films.find({}, { rating: 1, title: 1, _id: 0 }).sort({ rating: 1, title: -1 }).limit(3)
```

### Stretch: the most expensive replacement

Return the title and `replacementCost` of the 3 films with the highest replacement cost, ties by title.

```js practice
// hint: Sort descending by `replacementCost`, ascending by `title`.
db.films.find({}, { title: 1, replacementCost: 1, _id: 0 }).sort({ replacementCost: -1, title: 1 }).limit(3)
```
