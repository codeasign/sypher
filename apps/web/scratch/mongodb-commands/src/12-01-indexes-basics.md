---
title: "Indexes: What They Are and Why They Matter"
order: 0
---

Without an index, MongoDB answers a query by reading **every document** of the collection. An index is a small, sorted structure that points straight to the matching documents. It is the single biggest lever for query speed, and this page shows the difference in numbers you can reproduce.

## What you'll learn

- What an index is, and what it costs
- Creating, listing and dropping indexes
- Reading the effect with `explain("executionStats")`
- The automatic `_id` index

## Syntax

```js show
db.collection.createIndex({ field: 1 })       // ascending
db.collection.createIndex({ field: -1 })      // descending
db.collection.getIndexes()
db.collection.dropIndex("field_1")
```

## Examples

A scratch collection of 20,000 orders with predictable values gives a clear before and after:

```js run destructive
const lab = db.getSiblingDB("lab_index")
const docs = []
for (let i = 1; i <= 20000; i++) docs.push({ _id: i, customer: "c" + (i % 500), status: ["new", "paid", "shipped", "done"][i % 4], amount: (i * 7) % 1000 });
for (let i = 0; i < docs.length; i += 5000) lab.orders.insertMany(docs.slice(i, i + 5000));
lab.orders.countDocuments()
```

### Before: a collection scan

Find the orders of one customer. Without an index the server must look at all 20,000 documents to return 40:

```js run destructive
const e1 = lab.orders.find({ customer: "c42" }).explain("executionStats").executionStats;
({ stage: JSON.stringify(lab.orders.find({ customer: "c42" }).explain().queryPlanner.winningPlan).includes("COLLSCAN") ? "COLLSCAN" : "other", returned: e1.nReturned, docsExamined: e1.totalDocsExamined })
```

### Create an index

```js run destructive
lab.orders.createIndex({ customer: 1 })
```

### After: an index scan

The same query now reads only the matching entries:

```js run destructive
const e2 = lab.orders.find({ customer: "c42" }).explain("executionStats").executionStats;
({ usesIndex: JSON.stringify(lab.orders.find({ customer: "c42" }).explain().queryPlanner.winningPlan).includes("IXSCAN"), returned: e2.nReturned, keysExamined: e2.totalKeysExamined, docsExamined: e2.totalDocsExamined })
```

From 20,000 documents examined down to 40. The ratio grows with the collection, so on millions of documents this is the difference between milliseconds and minutes.

### List the indexes

```js run destructive
lab.orders.getIndexes().map((i) => [i.name, JSON.stringify(i.key)])
```

`_id_` is created automatically and cannot be dropped.

### Indexes help sorting too

A query that sorts on an indexed field can read the index in order instead of sorting in memory:

```js run destructive
lab.orders.createIndex({ amount: 1 });
const plan = lab.orders.find({}).sort({ amount: 1 }).limit(3).explain().queryPlanner.winningPlan;
[JSON.stringify(plan).includes("IXSCAN"), JSON.stringify(plan).includes('"SORT"')]
```

Index scan yes, in-memory sort stage no.

### Drop an index

```js run destructive
lab.orders.dropIndex("amount_1");
lab.orders.getIndexes().map((i) => i.name)
```

### What an index costs

Every insert, update or delete must also update each index, and every index takes disk and memory. The number of indexes this collection maintains (including `_id`):

```js run destructive
lab.orders.stats().nindexes
```

### The real collections

The DVD Rental collections already carry indexes for the common lookups:

```js run
db.films.getIndexes().map((i) => [i.name, JSON.stringify(i.key)])
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Create a scratch collection of 10,000 documents, run a query on an unindexed field, note `totalDocsExamined`, add the index, run it again and compare.

## Watch out

### An index is not free

Each index slows writes and uses RAM. Index the queries you run, not every field.

### Small collections do not need indexes

A collection of a few hundred documents is scanned in microseconds. Indexes pay off as the collection grows.

### The index must match the query

An index on `customer` does nothing for a query on `status`. The query has to filter or sort on the indexed field (or a prefix of a compound index).

### Building an index on a large collection takes time

It uses CPU and disk. In production, build indexes at a quiet time and watch progress (`currentOp`).

### `_id` is indexed automatically

Do not create another index on `_id`.

## Interview corner

**"What is an index?"**
An ordered data structure (a B-tree) over one or more fields that lets the server find documents without scanning the whole collection.

**"What is the trade-off of adding indexes?"**
Faster reads for matching queries, but slower writes and more storage and memory.

**"How do you check that a query uses an index?"**
`explain("executionStats")`: look for `IXSCAN` in the plan, and compare `totalKeysExamined`/`totalDocsExamined` to `nReturned`.

## Practice

### Warm-up: which indexes exist?

Return the names of the indexes on `customers`, sorted.

```js practice
// hint: `getIndexes().map((i) => i.name).sort()`.
db.customers.getIndexes().map((i) => i.name).sort()
```

### Core: measure the effect

In a scratch collection with 5000 documents `{ k: i % 50 }`, return `[docsExamined before, docsExamined after]` for the query `{ k: 7 }` when an index on `k` is created between the runs.

```js practice destructive
// hint: `explain("executionStats").executionStats.totalDocsExamined`, before and after `createIndex`.
const lab = db.getSiblingDB("lab_index")
lab.t.insertMany(Array.from({ length: 5000 }, (_, i) => ({ _id: i, k: i % 50 })));
const before = lab.t.find({ k: 7 }).explain("executionStats").executionStats.totalDocsExamined;
lab.t.createIndex({ k: 1 });
const after = lab.t.find({ k: 7 }).explain("executionStats").executionStats.totalDocsExamined;
lab.dropDatabase();
[before, after]
```

### Stretch: an index for a sort

Create an index on `n` for 1000 documents `{ n: 1..1000 }` and return whether the plan for `sort({ n: 1 })` contains a `SORT` stage (it should not).

```js practice destructive
// hint: Look for `"SORT"` in the JSON of the winning plan.
const lab = db.getSiblingDB("lab_index")
lab.t.insertMany(Array.from({ length: 1000 }, (_, i) => ({ n: i + 1 })));
lab.t.createIndex({ n: 1 });
const hasSort = JSON.stringify(lab.t.find().sort({ n: 1 }).explain().queryPlanner.winningPlan).includes('"SORT"');
lab.dropDatabase();
hasSort
```
