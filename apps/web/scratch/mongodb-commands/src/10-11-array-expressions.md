---
title: "Array Expressions: $map, $filter, $reduce"
order: 0
---

Many questions about this data are questions about arrays: "how much did each customer pay?", "which rentals are unreturned?", "the cast as one text line". Array expressions work **inside a document**, so you do not need `$unwind` and `$group` for them. They are faster and keep the document intact.

## What you'll learn

- `$map` to transform every element
- `$filter` to keep some elements
- `$reduce` to fold an array into one value
- `$size`, `$arrayElemAt`, `$slice`, `$in`, `$concatArrays`, `$sortArray`

## Syntax

```js show
{ $map:    { input: "$arr", as: "x", in: <expression using "$$x"> } }
{ $filter: { input: "$arr", as: "x", cond: <boolean using "$$x"> } }
{ $reduce: { input: "$arr", initialValue: 0, in: { $add: ["$$value", "$$this"] } } }
```

## Examples

### $map: transform each element

The cast of one film as full names:

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, title: 1, cast: { $map: { input: "$actors", as: "a", in: { $concat: ["$$a.firstName", " ", "$$a.lastName"] } } } } }
])
```

### $filter: keep matching elements

A customer's unreturned rentals, without unwinding:

```js run
db.customers.aggregate([
  { $match: { "rentals.returnDate": null } },
  { $project: { _id: 1, open: { $map: { input: { $filter: { input: "$rentals", as: "r", cond: { $eq: ["$$r.returnDate", null] } } }, as: "r", in: "$$r.rentalId" } } } },
  { $sort: { _id: 1 } },
  { $limit: 3 }
])
```

### $reduce: fold to one value

Total paid by customer 1 across all rentals and payments:

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, total: { $round: [{ $reduce: {
      input: "$rentals", initialValue: 0,
      in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] }
  } }, 2] } } }
])
```

### Build text from an array

Join the cast into one line:

```js run
db.films.aggregate([
  { $match: { _id: 2 } },
  { $project: { _id: 0, title: 1, cast: { $reduce: {
      input: "$actors", initialValue: "",
      in: { $concat: ["$$value", { $cond: [{ $eq: ["$$value", ""] }, "", ", "] }, "$$this.lastName"] }
  } } } }
])
```

### Sizes, positions and slices

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: {
      _id: 0,
      castSize: { $size: "$actors" },
      first: { $arrayElemAt: ["$actors.lastName", 0] },
      last: { $arrayElemAt: ["$actors.lastName", -1] },
      firstTwo: { $slice: ["$actors.lastName", 2] },
      hasTrailers: { $in: ["Trailers", "$specialFeatures"] }
  } }
])
```

### Sort and combine arrays

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, features: { $sortArray: { input: "$specialFeatures", sortBy: 1 } }, tags: { $concatArrays: ["$specialFeatures", ["extra"]] } } }
])
```

### Filtering by an array expression: films with a big cast

A `$match` with `$expr` can use array expressions too:

```js run
db.films.aggregate([
  { $match: { $expr: { $gte: [{ $size: { $filter: { input: "$actors", as: "a", cond: { $eq: ["$$a.lastName", "GUINESS"] } } } }, 1] } } },
  { $count: "filmsWithGuiness" }
])
```

### The best customers again, without $unwind

Total paid per customer using only `$reduce`, then the top 3:

```js run
db.customers.aggregate([
  { $project: { name: { $concat: ["$name.first", " ", "$name.last"] }, paid: { $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } } } },
  { $project: { name: 1, paid: { $round: ["$paid", 2] } } },
  { $sort: { paid: -1, _id: 1 } },
  { $limit: 3 }
])
```

## Try it yourself

For each store, return the number of inventory copies for film 1 using `$filter` and `$size`. Then return the names of the staff members as an array with `$map`.

## Watch out

### Inside `in`, the element is `$$x` (two dollars)

`"$$a.lastName"` reads the element; `"$a.lastName"` would read a top-level field called `a`. In `$reduce` the names are fixed: `$$value` and `$$this`.

### Prefer array expressions when you stay in one document

`$unwind` + `$group` multiplies documents and rebuilds them. `$map`/`$filter`/`$reduce` compute in place, using less memory.

### Use `$unwind` when you must group elements across documents

If the answer needs elements of different documents together (total per actor across films), you have to unwind.

### `$reduce` on a big array is sequential

It is fine for arrays of hundreds, but a document with a huge array is a modelling problem, not an expression problem.

### Missing arrays break expressions

`$size` of a missing field is an error. Use `{ $size: { $ifNull: ["$arr", []] } }` when the field may be absent.

## Interview corner

**"How do you filter an array inside a document without `$unwind`?"**
`$filter` with `input`, `as` and `cond`.

**"What is `$reduce`?"**
It folds an array into one value using an accumulator (`$$value`) and the current element (`$$this`).

**"When must you use `$unwind`?"**
When you need to group, count or join elements across documents.

## Practice

### Warm-up: size

How many special features does film 3 have? Return `{ n }`.

```js practice
// hint: `$size` in a `$project`.
db.films.aggregate([{ $match: { _id: 3 } }, { $project: { _id: 0, n: { $size: "$specialFeatures" } } }])
```

### Core: filter

For film 4, return the last names of the actors whose first name starts with `J`, as an array.

```js practice
// hint: `$filter` the actors with `$regexMatch` on the first name, then `$map` to the last names.
db.films.aggregate([
  { $match: { _id: 4 } },
  { $project: { _id: 0, names: { $map: { input: { $filter: { input: "$actors", as: "a", cond: { $regexMatch: { input: "$$a.firstName", regex: /^J/ } } } }, as: "a", in: "$$a.lastName" } } } }
])
```

### Stretch: reduce

For customer 3, return the number of payments over 5 across all rentals (`{ big: n }`), using `$reduce`.

```js practice
// hint: Inner `$filter` on `$$this.payments`, `$size`, add to `$$value`.
db.customers.aggregate([
  { $match: { _id: 3 } },
  { $project: { _id: 0, big: { $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $size: { $filter: { input: "$$this.payments", as: "p", cond: { $gt: ["$$p.amount", 5] } } } }] } } } } }
])
```
