---
title: "Final Project: Sypher DVD Rentals Analyst"
order: 0
---

Time to use everything. In this project you are the new data analyst at **Sypher DVD Rentals**, a small chain with two stores. The owner has ten questions, and the answers must come from the MongoDB database you have been exploring.

There is no lesson to read and no hand-holding. For each question you get the question in plain business language, the skills it involves, and **what your result must look like**. Your job is to write the pipeline.

## How to work

1. Make sure your lab is running (*Set Up Your Lab*) and connect to the DVD Rental database.
2. Do the questions in any order, but try each before you look at a hint.
3. For each question, run your pipeline and compare with the **Expected result**: same fields, same order, same first documents, same values.
4. If your numbers differ, run the pipeline one stage at a time (add the stages one by one) and find where it goes wrong. That is the real skill.
5. When you have tried all ten, do the stretch goals, then read the solutions.

## The data

Three collections: `films` (with the cast embedded), `customers` (with rentals and payments embedded) and `stores` (with staff and inventory embedded). Dates are text in `YYYY-MM-DD hh:mm:ss` form; an unreturned rental has `returnDate: null`.

## The ten questions

### Question 1: Which store earns the most?

Management wants to know how much money each store has taken in. Show each store (`_id`) and its total revenue (`revenue`, rounded to 2 decimals), highest first. (A payment belongs to the store of the rental it pays for.)

Skills you need: `$unwind`, `$group`, `$sum`, `$round` (modules 10.1 to 10.4).

<details>
<summary>Hint: where to look</summary>

Payments live inside rentals, which live inside customers: unwind twice.

</details>

```js expect lines=12
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: "$rentals.storeId", revenue: { $sum: "$rentals.payments.amount" } } },
  { $project: { revenue: { $round: ["$revenue", 2] } } },
  { $sort: { revenue: -1, _id: 1 } }
])
```

### Question 2: Who are our five best customers?

Show the five customers who have paid the most: their `_id`, full name as `name`, and `total_spent` (rounded to 2 decimals). Break ties by `_id`.

Skills you need: `$reduce` or `$unwind`, `$concat`, `$sort`, `$limit` (modules 10.3, 10.10, 10.11).

<details>
<summary>Hint: where to look</summary>

You can total the payments inside each customer document with `$reduce`, without unwinding.

</details>

```js expect lines=20
db.customers.aggregate([
  { $project: {
      name: { $concat: ["$name.first", " ", "$name.last"] },
      total_spent: { $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } }
  } },
  { $project: { name: 1, total_spent: { $round: ["$total_spent", 2] } } },
  { $sort: { total_spent: -1, _id: 1 } },
  { $limit: 5 }
])
```

### Question 3: Which film categories make the most money?

Show the five categories that have brought in the most revenue, with the category name as `_id` and its `revenue` (rounded to 2 decimals). Break ties by name.

Skills you need: `$lookup`, `$unwind`, `$group` (modules 10.4, 10.5).

<details>
<summary>Hint: where to look</summary>

A payment belongs to a rental, which points at a film through `filmId`. The film knows its category.

</details>

```js expect lines=20
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { "category.name": 1 } }] } },
  { $unwind: "$f" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: "$f.category.name", revenue: { $sum: "$rentals.payments.amount" } } },
  { $project: { revenue: { $round: ["$revenue", 2] } } },
  { $sort: { revenue: -1, _id: 1 } },
  { $limit: 5 }
])
```

### Question 4: Which films have never been rented?

List the films that no customer has ever rented: their `_id` and `title`, alphabetical by title. Show the first ten only, and also tell how many there are in total.

Skills you need: anti-join with `$lookup`, `$facet` (modules 10.5, 10.8, 11.6).

<details>
<summary>Hint: where to look</summary>

A film is never rented if the customers collection has no rental with that `filmId`. The index on `rentals.filmId` makes the lookup cheap.

</details>

```js expect lines=30
db.films.aggregate([
  { $lookup: { from: "customers", localField: "_id", foreignField: "rentals.filmId", as: "renters", pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }] } },
  { $match: { renters: { $size: 0 } } },
  { $facet: {
      total: [{ $count: "n" }],
      firstTen: [{ $sort: { title: 1 } }, { $limit: 10 }, { $project: { title: 1 } }]
  } }
])
```

### Question 5: Which month was the busiest?

Count the rentals per month (`YYYY-MM`) and show all months, busiest first, as `_id` and `rentals`.

Skills you need: `$substrCP` on text dates, `$group`, `$sort` (modules 10.10, 11.5).

<details>
<summary>Hint: where to look</summary>

The dates are text like "2005-05-25 11:30:37", so the first 7 characters are the month.

</details>

```js expect lines=12
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: { $substrCP: ["$rentals.rentalDate", 0, 7] }, rentals: { $sum: 1 } } },
  { $sort: { rentals: -1, _id: 1 } }
])
```

### Question 6: Who has kept a film the longest without returning it?

Among the rentals that have not been returned, show the five oldest: the `rentalId`, the customer's full name as `customer`, the film `title` and the `rentalDate`. Oldest first, ties by `rentalId`.

Skills you need: `$unwind`, `$match` on null, `$lookup` (modules 6.3, 10.4, 10.5).

<details>
<summary>Hint: where to look</summary>

A missing return is stored as `null`, and text dates sort correctly.

</details>

```js expect lines=45
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $match: { "rentals.returnDate": null } },
  { $sort: { "rentals.rentalDate": 1, "rentals.rentalId": 1 } },
  { $limit: 5 },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $project: { _id: 0, rentalId: "$rentals.rentalId", customer: { $concat: ["$name.first", " ", "$name.last"] }, title: { $arrayElemAt: ["$f.title", 0] }, rentalDate: "$rentals.rentalDate" } }
])
```

### Question 7: What are the top three films of each store?

For each store show its three most rented films: `store`, `title` and `rentals`. Break ties by the film `_id` (lower first). Order by store, then by rentals descending.

Skills you need: `$group`, `$setWindowFields` with `$documentNumber`, `$lookup` (modules 10.3, 10.9, 11.1).

<details>
<summary>Hint: where to look</summary>

Count rentals per (store, film), number the films inside each store, keep the first three, and join the titles last.

</details>

```js expect lines=30
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: { store: "$rentals.storeId", film: "$rentals.filmId" }, rentals: { $sum: 1 } } },
  { $set: { key: { $subtract: [{ $multiply: ["$rentals", 100000] }, "$_id.film"] } } },
  { $setWindowFields: { partitionBy: "$_id.store", sortBy: { key: -1 }, output: { n: { $documentNumber: {} } } } },
  { $match: { n: { $lte: 3 } } },
  { $lookup: { from: "films", localField: "_id.film", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $project: { _id: 0, store: "$_id.store", title: { $arrayElemAt: ["$f.title", 0] }, rentals: 1, n: 1 } },
  { $sort: { store: 1, n: 1 } },
  { $project: { store: 1, title: 1, rentals: 1 } }
])
```

### Question 8: Which actors appear in the most films?

Show the five actors with the most films: `_id` (the actor id), full name as `name` and `films`. Ties by actor id.

Skills you need: `$unwind`, `$group`, `$concat` (modules 10.4, 11.6).

<details>
<summary>Hint: where to look</summary>

The cast is an array inside each film.

</details>

```js expect lines=20
db.films.aggregate([
  { $unwind: "$actors" },
  { $group: { _id: "$actors.actorId", name: { $first: { $concat: ["$actors.firstName", " ", "$actors.lastName"] } }, films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } },
  { $limit: 5 }
])
```

### Question 9: How long do customers keep a film?

For each rating, show the average number of days between rental and return (only returned rentals), rounded to 1 decimal, as `avgDays`. Order by rating.

Skills you need: date conversion, `$subtract`, `$lookup`, `$group` (modules 10.5, 10.10, 11.5).

<details>
<summary>Hint: where to look</summary>

Convert both text dates with `$dateFromString` before you subtract.

</details>

```js expect lines=20
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $match: { "rentals.returnDate": { $ne: null } } },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { rating: 1 } }] } },
  { $project: { rating: { $arrayElemAt: ["$f.rating", 0] }, days: { $divide: [{ $subtract: [{ $dateFromString: { dateString: "$rentals.returnDate" } }, { $dateFromString: { dateString: "$rentals.rentalDate" } }] }, 86400000] } } },
  { $group: { _id: "$rating", avgDays: { $avg: "$days" } } },
  { $project: { avgDays: { $round: ["$avgDays", 1] } } },
  { $sort: { _id: 1 } }
])
```

### Question 10: How many customers still have a film out?

Return how many customers have at least one unreturned rental, and what percentage of all customers that is (rounded to 1 decimal). A single document with `withOpenRental`, `customers` and `pct`.

Skills you need: `$elemMatch`, `$facet`, arithmetic (modules 6.5, 10.7, 11.3).

<details>
<summary>Hint: where to look</summary>

A customer has a film out when some element of `rentals` has `returnDate: null`.

</details>

```js expect lines=12
db.customers.aggregate([
  { $facet: {
      open: [{ $match: { rentals: { $elemMatch: { returnDate: null } } } }, { $count: "n" }],
      all: [{ $count: "n" }]
  } },
  { $project: { _id: 0, withOpenRental: { $arrayElemAt: ["$open.n", 0] }, customers: { $arrayElemAt: ["$all.n", 0] } } },
  { $set: { pct: { $round: [{ $multiply: [{ $divide: ["$withOpenRental", "$customers"] }, 100] }, 1] } } }
])
```

## Stretch goals

1. **Make the slowest one fast.** Questions 3 and 5 unwind every rental. Create a scratch collection with one document per rental (module 13.4), add the indexes a question needs, and compare `explain("executionStats")` before and after.
2. **Make it reusable.** Turn question 1 into a **view** and question 2 into a small JavaScript function that takes a number of customers.
3. **Back it up.** Dump the `customers` collection, restore it into a different database, and compare the counts (module 15.4).
4. **Explain it out loud.** Pick question 7 and explain, stage by stage, what each part of the pipeline does and why the tie-breaker is there. If you can explain it, you understand it.

## When you are done

Read *Project Solutions*. Compare your pipelines with the model answers. Different is fine, as long as the result matches.
