---
title: "Interview Problems: Duplicates, Gaps and Consecutive Values"
order: 0
---

Data-quality questions come up in every interview: find duplicates, find missing numbers in a sequence, find values that repeat three times in a row. They are a good test of `$group`, `$setWindowFields` and array expressions.

## What you'll learn

- Finding duplicates by one or several fields
- Finding gaps in a numeric sequence
- Detecting runs of consecutive values
- Removing duplicates safely

## Syntax

```js show
db.c.aggregate([ { $group: { _id: "$key", n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } } ])
```

## Examples

We use a scratch collection with deliberate problems, so the answers are known:

```js run destructive
const lab = db.getSiblingDB("lab_interview")
lab.orders.insertMany([
  { _id: 1, seq: 1, email: "a@x.com", status: "ok" },
  { _id: 2, seq: 2, email: "b@x.com", status: "ok" },
  { _id: 3, seq: 3, email: "a@x.com", status: "fail" },
  { _id: 4, seq: 5, email: "c@x.com", status: "fail" },
  { _id: 5, seq: 6, email: "b@x.com", status: "fail" },
  { _id: 6, seq: 7, email: "d@x.com", status: "fail" },
  { _id: 7, seq: 10, email: "a@x.com", status: "ok" }
]);
lab.orders.countDocuments()
```

### Problem 1: duplicate emails

```js run destructive
lab.orders.aggregate([
  { $group: { _id: "$email", orders: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { orders: { $gt: 1 } } },
  { $sort: { _id: 1 } }
])
```

### Problem 2: keep only the latest per email

The classic "delete duplicates, keep the last":

```js run destructive
lab.orders.aggregate([
  { $sort: { _id: -1 } },
  { $group: { _id: "$email", keep: { $first: "$_id" }, all: { $push: "$_id" } } },
  { $project: { remove: { $filter: { input: "$all", as: "i", cond: { $ne: ["$$i", "$keep"] } } } } },
  { $unwind: "$remove" },
  { $sort: { remove: 1 } }
])
```

### Problem 3: missing numbers (gaps)

Which sequence numbers between the smallest and the largest are missing? Compare each row with the previous one:

```js run destructive
lab.orders.aggregate([
  { $setWindowFields: { sortBy: { seq: 1 }, output: { prev: { $shift: { output: "$seq", by: -1 } } } } },
  { $match: { prev: { $ne: null }, $expr: { $gt: [{ $subtract: ["$seq", "$prev"] }, 1] } } },
  { $project: { _id: 0, missingFrom: { $add: ["$prev", 1] }, missingTo: { $subtract: ["$seq", 1] } } }
])
```

### Problem 4: three failures in a row

Number the rows, compare each with the two before it:

```js run destructive
lab.orders.aggregate([
  { $setWindowFields: { sortBy: { seq: 1 }, output: { p1: { $shift: { output: "$status", by: -1 } }, p2: { $shift: { output: "$status", by: -2 } } } } },
  { $match: { status: "fail", p1: "fail", p2: "fail" } },
  { $project: { _id: 0, endsAt: "$seq" } }
])
```

Two rows end a run of three failures: `seq` 6 (the rows 3, 5, 6) and `seq` 7 (the rows 5, 6, 7). "Consecutive" means consecutive rows in order, even though the sequence numbers themselves have gaps.

### Problem 5: longest streak, in general

Mark each row that starts a new run (its status differs from the previous row), then a running total of those marks gives every run its own id:

```js run destructive
lab.orders.aggregate([
  { $setWindowFields: { sortBy: { seq: 1 }, output: { rn: { $documentNumber: {} }, prevStatus: { $shift: { output: "$status", by: -1 } } } } },
  { $set: { newRun: { $cond: [{ $eq: ["$status", "$prevStatus"] }, 0, 1] } } },
  { $setWindowFields: { sortBy: { seq: 1 }, output: { runId: { $sum: "$newRun", window: { documents: ["unbounded", "current"] } } } } },
  { $group: { _id: { runId: "$runId", status: "$status" }, length: { $sum: 1 } } },
  { $sort: { length: -1, "_id.runId": 1 } },
  { $limit: 2 }
])
```

### Problem 6: on the real data, customers sharing a last name

```js run
db.customers.aggregate([
  { $group: { _id: "$name.last", customers: { $sum: 1 } } },
  { $match: { customers: { $gt: 1 } } },
  { $sort: { customers: -1, _id: 1 } },
  { $limit: 3 }
])
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

On the scratch data find sequence gaps larger than one number, and the customers in the real data who share both first and last name.

## Watch out

### Define "duplicate" first

Same email? Same email ignoring case? Same email and status? The group key is the definition.

### Gaps need an order

`$shift` needs `sortBy`. Without a unique, complete sequence the answer changes.

### Streaks reset at group boundaries

Use `partitionBy` if runs must not cross a category (for example, per user).

### Deleting duplicates is one way

Archive the rows to be removed first (module 9).

## Interview corner

**"How do you find duplicate values?"**
`$group` by the value, count, then `$match` on the count above 1.

**"How do you find gaps in a sequence?"**
Compare each row's value with the previous one (`$shift`) and report where the difference is more than 1.

**"How do you find three consecutive events?"**
`$setWindowFields` with `$shift` for the two previous values, then `$match` where all three agree.

## Practice

### Warm-up: duplicate first names

How many first names are shared by more than one customer? Return `{ names: n }`.

```js practice
// hint: `$group`, `$match`, `$count`.
db.customers.aggregate([{ $group: { _id: "$name.first", c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: "names" }])
```

### Core: gaps

Insert `seq` 1, 2, 4, 8 in a scratch collection and return the start and end of each gap.

```js practice destructive
// hint: `$shift` by -1, then compare.
const lab = db.getSiblingDB("lab_interview")
lab.s.insertMany([{ seq: 1 }, { seq: 2 }, { seq: 4 }, { seq: 8 }]);
const r = lab.s.aggregate([
  { $setWindowFields: { sortBy: { seq: 1 }, output: { prev: { $shift: { output: "$seq", by: -1 } } } } },
  { $match: { prev: { $ne: null }, $expr: { $gt: [{ $subtract: ["$seq", "$prev"] }, 1] } } },
  { $project: { _id: 0, from: { $add: ["$prev", 1] }, to: { $subtract: ["$seq", 1] } } },
  { $sort: { from: 1 } }
]).toArray()
lab.dropDatabase();
r
```

### Stretch: three in a row

For values `[1, 1, 1, 2, 2, 3, 3, 3, 3]` (one document each, with `seq` 1 to 9), return the values that appear three or more times in a row.

```js practice destructive
// hint: Compare `$shift` by -1 and -2 with the current value; then `$group` the values.
const lab = db.getSiblingDB("lab_interview")
lab.s.insertMany([1, 1, 1, 2, 2, 3, 3, 3, 3].map((v, i) => ({ seq: i + 1, v })));
const r = lab.s.aggregate([
  { $setWindowFields: { sortBy: { seq: 1 }, output: { p1: { $shift: { output: "$v", by: -1 } }, p2: { $shift: { output: "$v", by: -2 } } } } },
  { $match: { $expr: { $and: [{ $eq: ["$v", "$p1"] }, { $eq: ["$v", "$p2"] }] } } },
  { $group: { _id: "$v" } },
  { $sort: { _id: 1 } }
]).toArray()
lab.dropDatabase();
r
```
