---
title: "Projection: Choosing Fields"
order: 0
---

A projection is the second argument of `find`. It tells the server which fields to send back. Smaller results are faster, and projections keep sensitive fields (such as the password hashes inside `stores`) out of your output.

## What you'll learn

- Including and excluding fields
- Projecting fields inside embedded documents and arrays
- `$slice`, `$elemMatch` and the positional projection
- Computed fields with expressions

## Syntax

```js show
db.collection.find(filter, { field: 1 })        // include only these (plus _id)
db.collection.find(filter, { field: 0 })        // exclude these
db.collection.find(filter, { "a.b": 1 })        // nested field
db.collection.find(filter, { arr: { $slice: 2 } })
```

## Examples

### Include some fields

`_id` is included unless you exclude it:

```js run
db.films.find({ _id: 7 }, { title: 1, rating: 1 })
```

```js run
db.films.find({ _id: 7 }, { title: 1, rating: 1, _id: 0 })
```

### Exclude fields

Everything except the ones you list:

```js run
db.films.find({ _id: 7 }, { description: 0, actors: 0, specialFeatures: 0, lastUpdated: 0 })
```

### Nested fields

```js run
db.films.find({ _id: 7 }, { title: 1, "category.name": 1, "language.name": 1, _id: 0 })
```

### Arrays: the first N or the last N

`$slice` limits how many array elements come back:

```js run
db.films.find({ _id: 7 }, { title: 1, actors: { $slice: 2 }, _id: 0 })
```

```js run
db.films.find({ _id: 7 }, { title: 1, actors: { $slice: -1 }, _id: 0 })
```

### Fields of the elements of an array

A dotted path reaches inside every element:

```js run
db.films.find({ _id: 7 }, { title: 1, "actors.lastName": 1, _id: 0 })
```

### $elemMatch: the first element that matches

For a customer, return only the rental with a given id instead of all 32:

```js run
db.customers.find({ _id: 1 }, { _id: 0, "name.last": 1, rentals: { $elemMatch: { rentalId: 76 } } }).toArray().map((d) => ({ last: d.name.last, rentalIds: d.rentals.map((r) => r.rentalId) }))
```

### Computed fields (aggregation expressions)

Since MongoDB 4.4, a projection can use expressions:

```js run
db.films.find({ _id: 7 }, { _id: 0, title: 1, hours: { $round: [{ $divide: ["$lengthMinutes", 60] }, 1] }, castSize: { $size: "$actors" } })
```

### Keep secrets out

The `stores` documents hold staff records. Project only what you need:

```js run
db.stores.find({}, { _id: 1, managerStaffId: 1, staffCount: { $size: "$staff" }, films: { $size: "$inventory" } })
```

## Try it yourself

Return the title, category name and the first two actors of film 50. Then return everything of film 50 **except** `actors` and `description`.

## Watch out

### Include and exclude cannot be mixed

`{ title: 1, actors: 0 }` is an error. The only exception is `_id: 0`, which may sit next to inclusions.

### `$slice` in a projection is different from `$slice` in aggregation

In `find` it uses the `{ field: { $slice: n } }` form shown above. In `aggregate` it is `{ $slice: ["$field", n] }`.

### Projection does not change what is stored

It only shapes the result. To remove a field permanently use `$unset` (module 8).

### An empty projection returns all fields

`find(filter, {})` is the same as no projection. To return only `_id`, use `{ _id: 1 }`.

## Interview corner

**"Why use a projection?"**
It reduces the data sent over the network and can let the server answer from an index alone (a *covered query*), and it keeps sensitive fields from leaking.

**"Can you mix `1` and `0` in a projection?"**
Not on ordinary fields. Either list what you want or list what you do not want. `_id: 0` is the one exception.

**"What does `$elemMatch` do in a projection?"**
It returns only the first array element that satisfies the condition, instead of the whole array.

## Practice

### Warm-up: two fields

Return `title` and `rentalRate` of film 12, without `_id`.

```js practice
// hint: `{ title: 1, rentalRate: 1, _id: 0 }`.
db.films.find({ _id: 12 }, { title: 1, rentalRate: 1, _id: 0 })
```

### Core: nested and sliced

Return the film title, its category name and just the first actor for film 12 (no `_id`).

```js practice
// hint: `"category.name": 1` and `actors: { $slice: 1 }`.
db.films.find({ _id: 12 }, { _id: 0, title: 1, "category.name": 1, actors: { $slice: 1 } })
```

### Stretch: a computed field

For film 12, return `title` and `costPerMinute`: `rentalRate` divided by `lengthMinutes`, rounded to 4 decimals (no `_id`).

```js practice
// hint: `$round: [{ $divide: [...] }, 4]`.
db.films.find({ _id: 12 }, { _id: 0, title: 1, costPerMinute: { $round: [{ $divide: ["$rentalRate", "$lengthMinutes"] }, 4] } })
```
