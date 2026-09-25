---
title: "Interview Problems: Pivot, Unpivot and Conditional Aggregation"
order: 0
---

"Turn rows into columns" is a classic reporting request. MongoDB has no `PIVOT` keyword, but conditional accumulators, `$arrayToObject` and `$objectToArray` do the same job, and they go both ways.

## What you'll learn

- Pivoting with conditional sums
- Building a pivot dynamically with `$arrayToObject`
- Unpivoting an object into rows with `$objectToArray`
- Cross-tabs and totals

## Syntax

```js show
{ $group: { _id: "$row", a: { $sum: { $cond: [{ $eq: ["$col", "a"] }, 1, 0] } } } }
{ $replaceRoot: { newRoot: { $arrayToObject: [ [ { k: "name", v: value } ] ] } } }
{ $objectToArray: "$doc" }
```

## Examples

### Problem 1: rating by rental price, as a cross-tab

Rows are ratings, columns are the three prices. Fixed columns, conditional sums:

```js run
db.films.aggregate([
  { $group: { _id: "$rating",
      p099: { $sum: { $cond: [{ $eq: ["$rentalRate", 0.99] }, 1, 0] } },
      p299: { $sum: { $cond: [{ $eq: ["$rentalRate", 2.99] }, 1, 0] } },
      p499: { $sum: { $cond: [{ $eq: ["$rentalRate", 4.99] }, 1, 0] } },
      total: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

### Problem 2: a dynamic pivot

When the column values are not known in advance, group twice and turn the pairs into an object with `$arrayToObject`:

```js run
db.films.aggregate([
  { $group: { _id: { rating: "$rating", rate: { $toString: "$rentalRate" } }, n: { $sum: 1 } } },
  { $group: { _id: "$_id.rating", cols: { $push: { k: "$_id.rate", v: "$n" } } } },
  { $replaceWith: { $mergeObjects: [{ rating: "$_id" }, { $arrayToObject: [{ $sortArray: { input: "$cols", sortBy: { k: 1 } } }] }] } },
  { $sort: { rating: 1 } }
])
```

### Problem 3: pivot with a total row

Add a final row with the grand total. A `$facet` runs the detail rows and the total in one query, and the arrays are then joined back into rows:

```js run
db.films.aggregate([
  { $facet: {
      rows: [{ $group: { _id: "$category.name", films: { $sum: 1 } } }, { $sort: { films: -1, _id: 1 } }, { $limit: 2 }],
      total: [{ $group: { _id: "TOTAL", films: { $sum: 1 } } }]
  } },
  { $project: { rows: { $concatArrays: ["$rows", "$total"] } } },
  { $unwind: "$rows" },
  { $replaceWith: "$rows" }
])
```

### Problem 4: unpivot an object into rows

A document with a column per year becomes one row per year. First make such a wide document, then reverse it:

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, wide: { title_len: { $strLenCP: "$title" }, minutes: "$lengthMinutes", cost: "$replacementCost" } } },
  { $project: { pairs: { $objectToArray: "$wide" } } },
  { $unwind: "$pairs" },
  { $project: { measure: "$pairs.k", value: "$pairs.v" } }
])
```

### Problem 5: customers per country, top countries as columns

The three biggest countries as separate fields of one document:

```js run
db.customers.aggregate([
  { $group: { _id: "$address.country", n: { $sum: 1 } } },
  { $sort: { n: -1, _id: 1 } },
  { $limit: 3 },
  { $group: { _id: null, cols: { $push: { k: "$_id", v: "$n" } } } },
  { $replaceWith: { $arrayToObject: "$cols" } }
])
```

### Problem 6: conditional aggregation without pivot

Several measures per group in one pass, the everyday version of the same idea:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: "$rentals.storeId",
      rentals: { $sum: 1 },
      unreturned: { $sum: { $cond: [{ $eq: ["$rentals.returnDate", null] }, 1, 0] } },
      paidRentals: { $sum: { $cond: [{ $gt: [{ $size: "$rentals.payments" }, 0] }, 1, 0] } } } },
  { $sort: { _id: 1 } }
])
```

## Try it yourself

Build a cross-tab of category (rows) by rating (columns) for four categories of your choice, once with fixed conditional sums and once with the dynamic `$arrayToObject` form.

## Watch out

### Column names become field names

`$arrayToObject` keys must be strings without dots (`.`) or a leading `$`. A price such as `4.99` must be turned into text and cleaned (`4_99`) before it can be a key.

### The number of columns is limited by the 16 MB document

A dynamic pivot with thousands of distinct values makes huge documents. Pivot only low-cardinality columns.

### Missing combinations are missing fields

The dynamic pivot only has a key for values that occurred. Fill gaps in the application, or use the fixed-column form.

### Do it in the client when it is presentation

Pivoting is often just formatting. If the output feeds a chart, the client may be the better place.

## Interview corner

**"How do you pivot data in MongoDB?"**
Group by the row key with conditional `$sum` for each fixed column, or group twice and use `$arrayToObject` for dynamic columns.

**"How do you unpivot?"**
`$objectToArray` turns an object into an array of `{ k, v }` pairs, and `$unwind` makes each a row.

**"What does `$arrayToObject` expect?"**
An array of `{ k, v }` documents (or two-element arrays) and returns an object with those keys and values.

## Practice

### Warm-up: conditional count

For each category, count films rated `G` and films rated `R`, as `{ _id, g, r }`, ordered by category, first three.

```js practice
// hint: Two conditional sums.
db.films.aggregate([
  { $group: { _id: "$category.name", g: { $sum: { $cond: [{ $eq: ["$rating", "G"] }, 1, 0] } }, r: { $sum: { $cond: [{ $eq: ["$rating", "R"] }, 1, 0] } } } },
  { $sort: { _id: 1 } },
  { $limit: 3 }
])
```

### Core: dynamic pivot

One document per `rentalDurationDays` value (as key) with its number of films, as a single object.

```js practice
// hint: `$group`, then `$arrayToObject` of `{ k, v }` pairs (keys must be strings).
db.films.aggregate([
  { $group: { _id: { $toString: "$rentalDurationDays" }, n: { $sum: 1 } } },
  { $sort: { _id: 1 } },
  { $group: { _id: null, cols: { $push: { k: "$_id", v: "$n" } } } },
  { $replaceWith: { $arrayToObject: "$cols" } }
])
```

### Stretch: unpivot

For film 1 turn `{ minutes: lengthMinutes, cost: replacementCost }` into two rows `{ measure, value }`.

```js practice
// hint: `$objectToArray`, `$unwind`.
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, wide: { minutes: "$lengthMinutes", cost: "$replacementCost" } } },
  { $project: { pairs: { $objectToArray: "$wide" } } },
  { $unwind: "$pairs" },
  { $project: { measure: "$pairs.k", value: "$pairs.v" } }
])
```
