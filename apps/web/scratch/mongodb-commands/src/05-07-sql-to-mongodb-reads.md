---
title: "From SQL to MongoDB: Reading Data"
order: 0
---

If you know SQL, you already know what to ask. This page translates the queries you write every day into MongoDB, one pair at a time, and runs the MongoDB side against the DVD Rental data.

## What you'll learn

- SQL `SELECT`, `WHERE`, `ORDER BY`, `LIMIT` in MongoDB
- `IN`, `BETWEEN`, `LIKE`, `IS NULL`
- `DISTINCT`, `COUNT`, `GROUP BY`
- A one-page summary table to keep

## Syntax

```js show
// SELECT a, b FROM t WHERE c = 1 ORDER BY a LIMIT 10
db.t.find({ c: 1 }, { a: 1, b: 1 }).sort({ a: 1 }).limit(10)
```

## Examples

### SELECT columns WHERE

SQL: `SELECT title, rental_rate FROM film WHERE rating = 'PG' AND length > 175`

```js run
db.films.find({ rating: "PG", lengthMinutes: { $gt: 175 } }, { title: 1, rentalRate: 1, _id: 0 }).sort({ title: 1 })
```

### ORDER BY and LIMIT

SQL: `SELECT title FROM film ORDER BY length DESC, title LIMIT 3`

```js run
db.films.find({}, { title: 1, _id: 0 }).sort({ lengthMinutes: -1, title: 1 }).limit(3)
```

### IN and NOT IN

SQL: `WHERE rating IN ('G','PG') AND length < 47`

```js run
db.films.find({ rating: { $in: ["G", "PG"] }, lengthMinutes: { $lt: 47 } }, { title: 1, rating: 1, _id: 0 }).sort({ title: 1 })
```

### BETWEEN

SQL: `WHERE length BETWEEN 46 AND 47`

```js run
db.films.countDocuments({ lengthMinutes: { $gte: 46, $lte: 47 } })
```

### LIKE

SQL: `WHERE title LIKE 'ZO%'` becomes a regular expression:

```js run
db.films.find({ title: /^ZO/ }, { title: 1, _id: 0 }).sort({ title: 1 })
```

SQL: `WHERE title LIKE '%DRAGON%'`

```js run
db.films.find({ title: /DRAGON/ }, { title: 1, _id: 0 }).sort({ title: 1 })
```

### IS NULL

SQL: `WHERE return_date IS NULL`. In this data the rentals live inside customers, so count with an aggregation:

```js run
db.customers.aggregate([{ $unwind: "$rentals" }, { $match: { "rentals.returnDate": null } }, { $count: "unreturned" }])
```

### DISTINCT

SQL: `SELECT DISTINCT rating FROM film`

```js run
db.films.distinct("rating").sort()
```

### COUNT, GROUP BY, HAVING

SQL: `SELECT rating, COUNT(*) FROM film GROUP BY rating HAVING COUNT(*) > 195`

```js run
db.films.aggregate([
  { $group: { _id: "$rating", films: { $sum: 1 } } },
  { $match: { films: { $gt: 195 } } },
  { $sort: { _id: 1 } }
])
```

### JOIN

SQL: `SELECT ... FROM rental JOIN film ...`. MongoDB either embeds (no join needed) or uses `$lookup`:

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $unwind: "$rentals" },
  { $limit: 2 },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "film" } },
  { $project: { _id: 0, rentalId: "$rentals.rentalId", title: { $arrayElemAt: ["$film.title", 0] } } }
])
```

### Summary table

| SQL | MongoDB |
|---|---|
| `SELECT a, b` | projection `{ a: 1, b: 1 }` |
| `WHERE a = 1 AND b > 2` | `{ a: 1, b: { $gt: 2 } }` |
| `WHERE a = 1 OR b = 2` | `{ $or: [{ a: 1 }, { b: 2 }] }` |
| `a IN (1,2)` | `{ a: { $in: [1, 2] } }` |
| `a BETWEEN 1 AND 5` | `{ a: { $gte: 1, $lte: 5 } }` |
| `a LIKE 'x%'` | `{ a: /^x/ }` |
| `a IS NULL` | `{ a: null }` |
| `ORDER BY a DESC` | `.sort({ a: -1 })` |
| `LIMIT 10 OFFSET 20` | `.skip(20).limit(10)` |
| `COUNT(*)` | `countDocuments()` |
| `DISTINCT a` | `distinct("a")` |
| `GROUP BY` / `HAVING` | `$group` then `$match` |
| `JOIN` | `$lookup`, or embed |

## Try it yourself

Translate: `SELECT title FROM film WHERE category = 'Horror' AND rental_rate = 4.99 ORDER BY length LIMIT 5`.

## Watch out

### `{ a: null }` matches missing fields too

It matches documents where `a` is `null` **or does not exist**. To match only stored nulls, add a type test (module 6).

### A regular expression is not always index friendly

`/^ZO/` (anchored at the start) can use an index on the field. `/DRAGON/` cannot and scans everything.

### There is no `SELECT *`

An empty projection returns every field. Use a projection when you want fewer.

### Joins are optional, not free

If you find yourself writing `$lookup` in every query, the data model is probably too normalised for MongoDB. See module 13.

## Interview corner

**"Translate `SELECT rating, COUNT(*) FROM film GROUP BY rating`."**
`db.films.aggregate([{ $group: { _id: "$rating", n: { $sum: 1 } } }])`.

**"How do you write `LIKE '%abc%'`?"**
As a regular expression: `{ field: /abc/ }`, case-insensitive with `/abc/i`.

**"What is MongoDB's equivalent of `JOIN`?"**
The `$lookup` aggregation stage, though embedding related data often avoids the join.

## Practice

### Warm-up: where and order

Return the titles of `G` films shorter than 50 minutes, sorted.

```js practice
// hint: `{ rating: "G", lengthMinutes: { $lt: 50 } }`.
db.films.find({ rating: "G", lengthMinutes: { $lt: 50 } }, { title: 1, _id: 0 }).sort({ title: 1 })
```

### Core: IN

How many films are rated `R` or `NC-17`?

```js practice
// hint: `$in`.
db.films.countDocuments({ rating: { $in: ["R", "NC-17"] } })
```

### Stretch: group and having

List the categories that have more than 70 films, with their counts, ordered by count then name.

```js practice
// hint: `$group`, `$match` on the count, `$sort`.
db.films.aggregate([
  { $group: { _id: "$category.name", films: { $sum: 1 } } },
  { $match: { films: { $gt: 70 } } },
  { $sort: { films: -1, _id: 1 } }
])
```
