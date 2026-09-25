---
title: "replaceOne and findOneAnd... Commands"
order: 0
---

`updateOne` changes fields. `replaceOne` swaps the whole document. And the `findOneAnd...` family changes a document **and hands it back** in a single atomic step, which is exactly what counters, queues and "claim this job" patterns need.

## What you'll learn

- `replaceOne` and how it differs from `updateOne`
- `findOneAndUpdate`, `findOneAndReplace`, `findOneAndDelete`
- Returning the document before or after the change
- Sorting to pick which document to claim

## Syntax

```js show
db.collection.replaceOne(filter, newDocument)
db.collection.findOneAndUpdate(filter, update, { returnDocument: "after", sort: {...}, projection: {...} })
db.collection.findOneAndReplace(filter, newDocument, options)
db.collection.findOneAndDelete(filter, options)
```

## Examples

We use a scratch database of tasks, so the DVD Rental data stays as it is.

```js run destructive
const lab = db.getSiblingDB("lab_replace")
lab.tasks.insertMany([
  { _id: 1, title: "write report", status: "todo", priority: 2, tags: ["work"] },
  { _id: 2, title: "buy milk", status: "todo", priority: 1, tags: ["home"] },
  { _id: 3, title: "call bank", status: "todo", priority: 3 }
]);
lab.tasks.countDocuments()
```

### replaceOne swaps the whole document

Everything except `_id` is replaced. Fields you leave out disappear:

```js run destructive
lab.tasks.replaceOne({ _id: 1 }, { title: "write final report", status: "doing" })
lab.tasks.findOne({ _id: 1 })
```

Notice that `priority` and `tags` are gone. Compare with `$set`, which keeps them:

```js run destructive
lab.tasks.updateOne({ _id: 2 }, { $set: { status: "doing" } })
lab.tasks.findOne({ _id: 2 })
```

### replaceOne cannot use operators

```js run destructive error
lab.tasks.replaceOne({ _id: 2 }, { $set: { status: "done" } })
```

### findOneAndUpdate: change and return

By default it returns the document **before** the change. Ask for `"after"` to see the result:

```js run destructive
lab.tasks.findOneAndUpdate({ _id: 3 }, { $set: { status: "doing" } })
```

```js run destructive
lab.tasks.findOneAndUpdate({ _id: 3 }, { $inc: { priority: 10 } }, { returnDocument: "after" })
```

### Claim the next job

Pick the highest-priority todo document, mark it taken, and return it, atomically. Two workers running this at once can never take the same task:

```js run destructive
lab.tasks.insertOne({ _id: 4, title: "book flight", status: "todo", priority: 9 });
lab.tasks.findOneAndUpdate({ status: "todo" }, { $set: { status: "taken" } }, { sort: { priority: -1 }, returnDocument: "after", projection: { title: 1, status: 1 } })
```

### A counter

The classic use: a sequence number that is safe under concurrency:

```js run destructive
lab.counters.insertOne({ _id: "invoice", seq: 1000 });
[1, 2, 3].map(() => lab.counters.findOneAndUpdate({ _id: "invoice" }, { $inc: { seq: 1 } }, { returnDocument: "after" }).seq)
```

### findOneAndReplace and findOneAndDelete

```js run destructive
lab.tasks.findOneAndReplace({ _id: 4 }, { title: "book train", status: "todo" }, { returnDocument: "after" })
```

```js run destructive
lab.tasks.findOneAndDelete({ _id: 4 })
```

### When nothing matches

`findOneAnd...` returns `null`:

```js run destructive
lab.tasks.findOneAndUpdate({ _id: 999 }, { $set: { status: "x" } })
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Make a `jobs` collection, insert five jobs with priorities, and write a loop that claims and prints the next job until none are left.

## Watch out

### `replaceOne` drops every field you forget

Read the document first, change it in code, and replace with the complete result. Or use `$set`.

### `_id` cannot change

A replacement may omit `_id` or repeat the same one, but giving a different `_id` is an error.

### The default return value is the old document

`findOneAndUpdate` returns the **before** image unless you say `returnDocument: "after"`. Old drivers used `returnNewDocument`.

### Atomic on one document only

A single `findOneAnd...` is atomic on the one document it touches. It does not lock other documents.

## Interview corner

**"What is the difference between `updateOne` and `replaceOne`?"**
`updateOne` applies operators to selected fields. `replaceOne` replaces the entire document (except `_id`) with a new one.

**"How would you implement an auto-increment counter?"**
A counter document with `findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { returnDocument: "after" })`. The increment and the read happen atomically.

**"How do you make two workers safely claim different jobs?"**
`findOneAndUpdate` with a filter on `status: "todo"`, an update to `"taken"` and a sort for priority. Only one caller can match and change a given document.

## Practice

### Warm-up: replace

In a scratch collection, insert `{ _id: 1, a: 1, b: 2 }` and replace it with `{ a: 10 }`. Return the stored document.

```js practice destructive
// hint: `replaceOne`, then `findOne`.
const lab = db.getSiblingDB("lab_replace")
lab.t.insertOne({ _id: 1, a: 1, b: 2 });
lab.t.replaceOne({ _id: 1 }, { a: 10 });
const d = lab.t.findOne({ _id: 1 })
lab.dropDatabase();
d
```

### Core: return the new value

Insert `{ _id: "hits", n: 0 }` and increment `n` by 5, returning the **new** document.

```js practice destructive
// hint: `returnDocument: "after"`.
const lab = db.getSiblingDB("lab_replace")
lab.c.insertOne({ _id: "hits", n: 0 });
const d = lab.c.findOneAndUpdate({ _id: "hits" }, { $inc: { n: 5 } }, { returnDocument: "after" })
lab.dropDatabase();
d
```

### Stretch: claim the best

Insert tasks with priorities 1, 5, 3 (all `status: "todo"`), then claim the highest priority one and return its `priority`.

```js practice destructive
// hint: `sort({ priority: -1 })` in `findOneAndUpdate`.
const lab = db.getSiblingDB("lab_replace")
lab.t.insertMany([{ _id: 1, status: "todo", priority: 1 }, { _id: 2, status: "todo", priority: 5 }, { _id: 3, status: "todo", priority: 3 }]);
const p = lab.t.findOneAndUpdate({ status: "todo" }, { $set: { status: "taken" } }, { sort: { priority: -1 } }).priority
lab.dropDatabase();
p
```
