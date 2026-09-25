---
title: "Field Update Operators"
order: 0
---

The update document is a list of **operators**, each doing one kind of change. This page covers the operators that work on ordinary fields: setting, removing, renaming, counting and clamping values.

## What you'll learn

- `$set`, `$unset`, `$rename`
- `$inc` and `$mul` for arithmetic
- `$min` and `$max` for conditional updates
- `$currentDate` and `$setOnInsert`

## Syntax

```js show
{ $set: { a: 1 } }
{ $unset: { a: "" } }
{ $rename: { old: "new" } }
{ $inc: { n: 5 } }
{ $mul: { price: 1.1 } }
{ $min: { low: 3 } }
{ $max: { high: 9 } }
{ $currentDate: { updatedAt: true } }
```

## Examples

```js run destructive
const lab = db.getSiblingDB("lab_ops")
lab.items.insertMany([
  { _id: 1, name: "pen", qty: 10, price: 2, tmp: "x", old_name: "legacy", low: 5, high: 5 },
  { _id: 2, name: "ink", qty: 3, price: 10, tmp: "y", old_name: "legacy", low: 5, high: 5 }
]);
lab.items.countDocuments()
```

### $set and $unset

`$set` adds or changes a field. `$unset` removes it (the value in the update is ignored):

```js run destructive
lab.items.updateOne({ _id: 1 }, { $set: { colour: "blue" }, $unset: { tmp: "" } })
lab.items.findOne({ _id: 1 })
```

### $rename

```js run destructive
lab.items.updateMany({}, { $rename: { old_name: "legacyName" } })
lab.items.findOne({ _id: 2 })
```

### $inc: add (or subtract)

```js run destructive
lab.items.updateOne({ _id: 1 }, { $inc: { qty: -4, sold: 4 } })
lab.items.findOne({ _id: 1 }, { qty: 1, sold: 1, _id: 0 })
```

`$inc` creates a missing field, treating it as 0, so `sold` appeared.

### $mul: multiply

```js run destructive
lab.items.updateOne({ _id: 2 }, { $mul: { price: 1.5 } })
lab.items.findOne({ _id: 2 }, { price: 1, _id: 0 })
```

### $min and $max

`$min` sets the field only if the new value is **smaller**, `$max` only if it is **larger**. Perfect for tracking extremes:

```js run destructive
lab.items.updateOne({ _id: 1 }, { $min: { low: 3 }, $max: { high: 3 } })
lab.items.findOne({ _id: 1 }, { low: 1, high: 1, _id: 0 })
```

```js run destructive
lab.items.updateOne({ _id: 1 }, { $min: { low: 4 }, $max: { high: 8 } })
lab.items.findOne({ _id: 1 }, { low: 1, high: 1, _id: 0 })
```

### $currentDate

Sets the field to the server's current time, as a real date:

```js run destructive
lab.items.updateOne({ _id: 1 }, { $currentDate: { updatedAt: true } })
typeof lab.items.findOne({ _id: 1 }).updatedAt
```

### Several operators, one atomic update

All operators in one update document are applied together to each document:

```js run destructive
lab.items.updateOne({ _id: 2 }, { $inc: { qty: 1 }, $set: { restocked: true }, $rename: { name: "title" } })
lab.items.findOne({ _id: 2 }, { title: 1, qty: 1, restocked: 1, _id: 0 })
```

### An operator conflict is an error

Two operators may not touch the same field in one update:

```js run destructive error
lab.items.updateOne({ _id: 1 }, { $set: { qty: 1 }, $inc: { qty: 1 } })
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

In a scratch collection, keep a document with the highest and lowest score ever seen, updated with `$min` and `$max` each time a new score arrives.

## Watch out

### `$inc` on a non-number fails

Incrementing a string or a `null` raises an error. Make sure the field holds a number.

### `$inc` and `$mul` with decimals

Floating-point arithmetic applies: `0.1 + 0.2` is not exactly `0.3`. Use `Decimal128` or whole cents for money.

### `$unset` and `null` are different

`$unset` removes the field. `$set: { f: null }` keeps it with the value `null`.

### `$rename` moves the whole value

It does not copy. If the target field already exists, it is overwritten. It cannot rename a field inside an array element.

### `$set` on a path that does not exist creates it

Setting `"a.b.c"` creates the embedded documents `a` and `b` if needed. A typo therefore creates a new field silently.

## Interview corner

**"How do you increment a counter atomically?"**
`updateOne(filter, { $inc: { counter: 1 } })`. It is a single atomic operation on the document.

**"What is the difference between `$unset` and setting a field to `null`?"**
`$unset` removes the field from the document. `null` leaves the field present with a null value.

**"What do `$min` and `$max` do?"**
They update a field only if the given value is lower (`$min`) or higher (`$max`) than the current one. They are handy for tracking a minimum or maximum without reading first.

## Practice

### Warm-up: increment

Insert `{ _id: 1, n: 5 }`, add 3 to `n`, and return `n`.

```js practice destructive
// hint: `$inc`.
const lab = db.getSiblingDB("lab_ops")
lab.t.insertOne({ _id: 1, n: 5 });
lab.t.updateOne({ _id: 1 }, { $inc: { n: 3 } });
const n = lab.t.findOne({ _id: 1 }).n
lab.dropDatabase();
n
```

### Core: rename and unset

Insert `{ _id: 1, a: 1, junk: 2 }`, rename `a` to `b` and remove `junk`, and return the document.

```js practice destructive
// hint: `$rename` and `$unset` in one update.
const lab = db.getSiblingDB("lab_ops")
lab.t.insertOne({ _id: 1, a: 1, junk: 2 });
lab.t.updateOne({ _id: 1 }, { $rename: { a: "b" }, $unset: { junk: "" } });
const d = lab.t.findOne({ _id: 1 })
lab.dropDatabase();
d
```

### Stretch: min and max

Insert `{ _id: 1, low: 10, high: 10 }`, then apply the readings 7, 12 and 9 with `$min` and `$max`, and return the document.

```js practice destructive
// hint: One update per reading, with both operators.
const lab = db.getSiblingDB("lab_ops")
lab.t.insertOne({ _id: 1, low: 10, high: 10 });
for (const x of [7, 12, 9]) lab.t.updateOne({ _id: 1 }, { $min: { low: x }, $max: { high: x } });
const d = lab.t.findOne({ _id: 1 })
lab.dropDatabase();
d
```
