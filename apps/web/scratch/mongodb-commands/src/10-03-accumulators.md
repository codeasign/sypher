---
title: "Accumulators: $push, $addToSet, $first, $last and more"
order: 0
---

Besides sums and averages, `$group` can collect values into arrays, take the first or last of a group, and count distinct things. These accumulators turn groups into rich summaries: "each category with its five longest films", "each customer with a list of rented titles".

## What you'll learn

- `$push` and `$addToSet` to collect values
- `$first` and `$last`, and why sort order matters
- `$top`, `$topN`, `$maxN` and `$minN` (MongoDB 5.2+)
- `$count`, `$stdDevPop` and other statistics
- Counting distinct values

## Syntax

```js show
{ $group: {
    _id: "$key",
    all: { $push: "$field" },
    unique: { $addToSet: "$field" },
    first: { $first: "$field" },
    best: { $top: { output: "$title", sortBy: { score: -1 } } }
} }
```

## Examples

### $push: collect into an array

The titles of the three shortest films of each rating (sort first, then slice):

```js run
db.films.aggregate([
  { $sort: { lengthMinutes: 1, title: 1 } },
  { $group: { _id: "$rating", shortest: { $push: "$title" } } },
  { $project: { shortest: { $slice: ["$shortest", 3] } } },
  { $sort: { _id: 1 } }
])
```

Pushing every title only to slice it is wasteful. The next examples do it in the accumulator.

### $addToSet: unique values

```js run
db.films.aggregate([
  { $group: { _id: "$category.name", ratings: { $addToSet: "$rating" } } },
  { $project: { ratings: { $sortArray: { input: "$ratings", sortBy: 1 } } } },
  { $sort: { _id: 1 } },
  { $limit: 3 }
])
```

### $first and $last

They depend on **input order**, so sort before grouping. The longest film of each rating:

```js run
db.films.aggregate([
  { $sort: { lengthMinutes: -1, title: 1 } },
  { $group: { _id: "$rating", longestTitle: { $first: "$title" }, minutes: { $first: "$lengthMinutes" } } },
  { $sort: { _id: 1 } }
])
```

### $top and $topN

The same without a separate sort stage, and with an N:

```js run
db.films.aggregate([
  { $group: { _id: "$rating", longest: { $top: { output: "$title", sortBy: { lengthMinutes: -1, title: 1 } } } } },
  { $sort: { _id: 1 } }
])
```

```js run
db.films.aggregate([
  { $group: { _id: "$rating", longestTwo: { $topN: { n: 2, output: "$title", sortBy: { lengthMinutes: -1, title: 1 } } } } },
  { $sort: { _id: 1 } },
  { $limit: 2 }
])
```

### $maxN, $minN

The three largest lengths in each rating:

```js run
db.films.aggregate([
  { $group: { _id: "$rating", top3: { $maxN: { n: 3, input: "$lengthMinutes" } } } },
  { $sort: { _id: 1 } }
])
```

### Statistics

```js run
db.films.aggregate([
  { $group: { _id: "$rating", sd: { $stdDevPop: "$lengthMinutes" }, n: { $count: {} } } },
  { $project: { n: 1, sd: { $round: ["$sd", 2] } } },
  { $sort: { _id: 1 } }
])
```

### Counting distinct values

`$addToSet` with `$size`, or two `$group` stages:

```js run
db.films.aggregate([
  { $group: { _id: "$rating", days: { $addToSet: "$rentalDurationDays" } } },
  { $project: { distinctDays: { $size: "$days" } } },
  { $sort: { _id: 1 } }
])
```

### Collecting whole documents

Push a small subdocument built from several fields, to keep related values together:

```js run
db.films.aggregate([
  { $match: { lengthMinutes: { $gt: 184 } } },
  { $sort: { title: 1 } },
  { $group: { _id: "$rating", films: { $push: { title: "$title", minutes: "$lengthMinutes" } } } },
  { $sort: { _id: 1 } },
  { $limit: 2 }
])
```

## Try it yourself

For each category, list the two costliest (replacement cost) film titles with `$topN`, and the number of distinct ratings with `$addToSet` and `$size`.

## Watch out

### `$push` builds arrays in memory

A group with a million documents makes a huge array, which can exceed 16 MB per output document. Limit with `$topN`, `$maxN` or `$slice`, or do not group at all.

### `$first` without a sort is arbitrary

It returns the first document seen, which has no defined meaning after a `$group` or without a sort. Sort before, or use `$top`.

### `$addToSet` does not sort

The array order is not defined. Sort it with `$sortArray` if you need stable output.

### `$topN` versus `$sort` + `$group` + `$slice`

`$topN` keeps only N items per group, so it uses far less memory than `$push` followed by `$slice`.

## Interview corner

**"What is the difference between `$push` and `$addToSet` in `$group`?"**
`$push` collects every value, including duplicates. `$addToSet` collects unique values only.

**"How do you get the top N per group?"**
Use `$topN` (MongoDB 5.2+), or sort then `$group` with `$push` and `$slice`, or a `$setWindowFields` with a rank.

**"Why sort before `$first`?"**
Because `$first` returns the first document that reaches the group, so its meaning depends on input order.

## Practice

### Warm-up: first per group

For each rating, return the title that comes first alphabetically.

```js practice
// hint: `$sort` by title, then `$group` with `$first`.
db.films.aggregate([
  { $sort: { title: 1 } },
  { $group: { _id: "$rating", firstTitle: { $first: "$title" } } },
  { $sort: { _id: 1 } }
])
```

### Core: unique values per group

For each `rentalRate`, list the sorted distinct ratings.

```js practice
// hint: `$addToSet` then `$sortArray`.
db.films.aggregate([
  { $group: { _id: "$rentalRate", ratings: { $addToSet: "$rating" } } },
  { $project: { ratings: { $sortArray: { input: "$ratings", sortBy: 1 } } } },
  { $sort: { _id: 1 } }
])
```

### Stretch: top 2 per category

For the categories `Music` and `Travel`, list their two longest films (titles), ties by title.

```js practice
// hint: `$match` the two categories, then `$topN`.
db.films.aggregate([
  { $match: { "category.name": { $in: ["Music", "Travel"] } } },
  { $group: { _id: "$category.name", top2: { $topN: { n: 2, output: "$title", sortBy: { lengthMinutes: -1, title: 1 } } } } },
  { $sort: { _id: 1 } }
])
```
