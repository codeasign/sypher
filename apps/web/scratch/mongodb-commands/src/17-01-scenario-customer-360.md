---
title: "Scenario: A Customer 360 Report"
order: 0
---

A support agent opens a customer and needs one screen: who they are, how much they have paid, their favourite category, their latest rentals with film titles, and whether anything is overdue. In SQL that is five joins. Here you build it as **one aggregation**, step by step, and check each step.

## What you'll learn

- Building a report incrementally, verifying each stage
- Combining array expressions, `$lookup` and `$facet` in one pipeline
- Keeping the pipeline fast by matching one customer first
- Turning the result into a reusable function

## Syntax

```js show
db.customers.aggregate([
  { $match: { _id: customerId } },
  /* enrich: totals, favourite category, latest rentals, overdue */
])
```

## Examples

### Step 1: the customer and their totals

Start from the one customer. The totals come from array expressions, no unwind:

```js run
db.customers.aggregate([
  { $match: { _id: 148 } },
  { $project: {
      name: { $concat: ["$name.first", " ", "$name.last"] },
      email: 1,
      country: "$address.country",
      rentals: { $size: "$rentals" },
      paid: { $round: [{ $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } }, 2] },
      open: { $size: { $filter: { input: "$rentals", as: "r", cond: { $eq: ["$$r.returnDate", null] } } } }
  } }
])
```

### Step 2: the favourite category

Unwind this customer's rentals (at most a few dozen), join the films, and count by category:

```js run
db.customers.aggregate([
  { $match: { _id: 148 } },
  { $unwind: "$rentals" },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { "category.name": 1 } }] } },
  { $unwind: "$f" },
  { $group: { _id: "$f.category.name", rentals: { $sum: 1 } } },
  { $sort: { rentals: -1, _id: 1 } },
  { $limit: 3 }
])
```

### Step 3: the latest rentals with titles

```js run
db.customers.aggregate([
  { $match: { _id: 148 } },
  { $unwind: "$rentals" },
  { $sort: { "rentals.rentalDate": -1 } },
  { $limit: 3 },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $project: { _id: 0, rentalId: "$rentals.rentalId", at: "$rentals.rentalDate", title: { $arrayElemAt: ["$f.title", 0] }, returned: { $ne: ["$rentals.returnDate", null] } } }
])
```

### Step 4: put it together with $facet

One pass over the customer's data, three named parts. The `$facet` branches run on the same matched customer:

```js run lines=60
db.customers.aggregate([
  { $match: { _id: 148 } },
  { $facet: {
      summary: [{ $project: { _id: 0, name: { $concat: ["$name.first", " ", "$name.last"] }, rentals: { $size: "$rentals" }, paid: { $round: [{ $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } }, 2] } } }],
      favourite: [
        { $unwind: "$rentals" },
        { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { "category.name": 1 } }] } },
        { $unwind: "$f" },
        { $group: { _id: "$f.category.name", rentals: { $sum: 1 } } },
        { $sort: { rentals: -1, _id: 1 } },
        { $limit: 1 }
      ],
      latest: [
        { $unwind: "$rentals" },
        { $sort: { "rentals.rentalDate": -1 } },
        { $limit: 2 },
        { $project: { _id: 0, rentalId: "$rentals.rentalId", at: "$rentals.rentalDate" } }
      ]
  } },
  { $project: { summary: { $arrayElemAt: ["$summary", 0] }, favourite: { $arrayElemAt: ["$favourite", 0] }, latest: 1 } }
])
```

### Step 5: check against the plain data

Cross-check the total with a second method, straight from the unwound data:

```js run
db.customers.aggregate([{ $match: { _id: 148 } }, { $unwind: "$rentals" }, { $unwind: "$rentals.payments" }, { $group: { _id: null, paid: { $sum: "$rentals.payments.amount" } } }, { $project: { _id: 0, paid: { $round: ["$paid", 2] } } }])
```

Both give the same number, so the report is trustworthy.

### Step 6: make it a function

```js run
const customer360 = (id) => db.customers.aggregate([
  { $match: { _id: id } },
  { $project: { name: { $concat: ["$name.first", " ", "$name.last"] }, rentals: { $size: "$rentals" }, open: { $size: { $filter: { input: "$rentals", as: "r", cond: { $eq: ["$$r.returnDate", null] } } } } } }
]).toArray()[0];
[customer360(5), customer360(999999)]
```

The second call returns `undefined` for a missing customer. The API layer turns that into a 404.

### How fast is it?

The pipeline starts with `$match` on `_id`, so only one document is read, however many customers exist:

```js run
db.customers.explain("executionStats").aggregate([{ $match: { _id: 148 } }, { $project: { name: 1 } }]).executionStats.totalDocsExamined
```

## Try it yourself

Extend the report with the customer's five most expensive rentals (by total payment) and the average number of days they kept a film before returning it.

## Watch out

### Match one customer first

Without the leading `$match`, the same pipeline unwinds all 16044 rentals and joins each one. Always narrow first.

### `$lookup` per rental is a join per row

Fine for one customer. For a report over all customers, precompute or restructure (module 13).

### Facets share the same input

Each `$facet` branch reads the matched customer. Put the expensive filtering before the `$facet`.

### A report is a contract

Fix the field names and types your API returns and test them, so front-end code does not break when you refactor the pipeline.

## Interview corner

**"How would you build a customer dashboard from several collections?"**
One aggregation starting with `$match` on the customer, using array expressions for embedded data, `$lookup` for other collections, and `$facet` to return several parts together, or precompute a summary document if it is read often.

**"How do you verify an aggregation?"**
Compute the key numbers a second way and compare.

## Practice

### Warm-up: the summary

For customer 5 return `{ name, rentals }`.

```js practice
// hint: `$project` with `$concat` and `$size`.
db.customers.aggregate([{ $match: { _id: 5 } }, { $project: { _id: 0, name: { $concat: ["$name.first", " ", "$name.last"] }, rentals: { $size: "$rentals" } } }])
```

### Core: the favourite category

The category customer 5 rented most (ties by name).

```js practice
// hint: Unwind, `$lookup` films, group by category.
db.customers.aggregate([
  { $match: { _id: 5 } }, { $unwind: "$rentals" },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f" } },
  { $unwind: "$f" },
  { $group: { _id: "$f.category.name", rentals: { $sum: 1 } } },
  { $sort: { rentals: -1, _id: 1 } }, { $limit: 1 }
])
```

### Stretch: open rentals with titles

Titles of the unreturned rentals of customer 5, sorted.

```js practice
// hint: `$unwind`, `$match` returnDate null, `$lookup` for the title.
db.customers.aggregate([
  { $match: { _id: 5 } }, { $unwind: "$rentals" },
  { $match: { "rentals.returnDate": null } },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f" } },
  { $project: { _id: 0, title: { $arrayElemAt: ["$f.title", 0] } } },
  { $sort: { title: 1 } }
])
```
