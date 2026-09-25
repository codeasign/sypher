---
title: "Read Workshop: Ten Questions"
order: 0
---

Time to combine everything from this module. Each question is a real request someone might ask of the DVD Rental data. Try it first, then open the solution.

## What you'll learn

- Combining filter, projection, sort and limit
- Choosing between `find` and `aggregate`
- Reading nested arrays with dotted paths
- Checking results with a second method

## Syntax

```js show
db.collection.find(filter, projection).sort(order).skip(n).limit(m)
db.collection.aggregate([ { $match: ... }, { $group: ... }, { $sort: ... } ])
```

## Examples

### A worked example: the busiest category

*Which category has the most films, and how many?*

```js run
db.films.aggregate([
  { $group: { _id: "$category.name", films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } },
  { $limit: 1 }
])
```

### A worked example: check it another way

Two independent methods should agree. Count `Sports` films with `countDocuments`:

```js run
db.films.countDocuments({ "category.name": "Sports" })
```

### A worked example: nested arrays

*How many rentals does customer 1 have, and how many payments?*

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, rentals: { $size: "$rentals" }, payments: { $sum: { $map: { input: "$rentals", in: { $size: "$$this.payments" } } } } } }
])
```

## Try it yourself

Pick any category and find the three longest films in it, with their length, shown as `title (minutes)` text in the shell.

## Watch out

### Verify with a second query

An aggregation can be wrong in a way that still looks plausible. Cross-check a count or a total with a different method before you trust it.

### Sample the data before you write the query

Look at one document (`findOne`) to see the real field names and types. Half of all "no results" bugs are a wrong field name or type.

### Name your fields in the output

`{ _id: "$rating", films: { $sum: 1 } }` is easy to read. `{ _id: "$rating", n: { $sum: 1 } }` needs a comment.

### Do not guess: measure

If a query feels slow, `explain("executionStats")` (module 12) shows what happened.

## Interview corner

**"Given an unfamiliar collection, how do you start?"**
`countDocuments`, `findOne` to see the shape, `getIndexes` to see what is fast, then small filtered queries with `limit`, checking each result against a second method.

**"How do you decide between `find` and `aggregate`?"**
`find` when you only filter, project, sort and limit documents. `aggregate` when you group, join, compute or reshape.

## Practice

Ten questions. Each has a hidden hint and solution.

### Q1: A single title

What is the `title` of the film with `_id` 500? Return just the string.

```js practice
// hint: `findOne`, then read `.title`.
db.films.findOne({ _id: 500 }).title
```

### Q2: A range

How many films have a `lengthMinutes` between 100 and 110 inclusive?

```js practice
// hint: `$gte` and `$lte` on the same field.
db.films.countDocuments({ lengthMinutes: { $gte: 100, $lte: 110 } })
```

### Q3: Top three by cost

Titles and `replacementCost` of the three films with the highest replacement cost (ties by title).

```js practice
// hint: `sort({ replacementCost: -1, title: 1 }).limit(3)`.
db.films.find({}, { title: 1, replacementCost: 1, _id: 0 }).sort({ replacementCost: -1, title: 1 }).limit(3)
```

### Q4: Films with a given actor

How many films have an actor with `firstName` "PENELOPE" and `lastName` "GUINESS"?

```js practice
// hint: Use `$elemMatch` so both names belong to the same actor.
db.films.countDocuments({ actors: { $elemMatch: { firstName: "PENELOPE", lastName: "GUINESS" } } })
```

### Q5: A country

How many customers live in `India`?

```js practice
// hint: `"address.country"`.
db.customers.countDocuments({ "address.country": "India" })
```

### Q6: Inactive customers

How many customers are not active?

```js practice
// hint: `active: false`.
db.customers.countDocuments({ active: false })
```

### Q7: Paging

Titles on page 3 of the films (page size 4, ordered by title).

```js practice
// hint: `skip(8).limit(4)`.
db.films.find({}, { title: 1, _id: 0 }).sort({ title: 1 }).skip(8).limit(4).toArray().map((d) => d.title)
```

### Q8: Distinct

The sorted distinct `rentalDurationDays` values.

```js practice
// hint: `distinct(...).sort()`.
db.films.distinct("rentalDurationDays").sort()
```

### Q9: Group

How many films are there per `rentalRate`? Sort by rate.

```js practice
// hint: `$group` by `"$rentalRate"`.
db.films.aggregate([{ $group: { _id: "$rentalRate", films: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```

### Q10: Stores

For each store, how many staff and how many inventory items? (`_id`, `staff`, `items`)

```js practice
// hint: `$size` in a projection.
db.stores.aggregate([{ $project: { staff: { $size: "$staff" }, items: { $size: "$inventory" } } }, { $sort: { _id: 1 } }])
```
