---
title: "The Query Language (MQL)"
order: 0
---

MongoDB has no SQL. You ask questions with the **MongoDB Query Language**: JSON-like documents that describe what you want. This page is the map of the whole language, so every later page has a place to hang on.

## What you'll learn

- The two ways to read data: `find()` and `aggregate()`
- The parts of a `find`: filter, projection, options
- Query operators, update operators, aggregation stages
- How a SQL query translates

## Syntax

```js show
db.collection.find(filter, projection)      // read documents
db.collection.aggregate([ stage, stage ])   // transform and summarise
db.collection.insertOne(document)           // create
db.collection.updateOne(filter, update)     // change
db.collection.deleteOne(filter)             // remove
```

## Examples

### find: a filter, a projection, options

`find` takes a **filter** (which documents), an optional **projection** (which fields), and you chain **options** (sort, limit):

```js run
db.films.find(
  { rating: "PG", lengthMinutes: { $lt: 50 } },   // filter
  { title: 1, lengthMinutes: 1, _id: 0 }          // projection
).sort({ lengthMinutes: 1 }).limit(3)             // options
```

### aggregate: a pipeline of stages

`aggregate` sends documents through **stages**. Each stage transforms the stream: filter, group, sort, reshape:

```js run
db.films.aggregate([
  { $match: { rating: "PG" } },
  { $group: { _id: "$category.name", films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } },
  { $limit: 3 }
])
```

### The three families of operators

| Family | Starts with | Used in | Example |
|---|---|---|---|
| **Query** operators | `$gt`, `$in`, `$and` | `find` filters, `$match` | `{ length: { $gt: 100 } }` |
| **Update** operators | `$set`, `$inc`, `$push` | `updateOne`, `updateMany` | `{ $set: { rating: "R" } }` |
| **Aggregation** stages and expressions | `$match`, `$group`, `$sum` | `aggregate` | `{ $group: { _id: "$rating" } }` |

Field names never start with `$`, so anything starting with `$` is an operator, and `"$field"` inside an aggregation is a **reference to a field's value**.

### Translating SQL

| SQL | MongoDB |
|---|---|
| `SELECT title FROM film WHERE rating = 'PG'` | `db.films.find({ rating: "PG" }, { title: 1 })` |
| `... ORDER BY length DESC LIMIT 3` | `.sort({ lengthMinutes: -1 }).limit(3)` |
| `SELECT COUNT(*) FROM film` | `db.films.countDocuments()` |
| `... GROUP BY rating` | `aggregate([{ $group: { _id: "$rating", n: { $sum: 1 } } }])` |
| `INSERT INTO ...` | `insertOne` / `insertMany` |
| `UPDATE ... SET ... WHERE ...` | `updateMany(filter, { $set: {...} })` |
| `DELETE FROM ... WHERE ...` | `deleteMany(filter)` |

The same question both ways: how many PG films are there?

```js run
[
  db.films.countDocuments({ rating: "PG" }),
  db.films.aggregate([{ $match: { rating: "PG" } }, { $count: "n" }]).toArray()[0].n
]
```

## Try it yourself

Take a SQL query you know (`SELECT ... WHERE ... ORDER BY ...`) and write it as a `find` with a projection, then again as an `aggregate`.

## Watch out

### `find` cannot compute or group

It filters and shapes documents, nothing more. Counting per group, joining and calculating need `aggregate`.

### The order of stages matters

`$match` before `$group` filters first (fast). `$match` after `$group` filters the groups (slower). Put filtering as early as possible.

### Projection values: 1 or 0, not both

A projection either lists the fields to include (`{ title: 1 }`) or the fields to exclude (`{ actors: 0 }`), never a mix (except `_id`, which you can always exclude).

### Filters are documents, so order of keys does not matter

`{ a: 1, b: 2 }` means `a = 1 AND b = 2`. For OR you need `$or`.

## Interview corner

**"What are the two ways to read data in MongoDB?"**
`find()` for filtering and projecting documents, and `aggregate()` for multi-stage processing such as grouping, joining and computing.

**"What is a projection?"**
The second argument of `find`, choosing which fields are returned: `{ title: 1 }` includes only `title` (and `_id`), `{ actors: 0 }` excludes `actors`.

**"How would you translate `GROUP BY` to MongoDB?"**
With the `$group` stage of an aggregation pipeline: `_id` is the grouping key, and accumulators such as `$sum` and `$avg` compute per group.

## Practice

### Warm-up: a find

Return the `title` and `rating` of the film with `_id` 10 (no `_id` in the result).

```js practice
// hint: `db.films.find({ _id: 10 }, { title: 1, rating: 1, _id: 0 })`.
db.films.find({ _id: 10 }, { title: 1, rating: 1, _id: 0 })
```

### Core: a sorted find

Return the titles of the 3 longest films (`lengthMinutes` descending, ties by `title`), as `{ title, lengthMinutes }` without `_id`.

```js practice
// hint: `.sort({ lengthMinutes: -1, title: 1 }).limit(3)`.
db.films.find({}, { title: 1, lengthMinutes: 1, _id: 0 }).sort({ lengthMinutes: -1, title: 1 }).limit(3)
```

### Stretch: the same as a pipeline

Return the number of films per `rating`, sorted by rating, as `{ _id: rating, films: n }`.

```js practice
// hint: `$group` by `"$rating"` with `$sum: 1`, then `$sort`.
db.films.aggregate([{ $group: { _id: "$rating", films: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```
