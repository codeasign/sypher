---
title: "Collection Information and Statistics"
order: 0
---

Once data is in, you want to know how big it is, how it is stored, and what rules apply to it. MongoDB answers with a few commands: options, counts and statistics.

## What you'll learn

- Reading a collection's options and type
- Counting documents in different ways
- Reading size and index statistics
- Changing collection options with `collMod`

## Syntax

```js show
db.getCollectionInfos({ name: "films" })
db.films.countDocuments(filter)
db.films.estimatedDocumentCount()
db.films.stats()
db.runCommand({ collMod: "name", ... })
```

## Examples

### Options and type

```js run
db.getCollectionInfos({ name: "films" }).map((c) => ({ name: c.name, type: c.type, validationLevel: c.options.validationLevel, validationAction: c.options.validationAction }))
```

### Three ways to count

`countDocuments` is exact and takes a filter. `estimatedDocumentCount` reads metadata, so it is instant. `aggregate` with `$count` does the same as `countDocuments` and can be extended:

```js run
[
  db.films.countDocuments({ rating: "PG" }),
  db.films.estimatedDocumentCount(),
  db.films.aggregate([{ $count: "n" }]).toArray()[0].n
]
```

### Size and indexes

`stats()` returns counts and sizes in bytes. The exact byte counts depend on the server version and data files, so here we read only the stable facts:

```js run
const s = db.films.stats();
({ documents: s.count, indexes: s.nindexes, hasSize: s.size > 0, avgObjSizeIsPositive: s.avgObjSize > 0 })
```

The index names of a collection:

```js run
Object.keys(db.films.stats().indexSizes).sort()
```

### Distinct values, a quick profile

```js run
db.films.distinct("rating").sort()
```

### Changing options: collMod

`collMod` changes options of an existing collection. Here we make a scratch collection reject bad documents, then relax the rule to a warning:

```js run destructive
const lab = db.getSiblingDB("lab_info")
lab.createCollection("people", { validator: { $jsonSchema: { required: ["name"] } } })
lab.getCollectionInfos({ name: "people" })[0].options
```

```js run destructive
lab.runCommand({ collMod: "people", validationAction: "warn" })
lab.getCollectionInfos({ name: "people" })[0].options.validationAction
```

```js run destructive
lab.people.insertOne({ age: 30 })
lab.people.countDocuments()
```

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Show the `type` and validation settings of `customers` and `stores`, then count the customers whose `active` is `true` in two different ways.

## Watch out

### Statistics are a snapshot, and sizes are storage-engine details

Byte counts change with compression, padding and the server version. Use them to compare and to spot growth, not as exact figures to copy.

### `estimatedDocumentCount()` cannot filter

It ignores any argument you give it. Use `countDocuments(filter)` when you need a condition.

### `count()` is deprecated

Older tutorials use `db.films.count()`. Prefer `countDocuments()` or `estimatedDocumentCount()`.

### `collMod` changes the rules, not the existing data

Tightening a validator does not fix or remove documents that already break it.

## Interview corner

**"How do you find the size of a collection?"**
`db.collection.stats()` (or the `collStats` aggregation stage) reports document count, data size, storage size and index sizes.

**"What is the difference between `countDocuments` and `estimatedDocumentCount`?"**
`countDocuments(filter)` scans (or uses an index) and is exact. `estimatedDocumentCount()` reads collection metadata and is instant, but has no filter.

**"What does `collMod` do?"**
It modifies an existing collection: validation rules, index options such as expiry, or view definitions, without recreating it.

## Practice

### Warm-up: an exact count

How many films have a `rating` of `"R"`?

```js practice
// hint: `countDocuments({ rating: "R" })`.
db.films.countDocuments({ rating: "R" })
```

### Core: the index count

Return the number of indexes on `customers` (including `_id`).

```js practice
// hint: `db.customers.getIndexes().length`.
db.customers.getIndexes().length
```

### Stretch: which collections have a validator?

Return the sorted names of the collections that have a `validator` option.

```js practice
// hint: `getCollectionInfos()` and check `options.validator`.
db.getCollectionInfos().filter((c) => c.options && c.options.validator).map((c) => c.name).sort()
```
