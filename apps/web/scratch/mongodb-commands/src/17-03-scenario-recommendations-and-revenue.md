---
title: "Scenario: Recommendations and a Revenue Dashboard"
order: 0
---

Two questions that every rental business asks. **What should we recommend?** ("customers who rented this also rented...") and **how are we doing?** (revenue by store, category and month). Both are aggregations over the same data, and both benefit from starting narrow and checking the result.

## What you'll learn

- Co-occurrence recommendations with `$lookup` and `$unwind`
- Popularity ranking with a minimum-support filter
- A multi-part revenue dashboard with `$facet`
- Sanity checks that catch wrong numbers

## Syntax

```js show
// customers who rented film X -> their other films -> count -> top N
```

## Examples

### Step 1: who rented the film?

Take film 663 (PATIENT SISTER). The customers who rented it:

```js run
db.customers.aggregate([{ $match: { "rentals.filmId": 663 } }, { $count: "customers" }])
```

### Step 2: the other films those customers rented

Unwind their rentals, drop the film itself, and count how many of those customers rented each other film:

```js run
db.customers.aggregate([
  { $match: { "rentals.filmId": 663 } },
  { $project: { films: { $setUnion: ["$rentals.filmId", []] } } },
  { $unwind: "$films" },
  { $match: { films: { $ne: 663 } } },
  { $group: { _id: "$films", customers: { $sum: 1 } } },
  { $sort: { customers: -1, _id: 1 } },
  { $limit: 3 }
])
```

`$setUnion` with an empty array removes duplicates, so a customer who rented a film twice counts once.

### Step 3: turn ids into titles

```js run
db.customers.aggregate([
  { $match: { "rentals.filmId": 663 } },
  { $project: { films: { $setUnion: ["$rentals.filmId", []] } } },
  { $unwind: "$films" },
  { $match: { films: { $ne: 663 } } },
  { $group: { _id: "$films", customers: { $sum: 1 } } },
  { $sort: { customers: -1, _id: 1 } },
  { $limit: 3 },
  { $lookup: { from: "films", localField: "_id", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $project: { _id: 0, title: { $arrayElemAt: ["$f.title", 0] }, customers: 1 } }
])
```

### Step 4: is it a real signal?

The counts are tiny because few customers rented this film. A recommendation needs **support**: enough customers behind it. Compare with the most rented films overall:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: "$rentals.filmId", rentals: { $sum: 1 } } },
  { $sort: { rentals: -1, _id: 1 } },
  { $limit: 3 },
  { $lookup: { from: "films", localField: "_id", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $project: { _id: 0, title: { $arrayElemAt: ["$f.title", 0] }, rentals: 1 } }
])
```

A practical recommender mixes both: co-occurrence with a minimum support, falling back to global popularity.

### Step 5: the revenue dashboard

One pipeline, four questions: total, per store, per category (top 3) and per month. `$facet` runs them on the same unwound payments:

```js run lines=60
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { "category.name": 1 } }] } },
  { $facet: {
      total: [{ $group: { _id: null, revenue: { $sum: "$rentals.payments.amount" } } }, { $project: { _id: 0, revenue: { $round: ["$revenue", 2] } } }],
      byStore: [{ $group: { _id: "$rentals.storeId", revenue: { $sum: "$rentals.payments.amount" } } }, { $project: { revenue: { $round: ["$revenue", 2] } } }, { $sort: { _id: 1 } }],
      topCategories: [{ $group: { _id: { $arrayElemAt: ["$f.category.name", 0] }, revenue: { $sum: "$rentals.payments.amount" } } }, { $project: { revenue: { $round: ["$revenue", 2] } } }, { $sort: { revenue: -1, _id: 1 } }, { $limit: 3 }],
      byMonth: [{ $group: { _id: { $substrCP: ["$rentals.payments.paymentDate", 0, 7] }, revenue: { $sum: "$rentals.payments.amount" } } }, { $project: { revenue: { $round: ["$revenue", 2] } } }, { $sort: { _id: 1 } }]
  } }
])
```

### Step 6: sanity checks

Every part must add up to the total. The store and month parts each sum to the same figure:

```js run
const r = db.customers.aggregate([
  { $unwind: "$rentals" }, { $unwind: "$rentals.payments" },
  { $facet: {
      total: [{ $group: { _id: null, t: { $sum: "$rentals.payments.amount" } } }],
      byStore: [{ $group: { _id: "$rentals.storeId", t: { $sum: "$rentals.payments.amount" } } }],
      byMonth: [{ $group: { _id: { $substrCP: ["$rentals.payments.paymentDate", 0, 7] }, t: { $sum: "$rentals.payments.amount" } } }]
  } }
]).toArray()[0];
const sum = (a) => Math.round(a.reduce((s, x) => s + x.t, 0) * 100) / 100;
[Math.round(r.total[0].t * 100) / 100, sum(r.byStore), sum(r.byMonth)]
```

## Try it yourself

Recommend three films for customer 148: films rented by customers with similar taste (rented at least 3 of the same films), which customer 148 has not rented.

## Watch out

### Small counts are noise

A recommendation supported by two customers is a coincidence. Require a minimum support and fall back to popular items.

### Counting rentals versus customers

"Rented 10 times" can be one customer 10 times. Count distinct customers for taste, and rentals for demand.

### Precompute for the front page

Reports over all payments belong in a scheduled job that writes a summary collection (`$merge`), not in every page view.

### Always add a total check

If the parts do not add up to the whole, a join or unwind duplicated rows.

## Interview corner

**"How would you build a 'customers also rented' feature in MongoDB?"**
Find customers who rented the item, unwind their other items, group and count distinct customers, apply a minimum support, and join titles. For scale, precompute item-to-item counts in a collection.

**"How do you make sure a dashboard number is right?"**
Reconcile the parts against the total (or against a second method) every time the pipeline changes.

## Practice

### Warm-up: most rented film

The `_id` of the most rented film (ties by id).

```js practice
// hint: Unwind rentals, group by `filmId`, sort, limit 1.
db.customers.aggregate([{ $unwind: "$rentals" }, { $group: { _id: "$rentals.filmId", rentals: { $sum: 1 } } }, { $sort: { rentals: -1, _id: 1 } }, { $limit: 1 }])
```

### Core: revenue per store

Revenue per store, rounded to 2 decimals, ordered by store.

```js practice
// hint: Unwind rentals and payments, group by `rentals.storeId`.
db.customers.aggregate([
  { $unwind: "$rentals" }, { $unwind: "$rentals.payments" },
  { $group: { _id: "$rentals.storeId", revenue: { $sum: "$rentals.payments.amount" } } },
  { $project: { revenue: { $round: ["$revenue", 2] } } }, { $sort: { _id: 1 } }
])
```

### Stretch: co-renters

How many customers rented both film 663 and film 875? Return `{ customers: n }`.

```js practice
// hint: `$setIsSubset` of `[663, 875]` against the rented film ids.
db.customers.aggregate([{ $project: { r: "$rentals.filmId" } }, { $match: { $expr: { $setIsSubset: [[663, 875], "$r"] } } }, { $count: "customers" }])
```
