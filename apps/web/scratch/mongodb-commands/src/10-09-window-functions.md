---
title: "Window Functions with $setWindowFields"
order: 0
---

A `$group` collapses documents. A **window function** keeps every document and adds a value computed over its neighbours: a running total, a rank, a moving average, the previous row's value. In MongoDB (5.0+) that is the `$setWindowFields` stage.

## What you'll learn

- Partitioning and ordering with `partitionBy` and `sortBy`
- Ranking with `$rank`, `$denseRank` and `$documentNumber`
- Running totals and moving averages with `window`
- Looking at the previous or next row with `$shift`

## Syntax

```js show
{ $setWindowFields: {
    partitionBy: "$field",
    sortBy: { other: 1 },
    output: {
      rank: { $rank: {} },
      running: { $sum: "$x", window: { documents: ["unbounded", "current"] } }
    }
} }
```

## Examples

### Rank inside each group

Rank films by length within their rating. `$rank` gives equal values the same rank and leaves gaps, and it needs a `sortBy` with exactly one key. Here are the films at ranks 1 and 2, grouped so ties show as counts:

```js run
db.films.aggregate([
  { $match: { rating: { $in: ["G", "R"] } } },
  { $setWindowFields: { partitionBy: "$rating", sortBy: { lengthMinutes: -1 }, output: { rank: { $rank: {} } } } },
  { $match: { rank: { $lte: 2 } } },
  { $group: { _id: { rating: "$rating", rank: "$rank", minutes: "$lengthMinutes" }, films: { $sum: 1 } } },
  { $sort: { "_id.rating": 1, "_id.rank": 1 } }
])
```

Only rank 1 appears. Three films tie for the longest length in each rating, so the next rank is 4: `$rank` leaves gaps after ties.

### rank, denseRank and documentNumber

Compare `$rank` and `$denseRank` over the same order:

```js run
db.films.aggregate([
  { $match: { rating: "G" } },
  { $setWindowFields: { sortBy: { lengthMinutes: -1 }, output: { rank: { $rank: {} }, dense: { $denseRank: {} } } } },
  { $match: { lengthMinutes: { $gte: 184 } } },
  { $project: { _id: 0, lengthMinutes: 1, rank: 1, dense: 1 } },
  { $group: { _id: { l: "$lengthMinutes", r: "$rank", d: "$dense" }, films: { $sum: 1 } } },
  { $sort: { "_id.l": -1 } }
])
```

Several films of 185 minutes share rank 1; the next length gets a rank that skips ahead (`$rank`) or the next number (`$denseRank`).

### Top N per group with a rank

The classic "first 2 per category" without `$topN`. `$documentNumber` numbers the rows 1, 2, 3... in `sortBy` order (alphabetical here, so the numbering is stable):

```js run
db.films.aggregate([
  { $match: { "category.name": { $in: ["Music", "Travel"] } } },
  { $setWindowFields: { partitionBy: "$category.name", sortBy: { title: 1 }, output: { n: { $documentNumber: {} } } } },
  { $match: { n: { $lte: 2 } } },
  { $project: { _id: 0, category: "$category.name", title: 1, n: 1 } },
  { $sort: { category: 1, n: 1 } }
])
```

### Running total

A cumulative sum along an order. The window `["unbounded", "current"]` means "from the first row to this one":

```js run
db.films.aggregate([
  { $match: { rating: "NC-17", rentalDurationDays: 3 } },
  { $setWindowFields: { sortBy: { title: 1 }, output: { runningMinutes: { $sum: "$lengthMinutes", window: { documents: ["unbounded", "current"] } } } } },
  { $project: { _id: 0, title: 1, lengthMinutes: 1, runningMinutes: 1 } },
  { $sort: { title: 1 } },
  { $limit: 4 }
])
```

### Moving average

Average of the current row and the two before it:

```js run
db.films.aggregate([
  { $match: { rating: "NC-17", rentalDurationDays: 3 } },
  { $setWindowFields: { sortBy: { title: 1 }, output: { avg3: { $avg: "$lengthMinutes", window: { documents: [-2, 0] } } } } },
  { $project: { _id: 0, title: 1, lengthMinutes: 1, avg3: { $round: ["$avg3", 1] } } },
  { $sort: { title: 1 } },
  { $limit: 4 }
])
```

### Previous and next values

`$shift` reads a value from another row. Use it to compute differences:

```js run
db.films.aggregate([
  { $match: { rating: "NC-17", rentalDurationDays: 3 } },
  { $setWindowFields: { sortBy: { title: 1 }, output: { prevLength: { $shift: { output: "$lengthMinutes", by: -1, default: null } } } } },
  { $project: { _id: 0, title: 1, lengthMinutes: 1, prevLength: 1 } },
  { $sort: { title: 1 } },
  { $limit: 3 }
])
```

### Share of a group total

Without a window bound, an aggregate covers the whole partition, so every row can see the total:

```js run
db.films.aggregate([
  { $match: { rating: "G" } },
  { $setWindowFields: { partitionBy: "$category.name", output: { categoryMinutes: { $sum: "$lengthMinutes" } } } },
  { $project: { _id: 0, title: 1, category: "$category.name", share: { $round: [{ $multiply: [{ $divide: ["$lengthMinutes", "$categoryMinutes"] }, 100] }, 1] } } },
  { $sort: { category: 1, title: 1 } },
  { $limit: 3 }
])
```

## Try it yourself

Take the customers and compute a running count of customers ordered by `createdAt` and `_id`. Then give each customer their rank by number of rentals within their `address.country`.

## Watch out

### `sortBy` is required for ranks and bounded windows

`$rank`, `$denseRank` and `$documentNumber` need a `sortBy` with exactly one key. If that key has ties, `$rank` gives tied rows the same rank, but `$documentNumber` numbers them in an unstable order, so sort by a unique field (such as `title` or `_id`) when you need exact positions.

### `documents` versus `range` windows

`documents: [-2, 0]` means "two rows before to this one". `range` windows use the **value** of the sort field (for example, 10 units before), and need a numeric or date sort key.

### Memory limits apply

Like `$group`, `$setWindowFields` can exceed the 100 MB stage limit on large partitions. Use `allowDiskUse` and partition to keep windows small.

### It is not a filter

The stage adds fields; it does not remove documents. Filter afterwards with `$match`, as the rank examples do.

## Interview corner

**"What are window functions?"**
Calculations across a set of rows related to the current row (a partition, ordered), that keep each row instead of collapsing them. In MongoDB: `$setWindowFields`.

**"How do you get the top N per group in MongoDB?"**
`$topN` in `$group`, or `$setWindowFields` with `$rank`/`$documentNumber` per partition followed by `$match`.

**"What is the difference between `$rank` and `$denseRank`?"**
`$rank` leaves gaps after ties (1, 1, 3), `$denseRank` does not (1, 1, 2).

## Practice

### Warm-up: rank

Number the films of category `Travel` alphabetically by title with `$documentNumber`, and return the title numbered 1.

```js practice
// hint: `partitionBy` is not needed; match the category first.
db.films.aggregate([
  { $match: { "category.name": "Travel" } },
  { $setWindowFields: { sortBy: { title: 1 }, output: { n: { $documentNumber: {} } } } },
  { $match: { n: 1 } },
  { $project: { _id: 0, title: 1 } }
])
```

### Core: running total

For films 1 to 5 (ordered by `_id`), return `_id` and the running total of `lengthMinutes`.

```js practice
// hint: window `["unbounded", "current"]`.
db.films.aggregate([
  { $match: { _id: { $lte: 5 } } },
  { $setWindowFields: { sortBy: { _id: 1 }, output: { running: { $sum: "$lengthMinutes", window: { documents: ["unbounded", "current"] } } } } },
  { $project: { running: 1 } },
  { $sort: { _id: 1 } }
])
```

### Stretch: difference to the previous film

For films 1 to 4 (by `_id`), return `_id` and the length difference to the previous film (`null` for the first).

```js practice
// hint: `$shift` with `by: -1`, then `$subtract`, guarding the first row with `$cond`.
db.films.aggregate([
  { $match: { _id: { $lte: 4 } } },
  { $setWindowFields: { sortBy: { _id: 1 }, output: { prev: { $shift: { output: "$lengthMinutes", by: -1, default: null } } } } },
  { $project: { diff: { $cond: [{ $eq: ["$prev", null] }, null, { $subtract: ["$lengthMinutes", "$prev"] }] } } },
  { $sort: { _id: 1 } }
])
```
