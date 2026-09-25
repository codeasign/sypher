---
title: "deleteOne, deleteMany and drop"
order: 0
---

Deleting is the one write with no undo. MongoDB offers three levels: remove one document, remove all matching documents, or drop the whole collection. This page shows each, and the habits that keep a delete from becoming a disaster.

## What you'll learn

- `deleteOne` and `deleteMany`
- `deletedCount` and how to check it
- `findOneAndDelete` to take a document and keep it
- The difference between deleting documents and dropping a collection

## Syntax

```js show
db.collection.deleteOne(filter)
db.collection.deleteMany(filter)
db.collection.findOneAndDelete(filter, { sort: {...} })
db.collection.drop()
```

## Examples

```js run destructive
const lab = db.getSiblingDB("lab_delete")
lab.logs.insertMany([
  { _id: 1, level: "info", msg: "start" },
  { _id: 2, level: "error", msg: "disk full" },
  { _id: 3, level: "info", msg: "retry" },
  { _id: 4, level: "error", msg: "timeout" },
  { _id: 5, level: "debug", msg: "ping" }
]);
lab.logs.countDocuments()
```

### deleteOne

Removes the first document that matches:

```js run destructive
lab.logs.deleteOne({ level: "error" })
lab.logs.find({}, { _id: 1 }).toArray().map((d) => d._id)
```

Document 2 went, document 4 stayed. Use a unique filter such as `_id` when it matters which one.

### deleteMany

```js run destructive
lab.logs.deleteMany({ level: "info" })
```

```js run destructive
lab.logs.find({}, { _id: 1, level: 1 }).toArray()
```

### No match is not an error

```js run destructive
lab.logs.deleteOne({ _id: 999 })
```

### Preview before you delete

The same filter with `find` or `countDocuments` shows what would go:

```js run destructive
[lab.logs.countDocuments({ level: { $ne: "error" } }), lab.logs.countDocuments()]
```

### findOneAndDelete: take it and keep it

Useful for queues: remove the oldest job and get it back in one atomic step:

```js run destructive
lab.jobs.insertMany([{ _id: 1, at: 30 }, { _id: 2, at: 10 }, { _id: 3, at: 20 }]);
lab.jobs.findOneAndDelete({}, { sort: { at: 1 } })
```

### deleteMany({}) versus drop()

`deleteMany({})` removes every document one by one and keeps the collection and its indexes. `drop()` removes the collection at once:

```js run destructive
lab.jobs.createIndex({ at: 1 });
lab.jobs.deleteMany({});
[lab.jobs.countDocuments(), lab.jobs.getIndexes().map((i) => i.name)]
```

```js run destructive
lab.jobs.drop();
lab.getCollectionNames().includes("jobs")
```

### Delete what a filter on nested data matches

Delete customers by a nested condition in a scratch copy:

```js run destructive
db.customers.aggregate([{ $project: { name: 1, address: 1 } }, { $out: { db: "lab_delete", coll: "customers" } }]);
lab.customers.deleteMany({ "address.country": "India" })
lab.customers.countDocuments()
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

In a scratch copy of `films`, delete all `NC-17` films longer than 150 minutes. Count before and after, and check that `deletedCount` matches your preview.

## Watch out

### `deleteMany({})` empties the collection

An empty filter matches everything. Check the filter (and the collection name) twice.

### `deleteOne` picks an arbitrary match

If several documents match, which one goes is not guaranteed without a sort (which `deleteOne` does not accept). Use `_id`, or `findOneAndDelete` with a `sort`.

### Deleting does not always free disk space

The space is reused for new documents, but the data files may not shrink. For a big cleanup, consider `compact` or rebuilding the collection.

### Cascading deletes do not exist

Deleting a customer does not delete related documents in other collections. Your code, or embedding, has to handle that.

### Deleting a huge set locks up the server

`deleteMany` on millions of documents produces a lot of write work. Delete in batches (by `_id` range) or use a TTL index or partitioned collections.

## Interview corner

**"What is the difference between `deleteMany({})` and `drop()`?"**
`deleteMany({})` deletes each document but keeps the collection and its indexes. `drop()` removes the collection and its indexes at once, which is much faster.

**"How do you delete safely?"**
Preview the filter with `find`/`countDocuments`, back up what will go, then delete and check `deletedCount`.

**"Can you delete and get the deleted document?"**
Yes: `findOneAndDelete(filter)` returns the removed document.

## Practice

### Warm-up: one delete

In a scratch collection with `_id` 1, 2, 3, delete `_id` 2 and return the remaining ids.

```js practice destructive
// hint: `deleteOne({ _id: 2 })`.
const lab = db.getSiblingDB("lab_delete")
lab.t.insertMany([{ _id: 1 }, { _id: 2 }, { _id: 3 }]);
lab.t.deleteOne({ _id: 2 });
const ids = lab.t.find().sort({ _id: 1 }).toArray().map((d) => d._id)
lab.dropDatabase();
ids
```

### Core: delete many

Insert numbers 1 to 10 as documents `{ n }`, delete those with `n` greater than 7, and return the count left.

```js practice destructive
// hint: `deleteMany({ n: { $gt: 7 } })`.
const lab = db.getSiblingDB("lab_delete")
lab.t.insertMany(Array.from({ length: 10 }, (_, i) => ({ n: i + 1 })));
lab.t.deleteMany({ n: { $gt: 7 } });
const c = lab.t.countDocuments()
lab.dropDatabase();
c
```

### Stretch: take the oldest

Insert jobs with `at` 30, 10, 20, remove the one with the smallest `at` using `findOneAndDelete`, and return its `at`.

```js practice destructive
// hint: `sort: { at: 1 }`.
const lab = db.getSiblingDB("lab_delete")
lab.t.insertMany([{ at: 30 }, { at: 10 }, { at: 20 }]);
const at = lab.t.findOneAndDelete({}, { sort: { at: 1 } }).at
lab.dropDatabase();
at
```
