---
title: "$group: Summarising Data"
order: 0
---

`$group` is the heart of aggregation. It collects documents that share a key into one output document per key, and computes totals, averages, minimums and lists over each group. It is MongoDB's `GROUP BY`.

## What you'll learn

- Grouping by one field, several fields and an expression
- Accumulators: `$sum`, `$avg`, `$min`, `$max`
- Grouping everything into one result with `_id: null`
- Following a group with `$match` (SQL `HAVING`) and `$sort`

## Syntax

```js show
{ $group: {
    _id: <group key expression>,
    total: { $sum: "$field" },
    average: { $avg: "$field" },
    count: { $sum: 1 }
} }
```

## Examples

### Count per group

```js run
db.films.aggregate([
  { $group: { _id: "$rating", films: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

### Several accumulators at once

```js run lines=60
db.films.aggregate([
  { $group: {
      _id: "$rating",
      films: { $sum: 1 },
      avgLength: { $avg: "$lengthMinutes" },
      shortest: { $min: "$lengthMinutes" },
      longest: { $max: "$lengthMinutes" },
      totalRate: { $sum: "$rentalRate" }
  } },
  { $project: { films: 1, avgLength: { $round: ["$avgLength", 1] }, shortest: 1, longest: 1, totalRate: { $round: ["$totalRate", 2] } } },
  { $sort: { _id: 1 } }
])
```

### Everything in one group

`_id: null` means "one group for all documents": a grand total:

```js run
db.films.aggregate([
  { $group: { _id: null, films: { $sum: 1 }, minutes: { $sum: "$lengthMinutes" }, avgCost: { $avg: "$replacementCost" } } },
  { $project: { _id: 0, films: 1, minutes: 1, avgCost: { $round: ["$avgCost", 2] } } }
])
```

### Group by two fields

The key can be a document:

```js run
db.films.aggregate([
  { $group: { _id: { rating: "$rating", rate: "$rentalRate" }, films: { $sum: 1 } } },
  { $sort: { "_id.rating": 1, "_id.rate": 1 } },
  { $limit: 4 }
])
```

### Group by a computed key

Group films into length bands:

```js run
db.films.aggregate([
  { $group: { _id: { $multiply: [{ $floor: { $divide: ["$lengthMinutes", 60] } }, 60] }, films: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

### HAVING: filter the groups

`$match` after `$group` filters groups, like SQL `HAVING`:

```js run
db.films.aggregate([
  { $group: { _id: "$category.name", films: { $sum: 1 } } },
  { $match: { films: { $gte: 70 } } },
  { $sort: { films: -1, _id: 1 } }
])
```

### WHERE and HAVING together

`$match` before filters the input rows, `$match` after filters the groups:

```js run
db.films.aggregate([
  { $match: { rentalRate: 4.99 } },
  { $group: { _id: "$rating", films: { $sum: 1 } } },
  { $match: { films: { $gt: 65 } } },
  { $sort: { _id: 1 } }
])
```

### Grouping across the nested rentals

Rentals live inside customers. To group them, `$unwind` first (next pages go deeper):

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: "$rentals.storeId", rentals: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

## Try it yourself

For each rating, find the average replacement cost and the number of films with `rentalRate` 0.99, in one `$group` (hint: `$sum` with `$cond`).

## Watch out

### Group order is not guaranteed

`$group` returns groups in no particular order. Always add a `$sort` when the order matters.

### `$group` can use a lot of memory

Each stage may use up to 100 MB of RAM. For very large group counts, add `allowDiskUse: true`, filter first, or group on an indexed key with a preceding `$sort`.

### `$avg` ignores missing and null values

Only numeric values count. A field that is missing in half the documents gives an average over the other half, not over all.

### `_id` in `$group` is the key, not the document id

The output `_id` is your group key. That is why later stages refer to `_id.rating`, not `rating`.

### `$sum: 1` counts, `$sum: "$field"` adds

Mixing them up is a common source of wrong totals.

## Interview corner

**"How do you do `GROUP BY` in MongoDB?"**
With the `$group` stage: `_id` holds the grouping expression, and accumulators such as `$sum`, `$avg`, `$min`, `$max` compute per group.

**"How do you write `HAVING`?"**
A `$match` stage placed after the `$group`.

**"What does `_id: null` do in `$group`?"**
It puts all input documents in one group, for totals over the entire collection.

## Practice

### Warm-up: count per category

How many films per category? Show the two biggest categories only (ties by name).

```js practice
// hint: `$group`, `$sort`, `$limit`.
db.films.aggregate([
  { $group: { _id: "$category.name", films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } },
  { $limit: 2 }
])
```

### Core: average per rating

Average `lengthMinutes` per rating, rounded to 1 decimal, ordered by rating. Return `{ _id, avg }`.

```js practice
// hint: `$avg` then `$round` in `$project`.
db.films.aggregate([
  { $group: { _id: "$rating", avg: { $avg: "$lengthMinutes" } } },
  { $project: { avg: { $round: ["$avg", 1] } } },
  { $sort: { _id: 1 } }
])
```

### Stretch: two keys and HAVING

For each (`rating`, `rentalDurationDays`) pair, count the films, keep pairs with more than 40 films, and order by count descending then rating.

```js practice
// hint: Two-field key, `$match` after `$group`.
db.films.aggregate([
  { $group: { _id: { rating: "$rating", days: "$rentalDurationDays" }, films: { $sum: 1 } } },
  { $match: { films: { $gt: 40 } } },
  { $sort: { films: -1, "_id.rating": 1, "_id.days": 1 } }
])
```
