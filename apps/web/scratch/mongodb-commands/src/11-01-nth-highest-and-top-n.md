---
title: "Interview Problems: Nth Highest and Top N per Group"
order: 0
---

Ranking questions are the most common aggregation interview problems: "second highest", "top three per group", "the longest film in each category". Each has a clean pipeline solution.

## What you'll learn

- The Nth highest value, with and without ties
- Top N per group with `$topN` and with sort + `$group` + `$slice`
- Ranking with `$setWindowFields`
- Choosing the right approach

## Syntax

```js show
db.c.aggregate([ { $sort: { v: -1 } }, { $skip: n - 1 }, { $limit: 1 } ])   // Nth row
db.c.aggregate([ { $group: { _id: "$g", top: { $topN: { n: 3, output: "$name", sortBy: { v: -1 } } } } } ])
```

## Examples

### Problem 1: the second longest film

The simplest answer skips one row. But if two films tie for the longest, "second row" is not "second longest":

```js run
db.films.aggregate([
  { $sort: { lengthMinutes: -1, title: 1 } },
  { $skip: 1 },
  { $limit: 1 },
  { $project: { _id: 0, title: 1, lengthMinutes: 1 } }
])
```

The first three films all have 185 minutes, so the "second row" is also 185. The second highest **distinct** length is different.

### Problem 2: the second highest distinct length

Group by the value first, so ties collapse into one row:

```js run
db.films.aggregate([
  { $group: { _id: "$lengthMinutes" } },
  { $sort: { _id: -1 } },
  { $skip: 1 },
  { $limit: 1 }
])
```

### Problem 3: everything with the Nth highest value

Find the length, then every film that has it:

```js run
const nth = db.films.aggregate([{ $group: { _id: "$lengthMinutes" } }, { $sort: { _id: -1 } }, { $skip: 1 }, { $limit: 1 }]).toArray()[0]._id;
db.films.find({ lengthMinutes: nth }, { title: 1, lengthMinutes: 1, _id: 0 }).sort({ title: 1 }).toArray()
```

### Problem 4: the longest film in each category

Sort, then take the first of each group. `$top` does both in one accumulator:

```js run
db.films.aggregate([
  { $group: { _id: "$category.name", longest: { $top: { output: { title: "$title", minutes: "$lengthMinutes" }, sortBy: { lengthMinutes: -1, title: 1 } } } } },
  { $sort: { _id: 1 } },
  { $limit: 4 }
])
```

### Problem 5: top 3 per group, as separate rows

`$topN` returns an array. To get one row per film, unwind it:

```js run
db.films.aggregate([
  { $match: { rating: "G" } },
  { $group: { _id: "$category.name", top: { $topN: { n: 2, output: "$title", sortBy: { replacementCost: -1, title: 1 } } } } },
  { $unwind: "$top" },
  { $sort: { _id: 1, top: 1 } },
  { $limit: 4 }
])
```

### Problem 6: top N with ties included

"All films at the top 2 rank values per rating": use a rank window function (ties share a rank):

```js run
db.films.aggregate([
  { $setWindowFields: { partitionBy: "$rating", sortBy: { replacementCost: -1 }, output: { r: { $denseRank: {} } } } },
  { $match: { r: { $lte: 2 } } },
  { $group: { _id: { rating: "$rating", rank: "$r", cost: "$replacementCost" }, films: { $sum: 1 } } },
  { $sort: { "_id.rating": 1, "_id.rank": 1 } },
  { $limit: 4 }
])
```

### Problem 7: the customer with the most rentals

```js run
db.customers.aggregate([
  { $project: { name: { $concat: ["$name.first", " ", "$name.last"] }, rentals: { $size: "$rentals" } } },
  { $sort: { rentals: -1, _id: 1 } },
  { $limit: 2 }
])
```

## Try it yourself

Find the third most expensive distinct `replacementCost` and the number of films at that cost. Then find the customer with the second-highest total payments.

## Watch out

### "Second highest" is ambiguous

Ask whether ties count as one value. `$skip: 1` on films gives the second **row**, `$group` first gives the second **distinct** value.

### Sorting without a tie-breaker is not stable

Add a second sort key (`title`, `_id`) so the result does not change between runs.

### `$topN` needs MongoDB 5.2+

On older versions use `$sort` then `$group` with `$push` and `$slice`.

### An empty group returns an empty array

`$topN` on a group with fewer than N documents returns all it has. Do not assume N results.

## Interview corner

**"How do you find the second highest salary in MongoDB?"**
`$group` by salary, `$sort` descending, `$skip: 1`, `$limit: 1`, which handles ties; or `$setWindowFields` with `$denseRank`.

**"How do you get the top N items per group?"**
`$topN` in `$group`, or a window function `$rank` per partition followed by `$match`.

**"What is the difference between `$rank` and `$denseRank` for top N?"**
`$rank` skips numbers after ties (1, 1, 3), so "rank ≤ 2" may include only the tied top. `$denseRank` gives 1, 1, 2, so it includes the next distinct value.

## Practice

### Warm-up: third highest distinct

Return the third highest distinct `lengthMinutes`.

```js practice
// hint: `$group`, `$sort`, `$skip: 2`, `$limit: 1`.
db.films.aggregate([{ $group: { _id: "$lengthMinutes" } }, { $sort: { _id: -1 } }, { $skip: 2 }, { $limit: 1 }])
```

### Core: the cheapest in each rating

The title of the film with the lowest `replacementCost` in each rating (ties by title).

```js practice
// hint: `$bottom` or sort + `$first`.
db.films.aggregate([
  { $sort: { replacementCost: 1, title: 1 } },
  { $group: { _id: "$rating", title: { $first: "$title" }, cost: { $first: "$replacementCost" } } },
  { $sort: { _id: 1 } }
])
```

### Stretch: second best customer

The customer with the second-highest number of rentals (ties by `_id`), as `{ name, rentals }`.

```js practice
// hint: Sort by rentals, then `$skip: 1`.
db.customers.aggregate([
  { $project: { _id: 0, name: { $concat: ["$name.first", " ", "$name.last"] }, rentals: { $size: "$rentals" }, id: "$_id" } },
  { $sort: { rentals: -1, id: 1 } },
  { $skip: 1 },
  { $limit: 1 },
  { $project: { name: 1, rentals: 1 } }
])
```
