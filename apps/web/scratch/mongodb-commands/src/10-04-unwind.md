---
title: "$unwind: Flattening Arrays"
order: 0
---

Data in this database lives in arrays: cast lists, special features, rentals, payments. `$unwind` turns an array field into **one document per element**, so you can filter, group and count the elements like ordinary documents. It is the bridge between nested data and reports.

## What you'll learn

- `$unwind` on a simple and a nested array
- Keeping documents with empty or missing arrays
- Including the element's position
- Unwinding twice (two levels), and the memory cost

## Syntax

```js show
{ $unwind: "$arrayField" }
{ $unwind: { path: "$arrayField", preserveNullAndEmptyArrays: true, includeArrayIndex: "pos" } }
```

## Examples

### One film becomes many documents

A film with two special features becomes two documents:

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { title: 1, specialFeatures: 1 } },
  { $unwind: "$specialFeatures" }
])
```

### Count the elements

How often does each special feature occur across all films?

```js run
db.films.aggregate([
  { $unwind: "$specialFeatures" },
  { $group: { _id: "$specialFeatures", films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } }
])
```

### The busiest actors

Unwind the cast and count films per actor:

```js run
db.films.aggregate([
  { $unwind: "$actors" },
  { $group: { _id: { id: "$actors.actorId", name: { $concat: ["$actors.firstName", " ", "$actors.lastName"] } }, films: { $sum: 1 } } },
  { $sort: { films: -1, "_id.id": 1 } },
  { $limit: 3 }
])
```

### The position in the array

`includeArrayIndex` adds the element's index:

```js run
db.films.aggregate([
  { $match: { _id: 2 } },
  { $unwind: { path: "$actors", includeArrayIndex: "position" } },
  { $project: { _id: 0, position: { $toInt: "$position" }, actor: "$actors.lastName" } },
  { $limit: 3 }
])
```

### Empty and missing arrays vanish

By default, a document whose array is empty or missing produces **no output**. Test with a scratch collection:

```js run destructive
const lab = db.getSiblingDB("lab_unwind")
lab.posts.insertMany([{ _id: 1, tags: ["a", "b"] }, { _id: 2, tags: [] }, { _id: 3 }, { _id: 4, tags: null }, { _id: 5, tags: "solo" }]);
[
  lab.posts.aggregate([{ $unwind: "$tags" }]).toArray().length,
  lab.posts.aggregate([{ $unwind: { path: "$tags", preserveNullAndEmptyArrays: true } }]).toArray().length
]
```

`preserveNullAndEmptyArrays: true` keeps documents 2, 3 and 4 (one output each). A non-array value (`"solo"`) is treated as a one-element array:

```js run destructive
lab.posts.aggregate([{ $unwind: "$tags" }, { $project: { tags: 1 } }, { $sort: { _id: 1, tags: 1 } }]).toArray().map((d) => d._id + ":" + d.tags)
```

```js run destructive
lab.dropDatabase()
```

### Two levels: customers, rentals, payments

Each customer has rentals, each rental has payments. Unwind both to reach a single payment:

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: "$_id", payments: { $sum: 1 }, total: { $sum: "$rentals.payments.amount" } } },
  { $project: { payments: 1, total: { $round: ["$total", 2] } } }
])
```

### Best customers by total paid

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: "$_id", name: { $first: { $concat: ["$name.first", " ", "$name.last"] } }, paid: { $sum: "$rentals.payments.amount" } } },
  { $project: { name: 1, paid: { $round: ["$paid", 2] } } },
  { $sort: { paid: -1, _id: 1 } },
  { $limit: 3 }
])
```

## Try it yourself

Find which category has the most distinct actors. (Hint: unwind `actors`, group by category and `$addToSet` the actor ids.)

## Watch out

### `$unwind` multiplies documents

A collection of 1000 films with 5 features each becomes 5000 documents. Two unwinds multiply again. On big data, filter first and unwind only what you need.

### Empty arrays disappear silently

If some documents have no elements, they drop out of counts. Use `preserveNullAndEmptyArrays: true` when they should still count.

### Other fields are copied to every output

Each element document carries all the fields of the parent, which uses memory. Use `$project` before `$unwind` to keep only what you need.

### Prefer array operators when you can

If you only need a count, `$size` avoids unwinding. If you need a filtered array, `$filter` avoids it. Unwind when you must group or join elements.

## Interview corner

**"What does `$unwind` do?"**
It deconstructs an array field, outputting one document per element with the element in place of the array.

**"What happens to documents with an empty array?"**
They are dropped unless `preserveNullAndEmptyArrays: true` is set.

**"How would you count elements across all documents?"**
`$unwind` the array, then `$group` on the element with `$sum: 1`.

## Practice

### Warm-up: unwind and count

How many (film, special feature) pairs are there in total?

```js practice
// hint: `$unwind` then `$count`.
db.films.aggregate([{ $unwind: "$specialFeatures" }, { $count: "pairs" }])
```

### Core: most common feature

Which special feature appears in the most films of category `Horror`? Return `{ _id, films }`.

```js practice
// hint: `$match`, `$unwind`, `$group`, `$sort`, `$limit: 1`.
db.films.aggregate([
  { $match: { "category.name": "Horror" } },
  { $unwind: "$specialFeatures" },
  { $group: { _id: "$specialFeatures", films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } },
  { $limit: 1 }
])
```

### Stretch: two levels

How many payments are there in total across all customers? Return `{ payments: n }`.

```js practice
// hint: Two `$unwind` stages, or `$size` per rental.
db.customers.aggregate([{ $unwind: "$rentals" }, { $unwind: "$rentals.payments" }, { $count: "payments" }])
```
