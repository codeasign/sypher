---
title: "$facet, $bucket and $bucketAuto"
order: 0
---

Dashboards need several summaries of the same data at once: a histogram, a top-N list, a total. `$facet` runs several sub-pipelines over the same input in one query, and `$bucket` and `$bucketAuto` build histograms by putting values into ranges.

## What you'll learn

- `$bucket` with explicit boundaries
- `$bucketAuto` for evenly filled buckets
- `$facet` for multi-part reports
- Limits of `$facet`

## Syntax

```js show
{ $bucket: { groupBy: "$field", boundaries: [0, 50, 100], default: "other", output: { n: { $sum: 1 } } } }
{ $bucketAuto: { groupBy: "$field", buckets: 4, output: { n: { $sum: 1 } } } }
{ $facet: { nameA: [ ...stages ], nameB: [ ...stages ] } }
```

## Examples

### $bucket: a histogram with your own ranges

Film lengths in 30-minute bands. Each bucket includes its lower bound and excludes its upper bound:

```js run
db.films.aggregate([
  { $bucket: {
      groupBy: "$lengthMinutes",
      boundaries: [0, 60, 90, 120, 150, 200],
      default: "other",
      output: { films: { $sum: 1 }, avgRate: { $avg: "$rentalRate" } }
  } },
  { $project: { films: 1, avgRate: { $round: ["$avgRate", 2] } } }
])
```

### Values outside the boundaries

Without `default`, a value outside all boundaries is an error. With it, they land in that bucket. Show the edge: a boundary list that misses the long films:

```js run
db.films.aggregate([
  { $bucket: { groupBy: "$lengthMinutes", boundaries: [0, 100, 150], default: "150 and more", output: { films: { $sum: 1 } } } }
])
```

### $bucketAuto: buckets with a similar count

You say how many buckets; MongoDB chooses the boundaries so each has about the same number of documents:

```js run
db.films.aggregate([
  { $bucketAuto: { groupBy: "$lengthMinutes", buckets: 4 } }
])
```

### $facet: several reports in one query

Each key is a sub-pipeline over the same input. Here: a rating breakdown, a length histogram and the top 3 titles for films costing 4.99:

```js run lines=60
db.films.aggregate([
  { $match: { rentalRate: 4.99 } },
  { $facet: {
      byRating: [{ $sortByCount: "$rating" }, { $sort: { count: -1, _id: 1 } }],
      byLength: [{ $bucket: { groupBy: "$lengthMinutes", boundaries: [0, 90, 150, 200], output: { films: { $sum: 1 } } } }],
      longest: [{ $sort: { lengthMinutes: -1, title: 1 } }, { $limit: 3 }, { $project: { _id: 0, title: 1, lengthMinutes: 1 } }],
      total: [{ $count: "n" }]
  } }
])
```

### Price bands for payments

Group the 16044 payments into amount ranges:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $bucket: { groupBy: "$rentals.payments.amount", boundaries: [0, 1, 3, 5, 12], default: "12+", output: { payments: { $sum: 1 } } } }
])
```

### A facet feeding a UI

Filters in a shop show counts per category next to the results. That is a `$facet` with one branch per filter:

```js run
db.films.aggregate([
  { $match: { lengthMinutes: { $lt: 60 } } },
  { $facet: {
      categories: [{ $sortByCount: "$category.name" }, { $sort: { count: -1, _id: 1 } }, { $limit: 3 }],
      ratings: [{ $sortByCount: "$rating" }, { $sort: { _id: 1 } }]
  } }
])
```

## Try it yourself

Build a facet with three branches for the `Horror` category: films per rating, a histogram of `replacementCost` in bands of 5 (10, 15, 20, 25, 30), and the three cheapest titles.

## Watch out

### `$bucket` boundaries must be sorted and of one type

They must be in ascending order, and the values must match the `groupBy` type.

### `$facet` output is one document

The results of all branches must fit into the 16 MB document limit. Do not facet over thousands of rows in a branch without limiting.

### `$facet` cannot use an index after the first stage

The stages inside the branches run on the in-memory stream. Put a `$match` **before** the `$facet` so an index can help.

### `$bucketAuto` boundaries change when the data changes

They are derived from the data, so a chart built on them may shift from day to day. Use `$bucket` when the ranges must stay fixed.

### Some stages are not allowed inside `$facet`

`$facet`, `$out`, `$merge`, `$geoNear` and `$collStats` cannot be used inside a branch.

## Interview corner

**"What does `$facet` do?"**
Runs multiple independent sub-pipelines on the same set of input documents and returns all results in one document.

**"What is the difference between `$bucket` and `$bucketAuto`?"**
`$bucket` uses boundaries you specify. `$bucketAuto` chooses boundaries to spread the documents over a number of buckets.

**"How do you build a histogram in MongoDB?"**
With `$bucket` or `$bucketAuto`, or with a `$group` on a computed range key.

## Practice

### Warm-up: a histogram

Count films by replacement cost band: 0 to 15, 15 to 25, 25 to 35.

```js practice
// hint: `$bucket` with boundaries `[0, 15, 25, 35]`.
db.films.aggregate([{ $bucket: { groupBy: "$replacementCost", boundaries: [0, 15, 25, 35], output: { films: { $sum: 1 } } } }])
```

### Core: auto buckets

Split `replacementCost` into 3 buckets of similar size and return them.

```js practice
// hint: `$bucketAuto` with `buckets: 3`.
db.films.aggregate([{ $bucketAuto: { groupBy: "$replacementCost", buckets: 3 } }])
```

### Stretch: two branches

For `PG-13` films, return in one query: the number of films per `rentalRate` and the total number of films.

```js practice
// hint: `$facet` with `$sortByCount` and `$count`.
db.films.aggregate([
  { $match: { rating: "PG-13" } },
  { $facet: {
      byRate: [{ $sortByCount: "$rentalRate" }, { $sort: { _id: 1 } }],
      total: [{ $count: "n" }]
  } }
])
```
