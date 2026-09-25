---
title: "Interview Set: Twelve Mixed Questions"
order: 0
---

Twelve questions in the style of a real MongoDB interview, mixing everything from modules 5 to 10. Try each one before opening the solution. A good answer is not only correct: it explains its choice and mentions the edge cases.

## What you'll learn

- Recognising which tool a question needs
- Explaining trade-offs while you answer
- Verifying an answer a second way

## Syntax

```js show
db.collection.find(filter, projection).sort(order).limit(n)
db.collection.aggregate([ { $match: ... }, { $group: ... }, { $sort: ... } ])
```

## Examples

### How to answer in an interview

Say the plan first ("I will filter, then group, then sort"), write the pipeline, check it on a small case, then name one edge case (ties, nulls, empty result). Here is that habit on a sample question: the highest-paying customer.

```js run
db.customers.aggregate([
  { $project: { name: { $concat: ["$name.first", " ", "$name.last"] }, paid: { $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } } } },
  { $sort: { paid: -1, _id: 1 } },
  { $limit: 1 },
  { $project: { name: 1, paid: { $round: ["$paid", 2] } } }
])
```

The edge case: two customers could tie. The sort has `_id` as a tie-breaker so the answer is stable.

## Try it yourself

Pick two questions below and answer them aloud, including the edge case, before you write any code.

## Watch out

### Do not memorise; understand the shape

Most questions are one of: filter, group and count, top N, join, or array work. Name the shape first.

### Always state your assumptions

"I assume ties count as one value", "I assume dates are strings as in this data".

### Check the result differently

Count two ways, or spot-check one group by hand.

## Interview corner

**"What do interviewers look for in an aggregation answer?"**
A correct pipeline, sensible stage order (filter early), handling of ties and missing data, and the ability to say why they chose that approach.

**"Where do candidates lose points?"**
Forgetting a tie-breaker, unwinding when an array expression would do, misusing `$elemMatch`, and not checking types.

## Practice

Twelve questions, in growing difficulty. Each has a hidden hint and solution.

### Q1: Count

How many films are rated `NC-17` and cost 0.99?

```js practice
// hint: `countDocuments`.
db.films.countDocuments({ rating: "NC-17", rentalRate: 0.99 })
```

### Q2: Distinct

How many distinct actor last names appear across all films?

```js practice
// hint: `distinct("actors.lastName").length`.
db.films.distinct("actors.lastName").length
```

### Q3: Top three

The three most common film categories, with counts (ties by name).

```js practice
// hint: `$sortByCount` and a tie-breaker `$sort`.
db.films.aggregate([{ $sortByCount: "$category.name" }, { $sort: { count: -1, _id: 1 } }, { $limit: 3 }])
```

### Q4: Average per group

Average `replacementCost` per `rentalRate`, rounded to 2 decimals.

```js practice
// hint: `$group`, `$round`.
db.films.aggregate([{ $group: { _id: "$rentalRate", avg: { $avg: "$replacementCost" } } }, { $project: { avg: { $round: ["$avg", 2] } } }, { $sort: { _id: 1 } }])
```

### Q5: Array filter

The first three titles (alphabetically) of films featuring the actor with `actorId` 81.

```js practice
// hint: `find({ "actors.actorId": 81 })`.
db.films.find({ "actors.actorId": 81 }, { title: 1, _id: 0 }).sort({ title: 1 }).limit(3)
```

### Q6: Unwind and group

The three actors who appear in the most films (id, name, count; ties by id).

```js practice
// hint: `$unwind` the cast, `$group` by actor.
db.films.aggregate([
  { $unwind: "$actors" },
  { $group: { _id: { id: "$actors.actorId", name: { $concat: ["$actors.firstName", " ", "$actors.lastName"] } }, films: { $sum: 1 } } },
  { $sort: { films: -1, "_id.id": 1 } },
  { $limit: 3 }
])
```

### Q7: Join

The title of the film rented in the customer 100's first rental.

```js practice
// hint: `$lookup` on the first rental's `filmId`.
db.customers.aggregate([
  { $match: { _id: 100 } },
  { $project: { first: { $arrayElemAt: ["$rentals", 0] } } },
  { $lookup: { from: "films", localField: "first.filmId", foreignField: "_id", as: "f" } },
  { $project: { _id: 0, title: { $arrayElemAt: ["$f.title", 0] } } }
])
```

### Q8: Nested sum

The total amount paid by all customers in `Canada`, rounded to 2 decimals.

```js practice
// hint: `$match` the country, `$unwind` twice, `$group`.
db.customers.aggregate([
  { $match: { "address.country": "Canada" } },
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: null, total: { $sum: "$rentals.payments.amount" } } },
  { $project: { _id: 0, total: { $round: ["$total", 2] } } }
])
```

### Q9: Conditional count

How many rentals are unreturned, per store? (`_id` store, `open`), ordered by store.

```js practice
// hint: `$unwind`, `$match` with `returnDate: null`, `$group`.
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $match: { "rentals.returnDate": null } },
  { $group: { _id: "$rentals.storeId", open: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

### Q10: Window

For films rated `G` and category `Action`, rank them by length descending with a tie-aware rank, and return the titles at rank 1.

```js practice
// hint: `$setWindowFields` with `$rank`, single sort key.
db.films.aggregate([
  { $match: { rating: "G", "category.name": "Action" } },
  { $setWindowFields: { sortBy: { lengthMinutes: -1 }, output: { r: { $rank: {} } } } },
  { $match: { r: 1 } },
  { $project: { _id: 0, title: 1 } },
  { $sort: { title: 1 } }
])
```

### Q11: Duplicates

Are all film titles unique? Return `true` or `false`.

```js practice
// hint: Compare the number of distinct titles with the number of films.
db.films.distinct("title").length === db.films.countDocuments()
```

### Q12: Design question

A customer could rent without limit, so embedding all rentals is risky. About how many rentals of 200 bytes each fit in one 16 MB document? Return the whole number (16 MB = 16 × 1024 × 1024 bytes).

```js practice
// hint: Divide and round down. The answer shows why unbounded arrays should be referenced, not embedded.
Math.floor(16 * 1024 * 1024 / 200)
```
