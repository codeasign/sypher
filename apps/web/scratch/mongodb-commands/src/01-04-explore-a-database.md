---
title: "Explore a Database"
order: 0
---

Before you query a database, you look around: which collections exist, how many documents they hold, what a typical document looks like, and which indexes and rules are in place. A handful of commands answers all of it.

## What you'll learn

- Listing databases and collections
- Counting and sampling documents
- Finding the fields a collection uses
- Reading indexes and validation rules

## Syntax

```js show
db.getName()
db.getCollectionNames()
db.collection.countDocuments()
db.collection.findOne()
db.collection.getIndexes()
db.getCollectionInfos({ name: "films" })
```

## Examples

### The database and its collections

```js run
db.getName()
```

```js run
db.getCollectionNames().sort()
```

### How many documents

`countDocuments()` counts exactly. `estimatedDocumentCount()` is instant, from metadata, and is fine for a quick look:

```js run
db.films.countDocuments()
```

```js run
db.customers.estimatedDocumentCount()
```

### A sample document

`findOne()` returns one document, so you can see the shape. Here the first customer without the long `rentals` list:

```js run
db.customers.findOne({}, { rentals: 0 })
```

### Which fields exist?

`Object.keys()` on a sample lists the top-level fields, and an aggregation can list every field name used anywhere in the collection:

```js run
Object.keys(db.films.findOne())
```

```js run
db.films.aggregate([
  { $project: { fields: { $map: { input: { $objectToArray: "$$ROOT" }, in: "$$this.k" } } } },
  { $unwind: "$fields" },
  { $group: { _id: "$fields", films: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

Every film has every field, which is what the validator below enforces.

### Indexes

```js run
db.films.getIndexes().map((i) => i.name)
```

### Validation rules

A collection can have a validator that rejects documents of the wrong shape. Here are the required fields of a film:

```js run
db.getCollectionInfos({ name: "films" })[0].options.validator.$jsonSchema.required
```

### Storage statistics

```js run
const s = db.films.stats();
[s.count, s.nindexes]
```

## Try it yourself

Run `getIndexes()` on `customers` and `stores`, and find the collection with the most documents. Then look at one store document without its `inventory` and `staff` lists.

## Watch out

### findOne() is not a random sample

It returns the first document in natural order. To look at a random one use `db.films.aggregate([{ $sample: { size: 1 } }])`.

### Documents in one collection can differ

Unlike a table, nothing forces every document to have the same fields (unless a validator does). Do not assume a field exists because the first document has it.

### Passwords and pictures live in some documents

The `stores` documents contain staff records with password hashes and images. Use projections (next modules) so you do not print them, and never put such data in real examples.

### countDocuments() versus estimatedDocumentCount()

`countDocuments()` runs a real count and accepts a filter. `estimatedDocumentCount()` reads metadata and cannot filter.

## Interview corner

**"How would you find out what a collection contains?"**
`countDocuments()` for size, `findOne()` for the shape, `getIndexes()` for indexes, and `getCollectionInfos()` for options such as a validator. For all field names, an aggregation over `$objectToArray`.

**"What is the difference between `countDocuments()` and `estimatedDocumentCount()`?"**
`countDocuments(filter)` counts matching documents exactly. `estimatedDocumentCount()` uses collection metadata: instant, but no filter, and approximate after an unclean shutdown.

## Practice

### Warm-up: how many collections?

Return how many collections the database has, as a number.

```js practice
// hint: `db.getCollectionNames().length`.
db.getCollectionNames().length
```

### Core: which collection is biggest?

Return the name of the collection with the most documents (count each with `countDocuments()`).

```js practice
// hint: Map each name to its count, sort descending, take the first name.
db.getCollectionNames().map((n) => ({ n, c: db.getCollection(n).countDocuments() })).sort((a, b) => b.c - a.c)[0].n
```

### Stretch: the required fields

Return the list of the fields that a **customer** document must have (from its validator), sorted alphabetically.

```js practice
// hint: `getCollectionInfos({ name: "customers" })`, then `options.validator.$jsonSchema.required`.
db.getCollectionInfos({ name: "customers" })[0].options.validator.$jsonSchema.required.sort()
```
