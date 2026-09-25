---
title: "Collections: Create, Rename and Drop"
order: 0
---

A collection is MongoDB's table: a named group of documents. Like databases, collections appear when you first write to them, but you can also create them on purpose to set options such as validation rules or a size cap.

## What you'll learn

- Creating a collection implicitly and explicitly
- Listing collections and their options
- Renaming and dropping
- Capped collections and time series collections

## Syntax

```js show
db.createCollection("name", { options })
db.getCollectionNames()
db.collection.renameCollection("newName")
db.collection.drop()
```

## Examples

### Implicit creation

Writing to a collection that does not exist creates it:

```js run destructive
const lab = db.getSiblingDB("lab_shop")
lab.getCollectionNames()
```

```js run destructive
lab.pens.insertOne({ colour: "blue" })
lab.getCollectionNames()
```

### Explicit creation

`createCollection` is for when you want options:

```js run destructive
lab.createCollection("orders")
lab.getCollectionNames().sort()
```

Creating one that already exists is harmless when the options are the same, but an error when they differ:

```js run destructive error
lab.createCollection("orders", { capped: true, size: 1024 })
```

### Rename

```js run destructive
lab.orders.renameCollection("purchases")
lab.getCollectionNames().sort()
```

### Drop a collection

`drop()` removes the collection and its indexes. Run it twice and the second call is harmless: this server still answers `true`, so do not rely on the result to learn whether the collection existed:

```js run destructive
[lab.pens.drop(), lab.pens.drop()]
```

### Capped collections

A capped collection has a fixed size and behaves like a ring buffer: when it is full, the oldest documents are overwritten. It is handy for logs:

```js run destructive
lab.createCollection("log", { capped: true, size: 4096, max: 3 })
for (let i = 1; i <= 5; i++) lab.log.insertOne({ n: i })
lab.log.find({}, { _id: 0 }).toArray()
```

Only the last 3 entries survived. `isCapped()` confirms the type:

```js run destructive
lab.log.isCapped()
```

### Time series collections

Measurements over time have their own collection type. It stores a time field, an optional label, and compresses the data:

```js run destructive
lab.createCollection("temps", { timeseries: { timeField: "at", metaField: "sensor", granularity: "minutes" } })
lab.temps.insertOne({ at: new Date("2026-01-01T10:00:00Z"), sensor: "s1", c: 21.5 })
lab.getCollectionInfos({ name: "temps" })[0].type
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Create a capped collection `recent` that keeps only the last 2 documents, insert 4 documents, and read them back. Then rename it to `latest`.

## Watch out

### `drop()` is instant and silent

There is no confirmation. Dropping a collection removes its documents and its indexes. Check the name and the current database first.

### A capped collection cannot delete or grow

You cannot delete individual documents from a capped collection, and updates may not make a document bigger. Only `drop()` clears it.

### Renaming to an existing name fails

`renameCollection("x")` errors if `x` exists, unless you pass `true` as the second argument to drop the target. That drops it for real.

### Names that clash with shell methods

A collection called `stats`, `help` or `version` cannot be reached as `db.stats`, because that is already a database method. Use `db.getCollection("stats")`.

### Implicit creation hides typos

`db.custmers.insertOne(...)` happily creates a new collection called `custmers`. Use `getCollectionNames()` when a query returns nothing.

## Interview corner

**"What is a capped collection?"**
A fixed-size collection that keeps insertion order and overwrites the oldest documents when full. It suits logs and caches.

**"How do you create a collection?"**
Implicitly by inserting into it, or explicitly with `db.createCollection(name, options)` when you need options such as `capped`, `validator` or `timeseries`.

**"What is the difference between `drop()` and `deleteMany({})`?"**
`deleteMany({})` removes every document but keeps the collection, its options and its indexes. `drop()` removes the collection completely.

## Practice

### Warm-up: how many collections?

Return the number of collections in the DVD Rental database.

```js practice
// hint: `db.getCollectionNames().length`.
db.getCollectionNames().length
```

### Core: a small capped collection

In `lab_shop`, create a capped collection `recent` (size 4096, max 2), insert `{ n: 1 }` to `{ n: 4 }`, and return the list of `n` values left, then drop the database.

```js practice destructive
// hint: The two newest survive: 3 and 4.
const lab = db.getSiblingDB("lab_shop")
lab.createCollection("recent", { capped: true, size: 4096, max: 2 });
for (let n = 1; n <= 4; n++) lab.recent.insertOne({ n })
const left = lab.recent.find().toArray().map((d) => d.n)
lab.dropDatabase();
left
```

### Stretch: does it exist?

Return a pair `[true, false]`: whether the DVD Rental database has a collection called `stores`, and whether it has one called `stors`.

```js practice
// hint: `getCollectionInfos({ name })` returns an empty list when it does not exist.
[db.getCollectionInfos({ name: "stores" }).length === 1, db.getCollectionInfos({ name: "stors" }).length === 1]
```
