---
title: "The Aggregation Pipeline"
order: 0
---

Aggregation is MongoDB's answer to `GROUP BY`, joins, computed columns and reporting. Instead of one big query, you write a **pipeline**: a list of stages, each one transforming the stream of documents that the previous stage produced.

## What you'll learn

- How a pipeline works: documents flow through stages
- `$match`, `$project` and `$sort`: the everyday stages
- Field paths (`"$field"`) and expressions
- Why the order of stages matters

## Syntax

```js show
db.collection.aggregate([
  { $match: { ... } },        // keep some documents
  { $project: { ... } },      // choose and compute fields
  { $sort: { ... } },         // order
  { $limit: 10 }              // cut
])
```

## Examples

### Stages in a row

Read it top to bottom: keep the PG films, pick three fields, order by length, take three:

```js run
db.films.aggregate([
  { $match: { rating: "PG" } },
  { $project: { _id: 0, title: 1, lengthMinutes: 1 } },
  { $sort: { lengthMinutes: -1, title: 1 } },
  { $limit: 3 }
])
```

### $match: the filter stage

`$match` takes the same filter document as `find`:

```js run
db.films.aggregate([{ $match: { rating: "G", lengthMinutes: { $lt: 50 } } }, { $count: "films" }])
```

### $project: reshape and compute

`$project` includes, excludes, renames and calculates fields. A field path starts with `$`:

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: {
      _id: 0,
      title: 1,
      hours: { $round: [{ $divide: ["$lengthMinutes", 60] }, 2] },
      category: "$category.name",
      castSize: { $size: "$actors" }
  } }
])
```

### $sort and $limit

```js run
db.films.aggregate([
  { $sort: { replacementCost: -1, title: 1 } },
  { $limit: 3 },
  { $project: { _id: 0, title: 1, replacementCost: 1 } }
])
```

### The order of stages changes the result

Limiting before sorting gives a different answer than sorting before limiting:

```js run
[
  db.films.aggregate([{ $limit: 3 }, { $sort: { lengthMinutes: -1 } }, { $project: { _id: 1 } }]).toArray().map((d) => d._id),
  db.films.aggregate([{ $sort: { lengthMinutes: -1, _id: 1 } }, { $limit: 3 }, { $project: { _id: 1 } }]).toArray().map((d) => d._id)
]
```

### Filter early

`$match` as the first stage can use an index and reduces the work of every later stage. This pipeline puts `$project` first and `$match` second. It still gives the right answer, because the optimiser moves the `$match` forward:

```js run
db.films.aggregate([
  { $project: { rating: 1, lengthMinutes: 1 } },
  { $match: { rating: "NC-17" } },
  { $group: { _id: null, avg: { $avg: "$lengthMinutes" } } },
  { $project: { _id: 0, avgLength: { $round: ["$avg", 1] } } }
])
```

MongoDB's optimiser moves a `$match` before a `$project` automatically when it is safe, but write the pipeline in the efficient order anyway.

### Explaining a pipeline

`explain()` shows how the server will run it. A leading `$match` on `_id` becomes a direct index lookup (the stage name differs between server versions):

```js run
db.films.explain().aggregate([{ $match: { _id: 5 } }, { $project: { title: 1 } }]).queryPlanner.winningPlan.stage
```

## Try it yourself

Write a pipeline that returns, for the five most expensive-to-replace `PG-13` films, their title, replacement cost and the number of actors, ordered by cost then title.

## Watch out

### Each stage sees only what the previous one produced

After `{ $project: { title: 1 } }` the field `rating` is gone. A later `$match` on `rating` matches nothing. Filter first, project last.

### `$project` with `1` and expressions

You can mix inclusions (`title: 1`) with computed fields, but `_id` is included unless you say `_id: 0`.

### `$sort` before `$group` rarely helps

Sorting the input of a `$group` does not sort the groups, so sort after grouping. (It does matter for `$first` and `$last`, which depend on input order.)

### Memory limit: 100 MB per stage

Stages such as `$sort` and `$group` fail with an error if they exceed 100 MB of RAM. Add `{ allowDiskUse: true }` for big data, or filter earlier.

### Field paths need the `$`

`{ $sum: "lengthMinutes" }` adds the text; `{ $sum: "$lengthMinutes" }` adds the field.

## Interview corner

**"What is the aggregation pipeline?"**
A sequence of stages, each transforming the documents from the previous stage, used to filter, reshape, group, join and compute.

**"What does `$project` do compared with a projection in `find`?"**
The same field selection, plus it can rename fields and compute new ones using expressions.

**"Why put `$match` first?"**
It reduces the documents early and can use an index, so all later stages do less work.

## Practice

### Warm-up: match and project

Return the titles of `G` films with a replacement cost above 28, sorted, first 3 only.

```js practice
// hint: `$match`, `$sort`, `$limit`, `$project`.
db.films.aggregate([
  { $match: { rating: "G", replacementCost: { $gt: 28 } } },
  { $sort: { title: 1 } },
  { $limit: 3 },
  { $project: { _id: 0, title: 1 } }
])
```

### Core: computed field

For film 2, return `title` and `minutesPerActor` (`lengthMinutes` divided by the number of actors, rounded to 1 decimal).

```js practice
// hint: `$divide` with `$size`.
db.films.aggregate([
  { $match: { _id: 2 } },
  { $project: { _id: 0, title: 1, minutesPerActor: { $round: [{ $divide: ["$lengthMinutes", { $size: "$actors" }] }, 1] } } }
])
```

### Stretch: order matters

Return the `_id`s of the 3 shortest films (ties by `_id`), sorting **before** limiting.

```js practice
// hint: `$sort: { lengthMinutes: 1, _id: 1 }`, then `$limit: 3`.
db.films.aggregate([{ $sort: { lengthMinutes: 1, _id: 1 } }, { $limit: 3 }, { $project: { _id: 1 } }])
```
