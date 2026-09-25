---
title: "$expr, $mod and Other Evaluation Operators"
order: 0
---

Ordinary filters compare a field with a **constant**. Sometimes you need to compare a field with **another field**, do arithmetic, or test a remainder. The evaluation operators do that.

## What you'll learn

- `$expr` to use aggregation expressions inside `find`
- Comparing two fields of the same document
- `$mod` for remainders
- Why `$where` exists and why to avoid it

## Syntax

```js show
{ $expr: { $gt: ["$fieldA", "$fieldB"] } }
{ field: { $mod: [divisor, remainder] } }
{ $jsonSchema: { ... } }
```

## Examples

### Comparing two fields

Films whose replacement cost is more than 10 times their rental rate. There is no constant to write here, so compare the fields with `$expr`. A field is written `"$name"` inside `$expr`:

```js run
db.films.countDocuments({ $expr: { $gt: ["$replacementCost", { $multiply: ["$rentalRate", 10] }] } })
```

### Arithmetic in the filter

Films whose length in hours is more than 2.5:

```js run
db.films.countDocuments({ $expr: { $gt: [{ $divide: ["$lengthMinutes", 60] }, 2.5] } })
```

### Array length as a range

`$size` in a plain filter is exact. With `$expr` you can compare:

```js run
db.films.countDocuments({ $expr: { $gte: [{ $size: "$actors" }, 10] } })
```

### Combining $expr with normal conditions

```js run
db.films.countDocuments({ rating: "G", $expr: { $lt: [{ $size: "$specialFeatures" }, 2] } })
```

### Customers with many rentals

The same idea works on the customers collection:

```js run
db.customers.countDocuments({ $expr: { $gt: [{ $size: "$rentals" }, 40] } })
```

### $mod: remainders

`{ field: { $mod: [4, 0] } }` matches numbers divisible by 4:

```js run
[
  db.films.countDocuments({ lengthMinutes: { $mod: [10, 0] } }),
  db.films.countDocuments({ rentalDurationDays: { $mod: [2, 1] } })
]
```

### Type conversion inside $expr

The rental dates are text. `$substr` and `$toInt` can look at parts of them:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $match: { $expr: { $eq: [{ $substr: ["$rentals.rentalDate", 5, 2] }, "08"] } } },
  { $count: "rentedInAugust" }
])
```

### $where: JavaScript in the query

`$where` runs a JavaScript function on every document. it works, but it is slow, cannot use indexes and is switched off on some hosted services:

```js run
db.films.find({ $where: "this.lengthMinutes > 180 && this.rating === 'G'" }).toArray().length
```

(`countDocuments` refuses `$where`, so this uses `find`.)

The same query without JavaScript is faster, safer and can use indexes:

```js run
db.films.countDocuments({ lengthMinutes: { $gt: 180 }, rating: "G" })
```

## Try it yourself

Find the films where the number of special features is greater than 3. Then find the films whose title length is greater than 20 characters (use `$strLenCP`).

## Watch out

### `$expr` does not use indexes for every comparison

Range comparisons of a field against a **constant** can use an index. Comparisons between two fields cannot. Prefer plain filters when one side is a constant.

### Field paths are `"$field"` inside `$expr`

In a normal filter `"field"` is a name. Inside `$expr` `"$field"` is the value. Mixing them up gives wrong results with no error.

### `$where` is a risk

It executes JavaScript from a string. If any of that string comes from user input, it can be abused. Avoid it, and turn it off (`--noscripting`) when you can.

### `$mod` needs integers

`$mod: [4, 0]` on a decimal value truncates before it divides.

## Interview corner

**"How do you compare two fields of the same document?"**
With `$expr`: `{ $expr: { $gt: ["$a", "$b"] } }`.

**"Why avoid `$where`?"**
It runs JavaScript per document, cannot use indexes, is slow, and is a security risk with untrusted input. Almost everything it does can be written with `$expr` or normal operators.

**"How would you find arrays with more than N elements?"**
`{ $expr: { $gt: [{ $size: "$arr" }, N] } }`.

## Practice

### Warm-up: two fields

How many films have a `replacementCost` greater than 25 and a `rentalRate` of 0.99? Use plain operators.

```js practice
// hint: Two conditions on two fields.
db.films.countDocuments({ replacementCost: { $gt: 25 }, rentalRate: 0.99 })
```

### Core: $expr with size

How many films have more than 8 actors?

```js practice
// hint: `$expr` with `$gt` and `$size`.
db.films.countDocuments({ $expr: { $gt: [{ $size: "$actors" }, 8] } })
```

### Stretch: computed condition

How many films have `rentalRate` times `rentalDurationDays` greater than `replacementCost`?

```js practice
// hint: `$multiply` inside `$gt` inside `$expr`.
db.films.countDocuments({ $expr: { $gt: [{ $multiply: ["$rentalRate", "$rentalDurationDays"] }, "$replacementCost"] } })
```
