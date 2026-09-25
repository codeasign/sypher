---
title: "Interview Problems: Running Totals, Percentages and Medians"
order: 0
---

Reporting questions ask for cumulative sums, share of the total, month-over-month change and percentiles. Window functions and `$group` handle all of them.

## What you'll learn

- A running (cumulative) total per month
- Percentage of a total, per row and per group
- Month-over-month change with `$shift`
- Median and percentiles with `$median` and `$percentile`

## Syntax

```js show
{ $setWindowFields: { sortBy: { month: 1 }, output: { running: { $sum: "$revenue", window: { documents: ["unbounded", "current"] } } } } }
{ $group: { _id: null, median: { $median: { input: "$x", method: "approximate" } } } }
```

## Examples

### Problem 1: monthly revenue

First the base table: payments per month (payment dates are text, so the first 7 characters are the month):

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: { $substrCP: ["$rentals.payments.paymentDate", 0, 7] }, revenue: { $sum: "$rentals.payments.amount" } } },
  { $project: { revenue: { $round: ["$revenue", 2] } } },
  { $sort: { _id: 1 } }
])
```

### Problem 2: running total of revenue

Add a cumulative column with a window over the monthly table:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: { $substrCP: ["$rentals.payments.paymentDate", 0, 7] }, revenue: { $sum: "$rentals.payments.amount" } } },
  { $setWindowFields: { sortBy: { _id: 1 }, output: { running: { $sum: "$revenue", window: { documents: ["unbounded", "current"] } } } } },
  { $project: { revenue: { $round: ["$revenue", 2] }, running: { $round: ["$running", 2] } } },
  { $sort: { _id: 1 } },
  { $limit: 4 }
])
```

### Problem 3: month-over-month change

`$shift` reads the previous month:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: { $substrCP: ["$rentals.payments.paymentDate", 0, 7] }, revenue: { $sum: "$rentals.payments.amount" } } },
  { $setWindowFields: { sortBy: { _id: 1 }, output: { prev: { $shift: { output: "$revenue", by: -1 } } } } },
  { $project: { revenue: { $round: ["$revenue", 2] }, changePct: { $cond: [{ $eq: ["$prev", null] }, null, { $round: [{ $multiply: [{ $divide: [{ $subtract: ["$revenue", "$prev"] }, "$prev"] }, 100] }, 1] }] } } },
  { $sort: { _id: 1 } },
  { $limit: 4 }
])
```

### Problem 4: share of the total

What percentage of all films does each rating hold?

```js run
db.films.aggregate([
  { $group: { _id: "$rating", films: { $sum: 1 } } },
  { $setWindowFields: { output: { total: { $sum: "$films" } } } },
  { $project: { films: 1, pct: { $round: [{ $multiply: [{ $divide: ["$films", "$total"] }, 100] }, 1] } } },
  { $sort: { _id: 1 } }
])
```

### Problem 5: share within a group

Each film's share of its category's total length (first three films of Sports):

```js run
db.films.aggregate([
  { $match: { "category.name": "Sports" } },
  { $setWindowFields: { output: { categoryMinutes: { $sum: "$lengthMinutes" } } } },
  { $project: { _id: 0, title: 1, pct: { $round: [{ $multiply: [{ $divide: ["$lengthMinutes", "$categoryMinutes"] }, 100] }, 2] } } },
  { $sort: { title: 1 } },
  { $limit: 3 }
])
```

### Problem 6: the median

`$median` (MongoDB 7.0+) returns the middle value; `$percentile` several at once:

```js run
db.films.aggregate([
  { $group: { _id: null,
      median: { $median: { input: "$lengthMinutes", method: "approximate" } },
      quartiles: { $percentile: { input: "$lengthMinutes", p: [0.25, 0.75], method: "approximate" } } } },
  { $project: { _id: 0, median: 1, quartiles: 1 } }
])
```

### Problem 7: the exact median, the older way

Sort, then take the middle element(s) of the array:

```js run
db.films.aggregate([
  { $sort: { lengthMinutes: 1 } },
  { $group: { _id: null, all: { $push: "$lengthMinutes" }, n: { $sum: 1 } } },
  { $project: { _id: 0, median: { $avg: [{ $arrayElemAt: ["$all", { $floor: { $divide: [{ $subtract: ["$n", 1] }, 2] } }] }, { $arrayElemAt: ["$all", { $floor: { $divide: ["$n", 2] } }] }] } } }
])
```

## Try it yourself

Compute the average payment per customer, then the median of those averages. And find the month with the largest month-over-month increase.

## Watch out

### A window needs an order

A running total without `sortBy` is meaningless. Use a unique or complete sort key.

### Percent of total needs the total in the same row

Either a window without bounds (as above), or a `$group` with `_id: null` followed by `$lookup`/`$unionWith` (slower).

### `$median` and `$percentile` are approximate by default

The `approximate` method is fast and needs little memory. Exact percentiles need sorting and arrays, as in Problem 7.

### Watch integer division

MongoDB `$divide` returns a decimal, so `1 / 2` is `0.5`. In a `$round` remember the decimals.

## Interview corner

**"How do you compute a running total?"**
`$setWindowFields` with `$sum` over a window from `"unbounded"` to `"current"`, sorted by the ordering field.

**"How do you get a percentage of the total?"**
A `$sum` window without bounds (or a second grouping) gives the total on each row; divide and multiply by 100.

**"How do you compute a median?"**
`$median` (7.0+) for an approximate median, or sort and pick the middle element of an array for an exact one.

## Practice

### Warm-up: percentage

What share of films (in percent, 1 decimal) is rated `PG-13`? Return a number.

```js practice
// hint: `countDocuments` twice.
Math.round(db.films.countDocuments({ rating: "PG-13" }) / db.films.countDocuments() * 1000) / 10
```

### Core: running total by film id

For films 1 to 5, return the running total of `replacementCost` ordered by `_id`, rounded to 2 decimals.

```js practice
// hint: `$setWindowFields`, then `$round`.
db.films.aggregate([
  { $match: { _id: { $lte: 5 } } },
  { $setWindowFields: { sortBy: { _id: 1 }, output: { running: { $sum: "$replacementCost", window: { documents: ["unbounded", "current"] } } } } },
  { $project: { running: { $round: ["$running", 2] } } },
  { $sort: { _id: 1 } }
])
```

### Stretch: the median replacement cost per rating

Return the exact median `replacementCost` per rating (average of the two middle values when even).

```js practice
// hint: Sort, `$push` into an array per rating, then take the middle.
db.films.aggregate([
  { $sort: { replacementCost: 1 } },
  { $group: { _id: "$rating", all: { $push: "$replacementCost" }, n: { $sum: 1 } } },
  { $project: { median: { $round: [{ $avg: [{ $arrayElemAt: ["$all", { $floor: { $divide: [{ $subtract: ["$n", 1] }, 2] } }] }, { $arrayElemAt: ["$all", { $floor: { $divide: ["$n", 2] } }] }] }, 2] } } },
  { $sort: { _id: 1 } }
])
```
