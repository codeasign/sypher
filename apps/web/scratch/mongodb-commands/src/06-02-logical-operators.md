---
title: "Logical Operators: $and, $or, $nor, $not"
order: 0
---

Conditions in one filter document are joined with AND. When you need OR, negation, or the same operator twice, you use the logical operators. They take an **array of filters**, so conditions can be as complex as you like.

## What you'll learn

- Implicit AND and explicit `$and`
- `$or` for alternatives
- `$nor` and `$not` for negation
- Combining them, and reading nested conditions

## Syntax

```js show
{ $or: [ { a: 1 }, { b: 2 } ] }
{ $and: [ { a: { $gt: 1 } }, { a: { $lt: 5 } } ] }
{ $nor: [ { a: 1 }, { b: 2 } ] }
{ field: { $not: { $gt: 5 } } }
```

## Examples

### Implicit AND

Listing several fields already means AND:

```js run
db.films.countDocuments({ rating: "PG", lengthMinutes: { $lt: 60 } })
```

### $or

Films that are either very short or very long:

```js run
db.films.countDocuments({ $or: [{ lengthMinutes: { $lt: 50 } }, { lengthMinutes: { $gt: 180 } }] })
```

### AND with OR

Rated `G`, **and** either short or cheap. Each level is a separate object:

```js run
db.films.countDocuments({
  rating: "G",
  $or: [{ lengthMinutes: { $lt: 50 } }, { rentalRate: 0.99 }]
})
```

### $and when you need the same key twice

The same field name cannot appear twice in one object, and neither can the same operator. `$and` solves both:

```js run
db.films.countDocuments({
  $and: [
    { "actors.lastName": "GUINESS" },
    { "actors.lastName": "CHASE" }
  ]
})
```

This finds films that have an actor named GUINESS **and** an actor named CHASE.

### $nor

`$nor` matches documents where **none** of the conditions is true:

```js run
db.films.countDocuments({ $nor: [{ rating: "G" }, { rating: "PG" }, { lengthMinutes: { $gt: 100 } }] })
```

### $not

`$not` negates an **operator expression** on one field:

```js run
[
  db.films.countDocuments({ lengthMinutes: { $not: { $gt: 100 } } }),
  db.films.countDocuments({ lengthMinutes: { $lte: 100 } })
]
```

The two counts agree here. They can differ when the field is missing or has a different type, because `$not` also matches those.

### De Morgan: rewriting a negation

"Not (G or PG)" is the same as "not G and not PG":

```js run
[
  db.films.countDocuments({ $nor: [{ rating: "G" }, { rating: "PG" }] }),
  db.films.countDocuments({ rating: { $nin: ["G", "PG"] } })
]
```

## Try it yourself

Count the films that are `R` and either longer than 170 minutes or costlier than 25 to replace. Then count the ones that are neither `R` nor `NC-17`.

## Watch out

### `$or` needs an array

`{ $or: { a: 1 } }` is an error. It must be `[ { a: 1 } ]`, even with a single condition.

### Indexes and `$or`

An `$or` can use indexes only if **every** branch has an index it can use. One unindexed branch makes the whole query scan.

### `$not` is not `$ne`

`$not` inverts a condition and matches missing fields; `$ne` compares one value. They are not interchangeable.

### Precedence is explicit

There is no operator precedence to memorise. The nesting of the objects **is** the grouping.

## Interview corner

**"How do you write OR in MongoDB?"**
With `$or` and an array of filter documents. For OR over several values of one field, `$in` is simpler and faster.

**"When do you need an explicit `$and`?"**
When the same field or the same operator must appear twice, since a filter document cannot repeat a key.

**"What is the difference between `$nor` and `$not`?"**
`$nor` takes an array of full filters and matches when none holds. `$not` negates one operator expression on a single field.

## Practice

### Warm-up: OR

How many films are rated `G` or `R`, using `$or`?

```js practice
// hint: `$or: [{ rating: "G" }, { rating: "R" }]`.
db.films.countDocuments({ $or: [{ rating: "G" }, { rating: "R" }] })
```

### Core: AND with OR

How many films cost 0.99 **and** are either rated `NC-17` or longer than 170 minutes?

```js practice
// hint: Put `rentalRate` next to a `$or`.
db.films.countDocuments({ rentalRate: 0.99, $or: [{ rating: "NC-17" }, { lengthMinutes: { $gt: 170 } }] })
```

### Stretch: two actors

How many films feature both an actor with last name `WAHLBERG` and one with last name `NOLTE`?

```js practice
// hint: `$and` with two `actors.lastName` conditions.
db.films.countDocuments({ $and: [{ "actors.lastName": "WAHLBERG" }, { "actors.lastName": "NOLTE" }] })
```
