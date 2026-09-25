---
title: "Comparison Operators"
order: 0
---

Equality is only the start. Comparison operators let a filter say "greater than", "one of these" or "anything but". They all follow one shape: `{ field: { $operator: value } }`.

## What you'll learn

- `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`
- `$in` and `$nin`
- Ranges, and comparing text and text dates
- How comparison works on arrays and mixed types

## Syntax

```js show
{ field: { $gt: 10 } }
{ field: { $gte: 10, $lt: 20 } }        // a range: both conditions on one field
{ field: { $in: [1, 2, 3] } }
{ field: { $ne: "x" } }
```

## Examples

### Greater than and less than

```js run
[
  db.films.countDocuments({ lengthMinutes: { $gt: 180 } }),
  db.films.countDocuments({ lengthMinutes: { $gte: 180 } }),
  db.films.countDocuments({ lengthMinutes: { $lt: 50 } }),
  db.films.countDocuments({ lengthMinutes: { $lte: 50 } })
]
```

### A range on one field

Put both operators in the same object. Two separate objects for the same field would overwrite each other:

```js run
db.films.countDocuments({ lengthMinutes: { $gte: 100, $lt: 110 } })
```

### $eq and $ne

`{ a: 5 }` is shorthand for `{ a: { $eq: 5 } }`. `$ne` means "not equal", and it also matches documents that lack the field:

```js run
[
  db.films.countDocuments({ rating: { $eq: "PG" } }),
  db.films.countDocuments({ rating: { $ne: "PG" } })
]
```

### $in and $nin

`$in` matches any value in a list, like SQL `IN`. `$nin` is the opposite:

```js run
[
  db.films.countDocuments({ rating: { $in: ["G", "PG"] } }),
  db.films.countDocuments({ rating: { $nin: ["G", "PG"] } })
]
```

### Comparing text

Text compares by binary value, one character at a time:

```js run
db.films.find({ title: { $gte: "ZE", $lt: "ZO" } }, { title: 1, _id: 0 }).sort({ title: 1 })
```

### Comparing text dates

Rental dates in this database are text in `YYYY-MM-DD hh:mm:ss` form. Text comparison works because the biggest unit comes first:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $match: { "rentals.rentalDate": { $gte: "2005-08-01", $lt: "2005-08-02" } } },
  { $count: "rentalsOnAug1" }
])
```

### Comparison on arrays

A comparison on an array field is true if **any** element satisfies it:

```js run
db.films.countDocuments({ "actors.actorId": { $gt: 195 } })
```

### Types matter

A comparison only matches values of the **same type**. Numbers do not match text:

```js run
[db.films.countDocuments({ lengthMinutes: { $gt: "100" } }), db.films.countDocuments({ lengthMinutes: { $gt: 100 } })]
```

## Try it yourself

Count the films with a replacement cost of 20 or more, and the films in categories `Horror`, `Sci-Fi` or `Drama` (with `$in`).

## Watch out

### Two conditions for one field must share an object

`{ len: { $gt: 100 }, len: { $lt: 120 } }` is JavaScript with a repeated key: the second silently replaces the first. Write `{ len: { $gt: 100, $lt: 120 } }`.

### `$ne` and `$nin` include documents without the field

`{ archived: { $ne: true } }` matches documents where `archived` is missing. That is usually what you want, but not always.

### `$in` with one huge list is slow

Thousands of values in `$in` work, but very large lists are better done with a join (`$lookup`) or in chunks.

### Comparing different types never errors

`{ age: { $gt: "20" } }` does not fail on numeric ages; it simply matches nothing. Check the stored type first.

### `null` in `$in` matches missing fields

`{ x: { $in: [null] } }` also matches documents without `x`.

## Interview corner

**"How do you find values between two numbers?"**
`{ field: { $gte: low, $lte: high } }` (or `$lt` for an exclusive upper bound).

**"What does `$ne` match if the field does not exist?"**
The document matches, because a missing field is not equal to the value.

**"What is the difference between `$in` and `$or`?"**
`$in` is a shorthand for several equalities on **one** field. `$or` can combine conditions on different fields.

## Practice

### Warm-up: greater than

How many films have `rentalRate` greater than 2.99?

```js practice
// hint: `{ rentalRate: { $gt: 2.99 } }`.
db.films.countDocuments({ rentalRate: { $gt: 2.99 } })
```

### Core: range and list

How many films are rated `PG-13` or `R` **and** are between 60 and 90 minutes long inclusive?

```js practice
// hint: `$in` for the ratings, `$gte` and `$lte` for the length.
db.films.countDocuments({ rating: { $in: ["PG-13", "R"] }, lengthMinutes: { $gte: 60, $lte: 90 } })
```

### Stretch: not in a list

How many films are **not** in any of the categories `Horror`, `Music` and `Travel`?

```js practice
// hint: `"category.name": { $nin: [...] }`.
db.films.countDocuments({ "category.name": { $nin: ["Horror", "Music", "Travel"] } })
```
