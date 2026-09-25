---
title: "Updates with an Aggregation Pipeline"
order: 0
---

Ordinary update operators set fixed values. Sometimes the new value depends on the **old values of the same document**: "price becomes price plus 10%", "full name is first plus last". Since MongoDB 4.2 an update can be an **aggregation pipeline**, which can read fields and compute.

## What you'll learn

- Passing an array of stages as the update
- `$set` and `$unset` stages that refer to other fields
- Conditional logic with `$cond` and `$switch`
- Converting the text dates of this database into real dates

## Syntax

```js show
db.collection.updateMany(filter, [ { $set: { newField: <expression using "$oldField"> } } ])
```

## Examples

We work on a scratch copy of the films, so the original data stays as it is:

```js run destructive
const lab = db.getSiblingDB("lab_pipe")
db.films.aggregate([{ $project: { title: 1, rentalRate: 1, replacementCost: 1, lengthMinutes: 1, rating: 1 } }, { $out: { db: "lab_pipe", coll: "films" } }]);
lab.films.countDocuments()
```

### A value computed from another field

Add 10 percent to the rental rate, rounded to cents. The update is an **array**:

```js run destructive
lab.films.updateOne({ _id: 1 }, [{ $set: { rentalRate: { $round: [{ $multiply: ["$rentalRate", 1.1] }, 2] } } }])
lab.films.findOne({ _id: 1 }, { title: 1, rentalRate: 1, _id: 0 })
```

### A new field from two fields

```js run destructive
lab.films.updateMany({}, [{ $set: { costPerMinute: { $round: [{ $divide: ["$rentalRate", "$lengthMinutes"] }, 4] } } }])
lab.films.findOne({ _id: 1 }, { title: 1, costPerMinute: 1, _id: 0 })
```

### Conditional values

Label each film by its length:

```js run destructive
lab.films.updateMany({}, [{ $set: { lengthClass: { $switch: { branches: [{ case: { $lt: ["$lengthMinutes", 60] }, then: "short" }, { case: { $lt: ["$lengthMinutes", 120] }, then: "medium" }], default: "long" } } } }])
lab.films.aggregate([{ $group: { _id: "$lengthClass", films: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```

### Several stages in a row

Later stages see the result of earlier ones. Here: compute, then remove the helper field:

```js run destructive
lab.films.updateMany({ rating: "G" }, [
  { $set: { ratio: { $divide: ["$replacementCost", "$rentalRate"] } } },
  { $set: { pricey: { $gt: ["$ratio", 10] } } },
  { $unset: "ratio" }
])
lab.films.countDocuments({ pricey: true })
```

### Fixing text dates into real dates

The rental dates in `customers` are strings. In a scratch copy we can convert them:

```js run destructive
db.customers.aggregate([{ $match: { _id: 1 } }, { $project: { createdAt: 1 } }, { $out: { db: "lab_pipe", coll: "cust" } }]);
lab.cust.updateOne({ _id: 1 }, [{ $set: { createdAt: { $dateFromString: { dateString: "$createdAt", format: "%Y-%m-%d %H:%M:%S" } } } }])
lab.cust.findOne({ _id: 1 })
```

### Swapping and copying fields

The right-hand side reads the **old** values, so a swap works in one stage:

```js run destructive
lab.swap.insertOne({ _id: 1, a: "left", b: "right" });
lab.swap.updateOne({ _id: 1 }, [{ $set: { a: "$b", b: "$a" } }])
lab.swap.findOne({ _id: 1 })
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

In a scratch copy, add a `discounted` field that is `rentalRate` minus 20 percent for `NC-17` films and equal to `rentalRate` for the rest.

## Watch out

### An array is a pipeline, an object is operators

`updateMany(f, { $set: { a: 1 } })` and `updateMany(f, [{ $set: { a: 1 } }])` look alike but are different. In the second, strings starting with `$` are **field references**, not text.

### To store a literal `$` text, use `$literal`

`[{ $set: { note: "$5" } }]` would try to read a field named `5`. Write `{ $literal: "$5" }`.

### Only some stages are allowed

Update pipelines accept `$addFields` (or `$set`), `$project` (or `$unset`) and `$replaceRoot` (or `$replaceWith`). Not `$group`, `$lookup` or `$sort`.

### It is still one document at a time

The pipeline sees one document, not the collection. It cannot compute a total across documents.

## Interview corner

**"How do you update a field based on its current value or other fields?"**
With `$inc`/`$mul` for simple arithmetic, or with an update pipeline (`[ { $set: { f: <expression> } } ]`) for anything more complex.

**"What is the difference between an operator update and a pipeline update?"**
An operator update applies fixed changes. A pipeline update evaluates aggregation expressions per document, so it can use other fields and conditions.

**"How do you convert a text field to a date in place?"**
`updateMany({}, [ { $set: { f: { $dateFromString: { dateString: "$f" } } } } ])`.

## Practice

### Warm-up: a computed field

In a scratch copy of `films`, add `hours` (`lengthMinutes / 60`, rounded to 1 decimal) to film 1 and return it.

```js practice destructive
// hint: `$round` and `$divide` in a `$set` stage.
const lab = db.getSiblingDB("lab_pipe")
db.films.aggregate([{ $match: { _id: 1 } }, { $project: { lengthMinutes: 1 } }, { $out: { db: "lab_pipe", coll: "f" } }]);
lab.f.updateOne({ _id: 1 }, [{ $set: { hours: { $round: [{ $divide: ["$lengthMinutes", 60] }, 1] } } }]);
const d = lab.f.findOne({ _id: 1 })
lab.dropDatabase();
d
```

### Core: conditional

Add `long: true` when `lengthMinutes` is over 120, else `false`, to all copied films, and return how many are `long`.

```js practice destructive
// hint: `$gt` in a `$set`; then `countDocuments({ long: true })`.
const lab = db.getSiblingDB("lab_pipe")
db.films.aggregate([{ $project: { lengthMinutes: 1 } }, { $out: { db: "lab_pipe", coll: "f" } }]);
lab.f.updateMany({}, [{ $set: { long: { $gt: ["$lengthMinutes", 120] } } }]);
const n = lab.f.countDocuments({ long: true })
lab.dropDatabase();
n
```

### Stretch: swap

Insert `{ _id: 1, a: 1, b: 2 }`, swap `a` and `b` in one update, and return the document.

```js practice destructive
// hint: `[{ $set: { a: "$b", b: "$a" } }]`.
const lab = db.getSiblingDB("lab_pipe")
lab.s.insertOne({ _id: 1, a: 1, b: 2 });
lab.s.updateOne({ _id: 1 }, [{ $set: { a: "$b", b: "$a" } }]);
const d = lab.s.findOne({ _id: 1 })
lab.dropDatabase();
d
```
