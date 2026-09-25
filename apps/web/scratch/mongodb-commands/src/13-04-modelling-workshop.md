---
title: "Modelling Workshop: Redesign the Rentals"
order: 0
---

The DVD Rental database embeds every rental and payment inside the customer. That works for 599 customers with about 27 rentals each, and breaks when a customer can have a million. In this workshop you redesign the model step by step and check that the new model answers the same questions.

## What you'll learn

- Splitting an embedded array into its own collection
- Choosing keys and indexes for the new collection
- Verifying that the redesign answers the same questions
- Deciding what to duplicate

## Syntax

```js show
db.customers.aggregate([ { $unwind: "$rentals" }, { $replaceWith: ... }, { $merge: ... } ])
```

## Examples

### Step 1: the questions

The model must answer:

1. Show a customer with their last 5 rentals and film titles.
2. Total paid by a customer.
3. Unreturned rentals per store.
4. Revenue per month.

### Step 2: the new collection

One document per rental, with the customer id, the film id, a copy of the film title (extended reference) and the payment total:

```js run destructive
const lab = db.getSiblingDB("lab_redesign")
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $replaceWith: {
      _id: "$rentals.rentalId",
      customerId: "$_id",
      filmId: "$rentals.filmId",
      filmTitle: { $arrayElemAt: ["$f.title", 0] },
      storeId: "$rentals.storeId",
      rentalDate: "$rentals.rentalDate",
      returnDate: "$rentals.returnDate",
      paid: { $round: [{ $sum: "$rentals.payments.amount" }, 2] },
      paidAt: { $min: "$rentals.payments.paymentDate" }
  } },
  { $out: { db: "lab_redesign", coll: "rentals" } }
]);
lab.rentals.countDocuments()
```

16,044 rentals moved into their own collection.

### Step 3: the indexes

The questions tell us which:

```js run destructive
lab.rentals.createIndex({ customerId: 1, rentalDate: -1 });
lab.rentals.createIndex({ storeId: 1, returnDate: 1 });
lab.rentals.createIndex({ paidAt: 1 });
lab.rentals.getIndexes().map((i) => i.name)
```

### Question 1: a customer's last 5 rentals

One indexed query, no unwind and no join:

```js run destructive
lab.rentals.find({ customerId: 1 }, { _id: 1, filmTitle: 1, rentalDate: 1 }).sort({ rentalDate: -1 }).limit(5)
```

### Question 2: total paid by a customer

```js run destructive
lab.rentals.aggregate([{ $match: { customerId: 1 } }, { $group: { _id: "$customerId", total: { $sum: "$paid" } } }, { $project: { total: { $round: ["$total", 2] } } }])
```

The old model gave 118.68 for customer 1 in module 10. It matches.

### Question 3: unreturned rentals per store

```js run destructive
lab.rentals.aggregate([{ $match: { returnDate: null } }, { $group: { _id: "$storeId", open: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```

Same as the earlier result: 92 and 91.

### Question 4: revenue per month

```js run destructive
lab.rentals.aggregate([{ $group: { _id: { $substrCP: ["$paidAt", 0, 7] }, revenue: { $sum: "$paid" } } }, { $project: { revenue: { $round: ["$revenue", 2] } } }, { $sort: { _id: 1 } }, { $limit: 3 }])
```

### Verify: totals agree with the old model

```js run destructive
const oldTotal = db.customers.aggregate([{ $unwind: "$rentals" }, { $unwind: "$rentals.payments" }, { $group: { _id: null, t: { $sum: "$rentals.payments.amount" } } }]).toArray()[0].t;
const newTotal = lab.rentals.aggregate([{ $group: { _id: null, t: { $sum: "$paid" } } }]).toArray()[0].t;
[Math.round(oldTotal * 100) / 100, Math.round(newTotal * 100) / 100]
```

### What we gave up

The customer document no longer has its rentals, so "show a customer with all their data" needs two queries (or a `$lookup`). Renaming a film would need to update `filmTitle` copies. In return: no size limit, small documents, precise indexes.

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Add a `payments` collection with one document per payment (so a rental can have several) and decide whether `paid` on the rental is still worth keeping.

## Watch out

### Do not throw away the old data until you verified the new

Compare totals and counts (as above) before removing anything.

### Copying fields means owning the updates

`filmTitle` is safe because titles rarely change. Copying something volatile (a price) needs a rule for keeping it current.

### One index per question

Each question above has its own index. If two questions could share an index, use one.

### Migrate with the application still running

Real migrations write to both models for a while (dual writes), backfill, switch reads, and only then stop the old one.

## Interview corner

**"How do you decide between embedding and referencing?"**
Look at read and write patterns, growth (bounded or not), and whether the child is used on its own. Embed small bounded data read together; reference large or unbounded data.

**"How do you migrate to a new model without downtime?"**
Dual-write to old and new, backfill history in batches, verify counts and totals, switch reads to the new model, then retire the old.

## Practice

### Warm-up: count the moved rentals

How many rentals would the new `rentals` collection have? Return the number.

```js practice
// hint: `$sum` of `$size` of the rentals arrays.
db.customers.aggregate([{ $group: { _id: null, n: { $sum: { $size: "$rentals" } } } }]).toArray()[0].n
```

### Core: the payment total of a customer

From the old model, the total paid by customer 2, rounded to 2 decimals.

```js practice
// hint: Unwind twice and sum.
db.customers.aggregate([
  { $match: { _id: 2 } }, { $unwind: "$rentals" }, { $unwind: "$rentals.payments" },
  { $group: { _id: null, t: { $sum: "$rentals.payments.amount" } } }, { $project: { _id: 0, total: { $round: ["$t", 2] } } }
])
```

### Stretch: check the redesign

Build the new `rentals` collection only for customer 2, and return its `paid` total rounded to 2 decimals (it must equal the previous answer).

```js practice destructive
// hint: `$match` the customer, `$unwind`, `$replaceWith`, `$out`, then `$group`.
const lab = db.getSiblingDB("lab_redesign")
db.customers.aggregate([
  { $match: { _id: 2 } }, { $unwind: "$rentals" },
  { $replaceWith: { _id: "$rentals.rentalId", paid: { $sum: "$rentals.payments.amount" } } },
  { $out: { db: "lab_redesign", coll: "r2" } }
]);
const t = Math.round(lab.r2.aggregate([{ $group: { _id: null, t: { $sum: "$paid" } } }]).toArray()[0].t * 100) / 100
lab.dropDatabase();
t
```
