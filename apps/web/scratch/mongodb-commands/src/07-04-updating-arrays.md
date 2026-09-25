---
title: "Updating Elements Inside Arrays"
order: 0
---

Changing one element of an array, without rewriting the whole thing, needs special path syntax. MongoDB offers three: the **positional** `$`, the **all positional** `$[]`, and the **filtered positional** `$[name]` with `arrayFilters`.

## What you'll learn

- Updating a known position with `array.0`
- `$` for the first element that matched the query
- `$[]` for every element
- `$[name]` with `arrayFilters` for elements that meet a condition

## Syntax

```js show
{ $set: { "items.0.qty": 5 } }                       // by position
{ $set: { "items.$.qty": 5 } }                       // first element matched by the filter
{ $set: { "items.$[].qty": 5 } }                     // every element
{ $set: { "items.$[x].qty": 5 } }, { arrayFilters: [ { "x.qty": { $lt: 5 } } ] }
```

## Examples

A scratch collection of orders, each with an array of lines:

```js run destructive
const lab = db.getSiblingDB("lab_arrays")
lab.orders.insertMany([
  { _id: 1, lines: [{ sku: "pen", qty: 2 }, { sku: "ink", qty: 10 }, { sku: "pad", qty: 1 }] },
  { _id: 2, lines: [{ sku: "pen", qty: 7 }, { sku: "pad", qty: 3 }] }
]);
lab.orders.countDocuments()
```

### By position

```js run destructive
lab.orders.updateOne({ _id: 1 }, { $set: { "lines.0.qty": 3 } })
lab.orders.findOne({ _id: 1 }).lines
```

### The positional operator $

`$` stands for the **first array element that matched the query filter**. The array field must appear in the filter:

```js run destructive
lab.orders.updateOne({ _id: 1, "lines.sku": "ink" }, { $set: { "lines.$.qty": 12 } })
lab.orders.findOne({ _id: 1 }).lines
```

### $[] : every element

```js run destructive
lab.orders.updateOne({ _id: 2 }, { $inc: { "lines.$[].qty": 100 } })
lab.orders.findOne({ _id: 2 }).lines
```

### $[name] with arrayFilters: the elements that qualify

Add a note to every line whose quantity is below 5:

```js run destructive
lab.orders.updateMany({}, { $set: { "lines.$[low].note": "low stock" } }, { arrayFilters: [{ "low.qty": { $lt: 5 } }] })
lab.orders.find({}, { lines: 1 }).sort({ _id: 1 }).toArray().map((o) => o.lines.map((l) => l.sku + ":" + (l.note || "-")))
```

### Updating the elements of a nested array

On the customers collection each rental has a `payments` array. Doubling every payment amount in a scratch copy shows two levels of `$[]`:

```js run destructive
db.customers.aggregate([{ $match: { _id: 1 } }, { $project: { rentals: { $slice: ["$rentals", 2] } } }, { $out: { db: "lab_arrays", coll: "cust" } }]);
lab.cust.updateOne({ _id: 1 }, { $mul: { "rentals.$[].payments.$[].amount": 2 } })
lab.cust.findOne({ _id: 1 }).rentals.map((r) => r.payments.map((p) => p.amount))
```

### Removing a field from every element

```js run destructive
lab.orders.updateMany({}, { $unset: { "lines.$[].note": "" } })
lab.orders.countDocuments({ "lines.note": { $exists: true } })
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

In a scratch orders collection, double the `qty` of only the `pen` lines with `arrayFilters`, in all orders at once.

## Watch out

### `$` updates only the first match

If several elements match the query, only the first is changed. Use `$[name]` with `arrayFilters` to change all matching elements.

### The array must be in the filter for `$`

`updateOne({ _id: 1 }, { $set: { "lines.$.qty": 1 } })` fails: there is no matched element to point at.

### `arrayFilters` names must match

The identifier in `$[low]` must appear in `arrayFilters` as `low.<field>`. A missing or unused name is an error.

### Position numbers go stale

`lines.0` means "whatever is first now". If another client reorders or removes elements, position 0 may be a different element by the time your update runs. Prefer matching on a value.

### Updating a missing index pads with nulls

`{ $set: { "arr.5": 1 } }` on a 2-element array fills positions 2 to 4 with `null`.

## Interview corner

**"How do you update one element of an array?"**
By position (`"arr.0.field"`), with the positional `$` operator after matching the array in the filter, or with `$[name]` and `arrayFilters` to pick by condition.

**"What is the difference between `$` and `$[]`?"**
`$` targets the first element that matched the filter. `$[]` targets every element.

**"What are `arrayFilters` for?"**
They define the condition for `$[name]`, so you can update only the elements that satisfy it, across several documents at once.

## Practice

### Warm-up: by position

In a scratch orders collection with `lines: [{ qty: 1 }, { qty: 2 }]`, set the qty of the second line to 20 and return the array.

```js practice destructive
// hint: `"lines.1.qty"`.
const lab = db.getSiblingDB("lab_arrays")
lab.o.insertOne({ _id: 1, lines: [{ qty: 1 }, { qty: 2 }] });
lab.o.updateOne({ _id: 1 }, { $set: { "lines.1.qty": 20 } });
const r = lab.o.findOne({ _id: 1 }).lines
lab.dropDatabase();
r
```

### Core: every element

Add 5 to the `qty` of every line.

```js practice destructive
// hint: `"lines.$[].qty"`.
const lab = db.getSiblingDB("lab_arrays")
lab.o.insertOne({ _id: 1, lines: [{ qty: 1 }, { qty: 2 }] });
lab.o.updateOne({ _id: 1 }, { $inc: { "lines.$[].qty": 5 } });
const r = lab.o.findOne({ _id: 1 }).lines
lab.dropDatabase();
r
```

### Stretch: only some elements

Set `flag: true` on lines with `qty` greater than 1, leaving the others untouched.

```js practice destructive
// hint: `$[big]` and `arrayFilters: [{ "big.qty": { $gt: 1 } }]`.
const lab = db.getSiblingDB("lab_arrays")
lab.o.insertOne({ _id: 1, lines: [{ qty: 1 }, { qty: 2 }, { qty: 3 }] });
lab.o.updateOne({ _id: 1 }, { $set: { "lines.$[big].flag": true } }, { arrayFilters: [{ "big.qty": { $gt: 1 } }] });
const r = lab.o.findOne({ _id: 1 }).lines
lab.dropDatabase();
r
```
