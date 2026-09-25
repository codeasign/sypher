---
title: "Operator Workshop: Ten Filters"
order: 0
---

The operators of this module are tools. This page is where you pick the right one. Each question describes a real request against the DVD Rental data: write the filter, then compare with the solution.

## What you'll learn

- Choosing between `$in`, `$or`, `$and`, `$nor` and `$not`
- Applying `$elemMatch`, `$exists` and `$type` where they matter
- Cross-checking a filter with a second method

## Syntax

```js show
db.collection.countDocuments({ ...conditions })
db.collection.find({ ...conditions }, { ...projection })
```

## Examples

### A worked example: three ways to the same number

*How many films are NOT rated G or PG?* Three filters that must agree:

```js run
[
  db.films.countDocuments({ rating: { $nin: ["G", "PG"] } }),
  db.films.countDocuments({ $nor: [{ rating: "G" }, { rating: "PG" }] }),
  db.films.countDocuments({ rating: { $in: ["PG-13", "R", "NC-17"] } })
]
```

### A worked example: the cast trap

*Films with an actor called ED and an actor called CHASE (possibly two people) versus one actor called ED CHASE.*

```js run
[
  db.films.countDocuments({ "actors.firstName": "ED", "actors.lastName": "CHASE" }),
  db.films.countDocuments({ actors: { $elemMatch: { firstName: "ED", lastName: "CHASE" } } })
]
```

### A worked example: check the data first

Before filtering on `returnDate`, see which types it holds:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: { $type: "$rentals.returnDate" }, rentals: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

## Try it yourself

Invent one question of your own about the films, write two different filters for it, and confirm both give the same count.

## Watch out

### Always cross-check a count

Two different filters for the same question catch most mistakes, especially with `$ne`, `$not`, null and arrays.

### Read the type before you filter

If a field turns out to hold two types, a filter for one silently ignores the other.

### Break big filters into parts

Test each condition alone (`countDocuments`), then combine. It shows quickly which part removes too much.

### Do not trust an empty result

An empty result means "nothing matched", which can be a wrong field name or type, not a true absence.

## Interview corner

**"How do you debug a filter that returns nothing?"**
Test each condition separately, check field names and types with `findOne` and `$type`, and remember that arrays, null and missing fields behave differently.

**"How would you verify a count in MongoDB?"**
Compute it a second way (for example `$group` versus `countDocuments`, or `$in` versus `$or`) and compare.

## Practice

Ten questions. Each has a hidden hint and solution.

### Q1: Comparison

How many films have a `rentalRate` of at most 2.99 and a `lengthMinutes` of at least 120?

```js practice
// hint: `$lte` and `$gte`.
db.films.countDocuments({ rentalRate: { $lte: 2.99 }, lengthMinutes: { $gte: 120 } })
```

### Q2: In

How many films are in the categories `Action`, `Comedy` or `Drama`?

```js practice
// hint: `"category.name": { $in: [...] }`.
db.films.countDocuments({ "category.name": { $in: ["Action", "Comedy", "Drama"] } })
```

### Q3: Or

How many films are either 0.99 to rent **or** shorter than 50 minutes?

```js practice
// hint: `$or` with two conditions.
db.films.countDocuments({ $or: [{ rentalRate: 0.99 }, { lengthMinutes: { $lt: 50 } }] })
```

### Q4: Nor

How many films are neither rated `R` nor cost 4.99?

```js practice
// hint: `$nor`.
db.films.countDocuments({ $nor: [{ rating: "R" }, { rentalRate: 4.99 }] })
```

### Q5: Exists

How many films have a `description` field?

```js practice
// hint: `$exists: true`.
db.films.countDocuments({ description: { $exists: true } })
```

### Q6: Regex

How many film titles contain the word `MOON` (as a whole word)?

```js practice
// hint: `/\bMOON\b/`.
db.films.countDocuments({ title: /\bMOON\b/ })
```

### Q7: Array all

How many films have all three of `Trailers`, `Commentaries` and `Deleted Scenes`?

```js practice
// hint: `$all` with three values.
db.films.countDocuments({ specialFeatures: { $all: ["Trailers", "Commentaries", "Deleted Scenes"] } })
```

### Q8: elemMatch

How many customers have a rental from store 2 with a `returnDate` of `null`?

```js practice
// hint: `$elemMatch` on `rentals`.
db.customers.countDocuments({ rentals: { $elemMatch: { storeId: 2, returnDate: null } } })
```

### Q9: expr

How many films have more `specialFeatures` than the number 3?

```js practice
// hint: `$expr` and `$size`.
db.films.countDocuments({ $expr: { $gt: [{ $size: "$specialFeatures" }, 3] } })
```

### Q10: Two methods

Return a pair `[a, b]`: the number of `PG` films longer than 100 minutes counted with `countDocuments`, and with an aggregation `$match` + `$count`.

```js practice
// hint: They must be equal.
[
  db.films.countDocuments({ rating: "PG", lengthMinutes: { $gt: 100 } }),
  db.films.aggregate([{ $match: { rating: "PG", lengthMinutes: { $gt: 100 } } }, { $count: "n" }]).toArray()[0].n
]
```
