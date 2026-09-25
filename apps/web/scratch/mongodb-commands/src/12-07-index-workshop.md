---
title: "Index Workshop: Design and Prove"
order: 0
---

Six tuning tasks. For each you get a query on a scratch collection of 10,000 orders, and you must design the index and **prove** it works with `explain`: no collection scan, no in-memory sort, and few documents examined.

## What you'll learn

- Turning a query into an index design
- Proving the result with numbers instead of guesses
- Recognising when an index cannot help

## Syntax

```js show
const e = db.c.find(query).sort(order).explain("executionStats").executionStats
[e.nReturned, e.totalKeysExamined, e.totalDocsExamined]
```

## Examples

### The data and the yardstick

10,000 orders. The helper returns three numbers and whether the plan has an in-memory `SORT`:

```js run destructive
const lab = db.getSiblingDB("lab_workshop")
const docs = []
for (let i = 1; i <= 10000; i++) docs.push({ _id: i, customer: "c" + (i % 100), status: ["new", "paid", "shipped", "done"][Math.floor(i / 100) % 4], amount: (i * 13) % 500, day: i % 60, note: "n" + i });
for (let i = 0; i < docs.length; i += 5000) lab.orders.insertMany(docs.slice(i, i + 5000));
const prove = (q, sort, proj) => { let c = lab.orders.find(q, proj); if (sort) c = c.sort(sort); const e = c.explain("executionStats"); const es = e.executionStats; return { returned: es.nReturned, keys: es.totalKeysExamined, docs: es.totalDocsExamined, sort: JSON.stringify(e.queryPlanner.winningPlan).includes('"SORT"') }; };
prove({ customer: "c7", status: "paid" }, { day: -1 })
```

That is the baseline: with no index every task examines all 10,000 documents.

### Task 1: equality on two fields

```js run destructive
lab.orders.createIndex({ customer: 1, status: 1 });
prove({ customer: "c7", status: "paid" })
```

### Task 2: equality plus sort

Add the sort field after the equality fields:

```js run destructive
lab.orders.createIndex({ customer: 1, status: 1, day: -1 });
prove({ customer: "c7", status: "paid" }, { day: -1 })
```

### Task 3: equality, sort and range (ESR)

```js run destructive
lab.orders.createIndex({ status: 1, day: 1, amount: 1 });
prove({ status: "paid", amount: { $gt: 400 } }, { day: 1 })
```

### Task 4: a query no index can make selective

A range that matches half of the documents must read half of them, whatever the index:

```js run destructive
lab.orders.createIndex({ amount: 1 });
prove({ amount: { $gt: 250 } })
```

### Task 5: a covered query

Project only indexed fields, and exclude `_id`:

```js run destructive
prove({ customer: "c7", status: "paid" }, null, { _id: 0, customer: 1, status: 1 })
```

### Task 6: the regex that ignores the index

```js run destructive
lab.orders.createIndex({ note: 1 });
[prove({ note: /^n9999/ }), prove({ note: /9999/ })]
```

The anchored prefix examines a handful of keys; the unanchored pattern examines every key.

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Invent two more queries against the same data (for example customer plus a range of days), design the index with ESR, and prove it with the helper.

## Watch out

### Prove with numbers

"It feels faster" is not proof. Keys, documents and the `SORT` flag are.

### A perfect index for one query can hurt writes

Each index you add for a task also slows inserts. Stop when the numbers are good enough.

### Selectivity limits the gain

An index shines when the query returns a small fraction of the collection.

## Interview corner

**"How do you know an index is good?"**
`explain("executionStats")`: no `COLLSCAN`, no `SORT` stage, and `totalDocsExamined` close to `nReturned`.

**"When is an index not worth it?"**
When queries return a large share of the collection, when the collection is tiny, or when writes dominate and the query is rare.

## Practice

Each task asks for the `totalDocsExamined` number after you create the right index in a scratch collection of 2000 orders `{ _id, customer: "c" + (i % 50), status: i % 4, day: i % 30 }`.

### Task A

Query `{ customer: "c3", status: 1 }`. Create the index and return `totalDocsExamined`.

```js practice destructive
// hint: A compound index on `customer` and `status`.
const lab = db.getSiblingDB("lab_workshop")
lab.o.insertMany(Array.from({ length: 2000 }, (_, i) => ({ _id: i, customer: "c" + (i % 50), status: i % 4, day: i % 30 })));
lab.o.createIndex({ customer: 1, status: 1 });
const r = lab.o.find({ customer: "c3", status: 1 }).explain("executionStats").executionStats.totalDocsExamined
lab.dropDatabase();
r
```

### Task B

Query `{ customer: "c3" }` sorted by `day` descending. Create the index so there is **no** in-memory sort, and return `true` if there is none.

```js practice destructive
// hint: Equality on `customer`, then the sort field `day`.
const lab = db.getSiblingDB("lab_workshop")
lab.o.insertMany(Array.from({ length: 2000 }, (_, i) => ({ _id: i, customer: "c" + (i % 50), status: i % 4, day: i % 30 })));
lab.o.createIndex({ customer: 1, day: -1 });
const noSort = !JSON.stringify(lab.o.find({ customer: "c3" }).sort({ day: -1 }).explain().queryPlanner.winningPlan).includes('"SORT"')
lab.dropDatabase();
noSort
```

### Task C

Query `{ status: 2, day: { $lt: 5 } }` sorted by `customer`. Design the index (ESR: equality `status`, sort `customer`, range `day`) and return `true` if there is no in-memory sort.

```js practice destructive
// hint: `{ status: 1, customer: 1, day: 1 }`.
const lab = db.getSiblingDB("lab_workshop")
lab.o.insertMany(Array.from({ length: 2000 }, (_, i) => ({ _id: i, customer: "c" + (i % 50), status: i % 4, day: i % 30 })));
lab.o.createIndex({ status: 1, customer: 1, day: 1 });
const noSort = !JSON.stringify(lab.o.find({ status: 2, day: { $lt: 5 } }).sort({ customer: 1 }).explain().queryPlanner.winningPlan).includes('"SORT"')
lab.dropDatabase();
noSort
```
