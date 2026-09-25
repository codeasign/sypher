---
title: "distinct and Counting"
order: 0
---

Often you do not want documents, you want the **different values** a field takes, or a **count**. `distinct` and the counting commands answer those questions directly.

## What you'll learn

- `distinct()` on plain, nested and array fields
- Filtering a `distinct`
- Counting with `countDocuments` and `estimatedDocumentCount`
- When `distinct` is the wrong tool

## Syntax

```js show
db.collection.distinct("field")
db.collection.distinct("field", filter)
db.collection.countDocuments(filter)
```

## Examples

### Distinct values of a field

```js run
db.films.distinct("rating").sort()
```

### Nested field

```js run
db.films.distinct("category.name").sort()
```

### With a filter

Which ratings exist among films longer than 180 minutes?

```js run
db.films.distinct("rating", { lengthMinutes: { $gt: 180 } }).sort()
```

### Array fields are flattened

For an array, `distinct` returns the distinct **elements**, not distinct arrays:

```js run
db.films.distinct("specialFeatures").sort()
```

```js run
db.films.distinct("actors.lastName").length
```

### How many distinct values?

```js run
[db.films.distinct("rentalRate").sort((a, b) => a - b), db.films.distinct("releaseYear")]
```

### distinct versus aggregate

`distinct` returns one array, and the array must fit in one 16 MB response. For counts per value, or for large sets, use `$group`:

```js run
db.films.aggregate([
  { $group: { _id: "$rating", films: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

### Counting

```js run
[
  db.films.countDocuments({ rating: "PG" }),
  db.films.countDocuments({ rating: { $in: ["PG", "PG-13"] } }),
  db.customers.countDocuments({ active: false })
]
```

### Count of distinct values

```js run
db.films.aggregate([{ $group: { _id: "$category.name" } }, { $count: "categories" }])
```

## Try it yourself

List the distinct `rentalDurationDays` values, and the distinct countries of the customers (`address.country`), then count those countries.

## Watch out

### distinct returns an array, not a cursor

It loads the entire answer into memory. On a field with millions of different values that is a problem. Use `$group` and paging instead.

### The result is not sorted

`distinct` returns values in no particular order. Sort in the shell (`.sort()`) or in an aggregation.

### `null` and missing values

Documents that lack the field are ignored. A stored `null` appears as `null` in the result.

### `distinct` on an array counts elements

Distinct on `specialFeatures` gives each feature once, not each combination.

## Interview corner

**"What does `distinct` do?"**
It returns an array of the unique values of a field, optionally within the documents matching a filter.

**"When would you use `$group` instead of `distinct`?"**
When you need counts per value, when the result could be large, or when you want to continue processing in a pipeline.

**"How do you count distinct values?"**
`db.c.distinct(field).length` for small sets, or `$group` on the field followed by `$count`.

## Practice

### Warm-up: distinct ratings

Return the number of distinct `rating` values.

```js practice
// hint: `distinct("rating").length`.
db.films.distinct("rating").length
```

### Core: distinct with a filter

Return the sorted distinct category names of the films rated `NC-17` and longer than 170 minutes.

```js practice
// hint: `distinct("category.name", { ... })`.
db.films.distinct("category.name", { rating: "NC-17", lengthMinutes: { $gt: 170 } }).sort()
```

### Stretch: how many countries?

Return the number of distinct countries among customers.

```js practice
// hint: `distinct("address.country").length`.
db.customers.distinct("address.country").length
```
