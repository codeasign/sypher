---
title: "$count, $sortByCount, $skip, $limit and $sample"
order: 0
---

A handful of small stages do jobs that come up constantly: counting, ranking by frequency, paging and taking a random sample. They are simple, but each has a detail worth knowing.

## What you'll learn

- `$count` to count documents in a pipeline
- `$sortByCount` for frequency tables
- `$skip` and `$limit` inside pipelines
- `$sample` for random documents, and `$facet` for paging with totals

## Syntax

```js show
{ $count: "name" }
{ $sortByCount: "$field" }
{ $skip: 20 }
{ $limit: 10 }
{ $sample: { size: 5 } }
```

## Examples

### $count

Returns one document with the count under the name you give. When nothing reaches it, it returns **nothing** (not zero):

```js run
[
  db.films.aggregate([{ $match: { rating: "G" } }, { $count: "films" }]).toArray(),
  db.films.aggregate([{ $match: { rating: "XX" } }, { $count: "films" }]).toArray()
]
```

### $sortByCount: a frequency table

It is a `$group` by the expression with a count, followed by a descending sort. Equal counts come out in no defined order, so this page adds a follow-up `$sort` when order matters:

```js run
db.films.aggregate([
  { $sortByCount: "$category.name" },
  { $sort: { count: -1, _id: 1 } },
  { $limit: 4 }
])
```

### The most frequent actor last names

```js run
db.films.aggregate([
  { $unwind: "$actors" },
  { $sortByCount: "$actors.lastName" },
  { $sort: { count: -1, _id: 1 } },
  { $limit: 3 }
])
```

### $skip and $limit

The same as on cursors, but inside the pipeline, so you can page after grouping:

```js run
db.films.aggregate([
  { $group: { _id: "$category.name", films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } },
  { $skip: 2 },
  { $limit: 3 }
])
```

### Paging with the total in one query

`$facet` (next pages cover it fully) runs two sub-pipelines on the same input, so one call returns a page and the total:

```js run
db.films.aggregate([
  { $match: { rating: "G" } },
  { $facet: {
      total: [{ $count: "n" }],
      page: [{ $sort: { title: 1 } }, { $skip: 10 }, { $limit: 3 }, { $project: { _id: 0, title: 1 } }]
  } }
])
```

### $sample: random documents

`$sample` picks random documents. The result differs every run, so we only show its shape:

```js run
const s = db.films.aggregate([{ $sample: { size: 5 } }]).toArray();
[s.length, new Set(s.map((d) => d._id)).size]
```

### Sampling a group

Combine `$match` and `$sample` for "a random PG film":

```js run
const one = db.films.aggregate([{ $match: { rating: "PG" } }, { $sample: { size: 1 } }, { $project: { rating: 1 } }]).toArray();
[one.length, one[0].rating]
```

## Try it yourself

Find the five most common `rentalDurationDays` values with `$sortByCount`, then build a two-facet query that returns films 21 to 30 (ordered by title) together with the total number of films.

## Watch out

### `$count` on an empty stream returns nothing

Code that reads `result[0].n` fails when nothing matches. Handle the empty array (`result[0]?.n ?? 0`).

### `$sortByCount` has no tie-break

Groups with equal counts come out in no fixed order. Add `{ $sort: { count: -1, _id: 1 } }` when you need a stable result.

### `$skip` in pipelines is as slow as `skip()`

The server still reads and discards the skipped documents. For deep paging use keyset pagination.

### `$sample` may repeat a document

On a large collection, when the sample is a small share of it, MongoDB reads random positions and the same document can appear twice. It is also not a way to shuffle the whole collection.

### `$facet` does not use indexes after the first stage

Each facet works on the documents output by the previous stage in memory, and the combined output must fit in 16 MB.

## Interview corner

**"How do you count documents in an aggregation?"**
`{ $count: "name" }`, or `{ $group: { _id: null, n: { $sum: 1 } } }`.

**"What is `$sortByCount`?"**
A shortcut for grouping by a value, counting, and sorting by the count descending.

**"How would you get a page of results and the total count in one query?"**
Use `$facet` with one branch for the page (`$skip`, `$limit`) and one for `$count`.

## Practice

### Warm-up: count

How many films have a `lengthMinutes` over 150? Return `{ films: n }`.

```js practice
// hint: `$match` then `$count`.
db.films.aggregate([{ $match: { lengthMinutes: { $gt: 150 } } }, { $count: "films" }])
```

### Core: frequency

The three most common `rentalDurationDays` values with their counts (ties by value).

```js practice
// hint: `$sortByCount`, a tie-breaker `$sort`, `$limit`.
db.films.aggregate([{ $sortByCount: "$rentalDurationDays" }, { $sort: { count: -1, _id: 1 } }, { $limit: 3 }])
```

### Stretch: a page with the total

Films rated `R`: return the total number and page 2 (page size 3, ordered by title, only the title).

```js practice
// hint: `$facet` with `$count` and `$skip`/`$limit`.
db.films.aggregate([
  { $match: { rating: "R" } },
  { $facet: {
      total: [{ $count: "n" }],
      page: [{ $sort: { title: 1 } }, { $skip: 3 }, { $limit: 3 }, { $project: { _id: 0, title: 1 } }]
  } }
])
```
