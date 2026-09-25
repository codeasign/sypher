---
title: "Data Modelling Patterns"
order: 0
---

In MongoDB you design the data around the **questions you ask**, not around normal forms. A handful of named patterns cover most designs. This page shows five of them, using the DVD Rental data as the starting point.

## What you'll learn

- The workload-first way of designing a model
- Extended reference, subset, computed and bucket patterns
- One-to-many at three scales
- Trade-offs each pattern makes

## Syntax

```js show
// one-to-few: embed          { film: { actors: [ {...}, {...} ] } }
// one-to-many: reference     { rental: { customerId: 7 } }
// one-to-squillions: parent reference only
```

## Examples

### Start from the questions

Write down the top reads and writes and how often each happens. For the rental data:

| Question | Frequency | Shape it wants |
|---|---|---|
| Show a film page with its cast | very high | film + actors in one read |
| List one customer's recent rentals | high | rentals grouped by customer |
| Revenue per category per month | daily batch | an aggregate, may be precomputed |
| Record a new rental and payment | high | small write on one document |

The existing model embeds actors in films (read together, small, bounded) and rentals in customers (read together, but growing). The next patterns fix the weak spots.

### Pattern 1: extended reference

Reference by id but copy the few fields you always display, so most reads need no join. A rental copy of the film's title and rating:

```js run destructive
const lab = db.getSiblingDB("lab_model")
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $unwind: "$rentals" },
  { $limit: 3 },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f" } },
  { $project: { _id: 0, customerId: "$_id", rentalId: "$rentals.rentalId", filmId: "$rentals.filmId", film: { title: { $arrayElemAt: ["$f.title", 0] }, rating: { $arrayElemAt: ["$f.rating", 0] } } } },
  { $out: { db: "lab_model", coll: "rentals" } }
]);
lab.rentals.find({}, { _id: 0 }).sort({ rentalId: 1 }).toArray()
```

Reading rentals now shows titles with no `$lookup`. The cost: if a film title changes, the copies must be updated (rare for titles).

### Pattern 2: subset

Keep only the most-used part of a big array in the main document, and the rest elsewhere. A film page shows the first three cast members; the full list lives in another collection:

```js run destructive
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { title: 1, topCast: { $slice: ["$actors", 3] }, castTotal: { $size: "$actors" } } }
])
```

The main document stays small (good for cache), and "show all cast" is a second query.

### Pattern 3: computed

Store a value you calculate often. The number of rentals and total paid per customer, computed once and kept up to date:

```js run destructive
db.customers.aggregate([
  { $match: { _id: { $lte: 3 } } },
  { $project: { rentalCount: { $size: "$rentals" }, totalPaid: { $round: [{ $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } }, 2] } } },
  { $merge: { into: { db: "lab_model", coll: "customer_stats" }, on: "_id" } }
]);
lab.customer_stats.find().sort({ _id: 1 }).toArray()
```

Reads are instant; writes must keep it current (an update on each rental, or a periodic `$merge` as here).

### Pattern 4: bucket

For time-based data (sensor readings, clicks), group many events into one document per hour or day instead of one document per event:

```js run destructive
lab.readings.insertMany([
  { sensor: "s1", at: new Date("2026-01-01T10:00:00Z"), v: 20 },
  { sensor: "s1", at: new Date("2026-01-01T10:20:00Z"), v: 21 },
  { sensor: "s1", at: new Date("2026-01-01T11:05:00Z"), v: 22 }
]);
lab.readings.aggregate([
  { $group: { _id: { sensor: "$sensor", hour: { $dateTrunc: { date: "$at", unit: "hour" } } }, values: { $push: "$v" }, n: { $sum: 1 }, avg: { $avg: "$v" } } },
  { $sort: { "_id.hour": 1 } }
])
```

One bucket per hour holds the events and precomputed summaries. Fewer documents, smaller indexes. (Time series collections, module 3, do this automatically.)

### Pattern 5: one-to-squillions

If a parent can have millions of children, never embed them. Reference the parent from each child and index that field:

```js run destructive
lab.events.createIndex({ customerId: 1, at: -1 });
lab.events.insertOne({ customerId: 1, at: new Date("2026-01-01T00:00:00Z"), type: "login" });
lab.events.getIndexes().map((i) => i.name)
```

### Embed or reference: the decision table

| | Embed | Reference |
|---|---|---|
| Read together? | Yes | Rarely |
| Bounded size? | Yes (a few to a few hundred) | No |
| Child changes on its own? | Rarely | Often |
| Shared by many parents? | No | Yes |
| Needs atomic update with parent? | Yes | No |

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Take the "customer with 599 customers and 16044 rentals" model and decide: if rentals grew to 10 million, which pattern would you apply? Sketch the two collections and the indexes.

## Watch out

### Duplication needs a plan for updates

Extended references and computed values go stale. Decide who updates them and how quickly.

### Do not optimise a read you never make

Patterns trade write cost for read speed. Apply them where the workload proves the need.

### Unbounded arrays are bugs waiting to happen

A field that grows for ever (comments, logs, events) eventually breaks the 16 MB limit or slows updates.

### Multi-document consistency is harder

Once related data is in several documents, keeping it consistent may need transactions (module 14).

## Interview corner

**"Explain the extended reference pattern."**
Store a reference id plus the few most-used fields of the referenced document, so common reads avoid a join, at the cost of duplication.

**"When do you use the bucket pattern?"**
For high-volume time-ordered data: group events into one document per time window to reduce document count and index size.

**"How do you model one-to-many relationships?"**
Embed for few (bounded), reference from the child for many, and reference only from the child for unbounded ones.

## Practice

### Warm-up: which pattern?

For each need return the pattern name in an array: (1) copy the film title into each rental, (2) group sensor events per hour, (3) keep the first 3 actors in the film, in this order as strings: `"extended reference"`, `"bucket"`, `"subset"`.

```js practice
// hint: The three names in order.
["extended reference", "bucket", "subset"]
```

### Core: a computed field

For customer 1 return `{ rentalCount, totalPaid }` (rounded to 2 decimals) computed from the embedded data.

```js practice
// hint: `$size` and `$reduce`.
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, rentalCount: { $size: "$rentals" }, totalPaid: { $round: [{ $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } }, 2] } } }
])
```

### Stretch: bucket by day

In a scratch collection insert readings for two days and return the number of daily buckets.

```js practice destructive
// hint: `$dateTrunc` with `unit: "day"`, then `$group` and count.
const lab = db.getSiblingDB("lab_model")
lab.r.insertMany([
  { at: new Date("2026-01-01T01:00:00Z"), v: 1 }, { at: new Date("2026-01-01T23:00:00Z"), v: 2 }, { at: new Date("2026-01-02T05:00:00Z"), v: 3 }
]);
const n = lab.r.aggregate([{ $group: { _id: { $dateTrunc: { date: "$at", unit: "day" } } } }, { $count: "n" }]).toArray()[0].n
lab.dropDatabase();
n
```
