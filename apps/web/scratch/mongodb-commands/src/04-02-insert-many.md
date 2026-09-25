---
title: "Insert Many Documents"
order: 0
---

`insertMany` adds a whole list of documents in one round trip. It is faster than a loop of `insertOne`, and it has a rule about what happens when one document in the batch fails.

## What you'll learn

- Inserting an array of documents
- Reading `insertedIds`
- Ordered versus unordered inserts
- What a partial failure leaves behind

## Syntax

```js show
db.collection.insertMany([doc1, doc2, ...])
db.collection.insertMany([doc1, doc2], { ordered: false })
```

## Examples

### A batch insert

```js run destructive
const lab = db.getSiblingDB("lab_many")
const r = lab.fruit.insertMany([
  { _id: 1, name: "apple", price: 1.2 },
  { _id: 2, name: "banana", price: 0.5 },
  { _id: 3, name: "cherry", price: 4.0 }
]);
[r.acknowledged, Object.keys(r.insertedIds).length, r.insertedIds[2]]
```

### Documents may differ in shape

```js run destructive
lab.fruit.insertMany([
  { _id: 4, name: "date", origin: "Iran" },
  { _id: 5, name: "elderberry", tags: ["wild", "dark"] }
])
lab.fruit.find({}, { name: 1, origin: 1, tags: 1 }).sort({ _id: 1 }).toArray()
```

### Ordered inserts stop at the first error

By default the server inserts in order and stops at the first failure. Documents before the failure stay:

```js run destructive error
lab.fruit.insertMany([
  { _id: 6, name: "fig" },
  { _id: 1, name: "duplicate of apple" },
  { _id: 7, name: "grape" }
])
```

```js run destructive
lab.fruit.find({ _id: { $in: [6, 7] } }, { name: 1 }).sort({ _id: 1 }).toArray()
```

Fig went in. Grape was never tried.

### Unordered inserts try everything

With `ordered: false` the server keeps going after an error, then reports all failures together:

```js run destructive error
lab.fruit.insertMany([
  { _id: 8, name: "honeydew" },
  { _id: 2, name: "duplicate of banana" },
  { _id: 9, name: "kiwi" }
], { ordered: false })
```

```js run destructive
lab.fruit.find({ _id: { $in: [8, 9] } }, { name: 1 }).sort({ _id: 1 }).toArray()
```

Both good documents were stored, and only the duplicate was rejected.

### How many were stored?

```js run destructive
lab.fruit.countDocuments()
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Insert three documents where the second has a duplicate `_id`, once ordered and once unordered (in two scratch collections), and compare how many were stored.

## Watch out

### A failed ordered batch is half-applied

There is no rollback. Documents before the failure remain. If you need all-or-nothing, use a multi-document transaction (module 14).

### Very large batches are split

The server accepts up to 100,000 operations per command, and the driver splits bigger arrays into several commands. A failure in one chunk does not undo the earlier ones.

### `insertMany([])` is an error

An empty array is not "insert nothing". It raises an error, so check the array length first.

### Unordered is faster, and its order is not guaranteed

Unordered batches may be executed in parallel. Use them when documents are independent and you only need to know which ones failed.

## Interview corner

**"What is the difference between ordered and unordered `insertMany`?"**
Ordered (default) stops at the first error and leaves later documents unwritten. Unordered continues past errors and reports them all at the end.

**"Is `insertMany` atomic?"**
Each single document write is atomic, but the batch as a whole is not: a failure can leave part of it inserted. Use a transaction if you need all-or-nothing.

**"Why prefer `insertMany` to a loop of `insertOne`?"**
One network round trip instead of one per document, so it is much faster for bulk loads.

## Practice

### Warm-up: insert three and count

In `lab_many`, insert three documents into `boxes` and return how many are stored (then drop the database).

```js practice destructive
// hint: `insertMany([...])`, then `countDocuments()`.
const lab = db.getSiblingDB("lab_many")
lab.boxes.insertMany([{ n: 1 }, { n: 2 }, { n: 3 }]);
const c = lab.boxes.countDocuments()
lab.dropDatabase();
c
```

### Core: ordered failure

Insert `[{ _id: 1 }, { _id: 1 }, { _id: 2 }]` (ordered) into `boxes`, catching the error, and return how many documents ended up stored. Drop the database.

```js practice destructive
// hint: The first is stored; the second fails; the third is never tried.
const lab = db.getSiblingDB("lab_many")
try { lab.boxes.insertMany([{ _id: 1 }, { _id: 1 }, { _id: 2 }]) } catch (e) {}
const c = lab.boxes.countDocuments()
lab.dropDatabase();
c
```

### Stretch: unordered failure

Do the same with `{ ordered: false }` and return the count.

```js practice destructive
// hint: Only the duplicate is rejected.
const lab = db.getSiblingDB("lab_many")
try { lab.boxes.insertMany([{ _id: 1 }, { _id: 1 }, { _id: 2 }], { ordered: false }) } catch (e) {}
const c = lab.boxes.countDocuments()
lab.dropDatabase();
c
```
