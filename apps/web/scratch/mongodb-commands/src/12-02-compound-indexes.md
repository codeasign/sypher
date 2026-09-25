---
title: "Compound Indexes and the ESR Rule"
order: 0
---

Most real queries filter on several fields and sort on another. A **compound index** covers them together, but the **order of its fields** decides whether it helps. The ESR rule (Equality, Sort, Range) gives the order that works.

## What you'll learn

- Creating a compound index, and the prefix rule
- Why field order matters
- The ESR rule: Equality, Sort, Range
- Sort direction in compound indexes

## Syntax

```js show
db.orders.createIndex({ status: 1, amount: -1 })
// Equality fields first, then the sort field, then range fields:
db.orders.createIndex({ customer: 1, created: -1, amount: 1 })
```

## Examples

```js run destructive
const lab = db.getSiblingDB("lab_compound")
const docs = []
for (let i = 1; i <= 20000; i++) docs.push({ _id: i, customer: "c" + (i % 200), status: ["new", "paid", "shipped", "done"][i % 4], amount: (i * 7) % 1000, day: i % 90 });
for (let i = 0; i < docs.length; i += 5000) lab.orders.insertMany(docs.slice(i, i + 5000));
const cost = (q, sort) => { const c = sort ? lab.orders.find(q).sort(sort) : lab.orders.find(q); const e = c.explain("executionStats").executionStats; return { returned: e.nReturned, keys: e.totalKeysExamined, docs: e.totalDocsExamined }; };
lab.orders.countDocuments()
```

### A compound index

Index `status` then `amount`:

```js run destructive
lab.orders.createIndex({ status: 1, amount: 1 })
```

### The prefix rule

The index serves queries on `status` alone (a prefix), and on `status` plus `amount`, but **not** on `amount` alone:

```js run destructive
[cost({ status: "paid" }), cost({ status: "paid", amount: { $gte: 100, $lt: 110 } }), cost({ amount: 500 })]
```

The first two examine only what they return (the second range is narrow). The third scans all 20,000 documents, because the index is sorted by `status` first.

### Field order matters

Two indexes on the same fields in different orders serve different queries. Add the reverse one and see the third query improve:

```js run destructive
lab.orders.createIndex({ amount: 1, status: 1 });
cost({ amount: 500 })
```

### The ESR rule

Put the fields in this order: **E**quality (exact matches) first, then **S**ort, then **R**ange (`$gt`, `$lt`, `$in` on many values). Query: customer `c7` (equality), newest amounts first (sort), amount above 500 (range).

```js run destructive
const costSort = (q, sort) => { const c = lab.orders.find(q).sort(sort); const e = c.explain("executionStats").executionStats; return { returned: e.nReturned, keys: e.totalKeysExamined, docs: e.totalDocsExamined, memorySort: JSON.stringify(c.explain().queryPlanner.winningPlan).includes('"SORT"') }; };
lab.orders.createIndex({ customer: 1, day: -1, amount: 1 }, { name: "esr" });
costSort({ customer: "c7", amount: { $gt: 500 } }, { day: -1 })
```

No in-memory sort (`memorySort: false`): the index already delivers the rows in `day` order.

### What if the range came before the sort?

Put the range field in the middle instead: the sort can no longer use the index order.

```js run destructive
lab.orders.createIndex({ customer: 1, amount: 1, day: -1 }, { name: "bad" });
({ memorySort: JSON.stringify(lab.orders.find({ customer: "c7", amount: { $gt: 500 } }).sort({ day: -1 }).hint("bad").explain().queryPlanner.winningPlan).includes('"SORT"') })
```

With the range field before the sort field, the plan needs an in-memory `SORT` stage.

### Sort direction

An index can be read forwards or backwards, so `{ a: 1, b: 1 }` also serves `sort({ a: -1, b: -1 })`. But mixed directions need a matching index:

```js run destructive
const hasSort = (s) => JSON.stringify(lab.orders.find({ customer: "c7" }).sort(s).hint("esr").explain().queryPlanner.winningPlan).includes('"SORT"');
[hasSort({ day: -1 }), hasSort({ day: 1 }), hasSort({ day: -1, amount: 1 }), hasSort({ day: -1, amount: -1 })]
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

For the query "status `paid`, amount between 100 and 200, sorted by `day` descending" design the compound index using ESR, create it in a scratch copy and check the plan for a `SORT` stage.

## Watch out

### Order of fields is the whole game

`{ a: 1, b: 1 }` is a different index from `{ b: 1, a: 1 }`. Design from the queries, not from the fields.

### Range in the middle stops the sort

After a range condition, later fields can no longer be used for ordering. Equality, sort, then range.

### One compound index can replace several single-field ones

`{ a: 1, b: 1 }` also serves queries on `a` alone, so a separate index on `a` is redundant.

### Too many similar indexes

Overlapping indexes waste memory and slow writes. Drop the ones another index covers.

### Equality on many fields: order by selectivity does not matter much

Among equality fields the order rarely changes the speed. Put the field that is used alone in other queries first, so it also serves as a prefix.

## Interview corner

**"What is the ESR rule?"**
Order compound index fields: Equality, then Sort, then Range. It lets the index serve the filter and the ordering with no in-memory sort.

**"Does an index on `(a, b)` help a query on `b` alone?"**
No. Only prefixes (`a`, or `a` and `b`) can use it.

**"How many indexes can a query use?"**
Normally one per query (plus `$or` branches, which may each use their own).

## Practice

### Warm-up: which queries use it?

For an index on `{ a: 1, b: 1 }`, which of these use the prefix: `{ a: 1 }`, `{ b: 1 }`, `{ a: 1, b: 1 }`? Return the array of booleans.

```js practice
// hint: Only the prefixes `a` and `a, b`.
[true, false, true]
```

### Core: check the prefix

In a scratch collection with 3000 docs `{ a: i % 30, b: i % 7 }` and an index `{ a: 1, b: 1 }`, return `[docsExamined for {a: 3}, docsExamined for {b: 3}]`.

```js practice destructive
// hint: `explain("executionStats").executionStats.totalDocsExamined`.
const lab = db.getSiblingDB("lab_compound")
lab.t.insertMany(Array.from({ length: 3000 }, (_, i) => ({ _id: i, a: i % 30, b: i % 7 })));
lab.t.createIndex({ a: 1, b: 1 });
const d = (q) => lab.t.find(q).explain("executionStats").executionStats.totalDocsExamined;
const r = [d({ a: 3 }), d({ b: 3 })]
lab.dropDatabase();
r
```

### Stretch: avoid the memory sort

With an index `{ a: 1, c: 1 }` on 1000 docs `{ a: i % 5, c: i }`, return whether `find({ a: 2 }).sort({ c: 1 })` needs a `SORT` stage.

```js practice destructive
// hint: Equality on `a`, sort on `c`: the index delivers the order.
const lab = db.getSiblingDB("lab_compound")
lab.t.insertMany(Array.from({ length: 1000 }, (_, i) => ({ _id: i, a: i % 5, c: i })));
lab.t.createIndex({ a: 1, c: 1 });
const s = JSON.stringify(lab.t.find({ a: 2 }).sort({ c: 1 }).explain().queryPlanner.winningPlan).includes('"SORT"');
lab.dropDatabase();
s
```
