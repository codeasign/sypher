---
title: "Interview Problems: Anti-Joins, Self-Joins and Relations"
order: 0
---

Relational interview questions have MongoDB versions: "customers who never did X", "pairs of actors who worked together", "films with no rentals", "customers who rented every film of a category". This page solves them with `$lookup`, `$setDifference` and friends.

## What you'll learn

- Anti-joins: things with no related record
- Semi-joins: things that have at least one
- Self-joins: pairs from the same collection
- "For all" questions with set operations

## Syntax

```js show
{ $lookup: { from, localField, foreignField, as } }, { $match: { as: { $size: 0 } } }     // anti-join
{ $setIsSubset: [ <needed>, <have> ] }                                                      // "has all of"
```

## Examples

### Problem 1: films that were never rented (anti-join)

```js run
db.films.aggregate([
  { $lookup: { from: "customers", localField: "_id", foreignField: "rentals.filmId", as: "renters", pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }] } },
  { $match: { renters: { $size: 0 } } },
  { $count: "neverRented" }
])
```

The `pipeline` with `$limit: 1` stops at the first renter, which is all an anti-join needs.

### Problem 2: customers with an unreturned rental (semi-join)

`$elemMatch` in a plain `find` is the simplest semi-join, because the data is embedded:

```js run
db.customers.countDocuments({ rentals: { $elemMatch: { returnDate: null } } })
```

### Problem 3: actors who appear together (self-join)

Copy the cast id list into two fields, unwind both (every film becomes all pairs of its cast), keep ordered pairs (`a < b`) and count films per pair:

```js run
db.films.aggregate([
  { $project: { a: "$actors.actorId", b: "$actors.actorId" } },
  { $unwind: "$a" },
  { $unwind: "$b" },
  { $match: { $expr: { $lt: ["$a", "$b"] } } },
  { $group: { _id: { a: "$a", b: "$b" }, films: { $sum: 1 } } },
  { $sort: { films: -1, "_id.a": 1, "_id.b": 1 } },
  { $limit: 3 }
])
```

The `$lt` test removes self-pairs and keeps each pair once. Filtering to one actor first, as the next problem does, is much cheaper when you only need one actor's co-stars.

### Problem 4: co-stars of one actor

Films of actor 1 (PENELOPE GUINESS), then the other actors in those films:

```js run
db.films.aggregate([
  { $match: { "actors.actorId": 1 } },
  { $unwind: "$actors" },
  { $match: { "actors.actorId": { $ne: 1 } } },
  { $group: { _id: { id: "$actors.actorId", name: { $concat: ["$actors.firstName", " ", "$actors.lastName"] } }, together: { $sum: 1 } } },
  { $sort: { together: -1, "_id.id": 1 } },
  { $limit: 3 }
])
```

### Problem 5: customers who rented every film of a small category ("for all")

Take the films of one category, collect their ids, and check each customer's rented film ids against them with `$setIsSubset`. We pick a category with few films for a meaningful answer, using `Music` limited to its first three films:

```js run
const need = db.films.find({ "category.name": "Music" }, { _id: 1 }).sort({ _id: 1 }).limit(3).toArray().map((d) => d._id);
db.customers.aggregate([
  { $project: { rented: "$rentals.filmId" } },
  { $match: { $expr: { $setIsSubset: [need, "$rented"] } } },
  { $count: "customersWhoRentedAllThree" }
])
```

### Problem 6: customers with no unreturned rental (anti-join)

The opposite of Problem 2:

```js run
db.customers.aggregate([
  { $match: { rentals: { $not: { $elemMatch: { returnDate: null } } } } },
  { $count: "allReturned" }
])
```

### Problem 7: films rented by both stores

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: "$rentals.filmId", stores: { $addToSet: "$rentals.storeId" } } },
  { $match: { $expr: { $eq: [{ $size: "$stores" }, 2] } } },
  { $count: "filmsRentedInBothStores" }
])
```

## Try it yourself

Find the pairs of films that were rented by the same customer most often (hint: unwind two levels and self-join by customer), or simpler: the actors who never appear with actor 1.

## Watch out

### An anti-join with `$lookup` scans

Index the foreign field, and use a `$limit: 1` sub-pipeline so each check stops at the first match.

### `$elemMatch` with `$not` matches documents without the array

`{ rentals: { $not: { $elemMatch: ... } } }` is also true when `rentals` is missing. Add `rentals: { $exists: true }` if that matters.

### Self-join pairs need an ordering

Without `a < b` every pair appears twice (A,B and B,A) and every actor pairs with themselves.

### "For all" is expensive

Compare sets with `$setIsSubset` only after narrowing the candidates.

## Interview corner

**"How do you find rows with no matching row in another table?"**
An anti-join: `$lookup` then `$match` with an empty array, or `$nin` against a list of ids for small sets.

**"How do you find pairs within one collection?"**
Self-join with `$lookup` on the same collection, or unwind an array twice, and restrict to `a < b` to avoid duplicates.

**"How do you check that a set contains all of another set?"**
`$setIsSubset: [needed, have]`.

## Practice

### Warm-up: all returned

How many customers have returned every rental?

```js practice
// hint: `$not` with `$elemMatch` on `returnDate: null`.
db.customers.countDocuments({ rentals: { $not: { $elemMatch: { returnDate: null } } } })
```

### Core: co-stars

How many different actors share a film with actor 2? Return `{ costars: n }`.

```js practice
// hint: Match films with actor 2, unwind, exclude 2, group by id, count.
db.films.aggregate([
  { $match: { "actors.actorId": 2 } },
  { $unwind: "$actors" },
  { $match: { "actors.actorId": { $ne: 2 } } },
  { $group: { _id: "$actors.actorId" } },
  { $count: "costars" }
])
```

### Stretch: subset

How many customers rented both film 1 and film 663 (`$setIsSubset`)?

```js practice
// hint: `[1, 663]` against `$rentals.filmId`.
db.customers.aggregate([
  { $project: { rented: "$rentals.filmId" } },
  { $match: { $expr: { $setIsSubset: [[1, 663], "$rented"] } } },
  { $count: "customers" }
])
```
