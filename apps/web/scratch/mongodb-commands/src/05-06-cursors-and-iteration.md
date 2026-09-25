---
title: "Cursors and Iteration"
order: 0
---

`find()` does not return an array. It returns a **cursor**: a pointer to the results, which the server hands over in batches. Understanding cursors explains why `it` exists in the shell and how to process big results without running out of memory.

## What you'll learn

- What a cursor is and how batches work
- `hasNext`, `next`, `forEach`, `map`, `toArray`
- Cursor modifiers: `limit`, `skip`, `sort`, `batchSize`
- Cursor lifetime, and why you should not hold one open for long

## Syntax

```js show
const cur = db.collection.find(filter)
cur.hasNext()            // is there another document?
cur.next()               // the next document
cur.forEach((d) => ...)  // run a function on each
cur.toArray()            // read everything into an array
```

## Examples

### Walking a cursor by hand

```js run
const cur = db.films.find({ rating: "G" }, { title: 1, _id: 0 }).sort({ title: 1 }).limit(3)
const seen = []
while (cur.hasNext()) seen.push(cur.next().title)
seen
```

### forEach

```js run
const names = []
db.films.find({ _id: { $lte: 3 } }, { title: 1 }).sort({ _id: 1 }).forEach((d) => names.push(d._id + ":" + d.title))
names
```

### map and toArray

```js run
db.films.find({ _id: { $lte: 3 } }).sort({ _id: 1 }).map((d) => d.title.length).toArray()
```

### A cursor is used up once you read it

```js run
const c2 = db.films.find({ _id: { $lte: 2 } }, { _id: 1 });
[c2.toArray().length, c2.toArray().length]
```

The second read is empty because the cursor was already exhausted.

### Batches

The server sends the first batch of up to 101 documents, or 16 MB, and then more on request. `batchSize` changes that number:

```js run
const c3 = db.films.find({}, { _id: 1 }).batchSize(50)
let n = 0
while (c3.hasNext()) { c3.next(); n++ }
n
```

### Processing a big collection without loading it all

Iterate and keep only a running total. Memory stays small however many documents there are:

```js run
let minutes = 0
db.films.find({}, { lengthMinutes: 1, _id: 0 }).forEach((d) => { minutes += d.lengthMinutes })
minutes
```

Doing this in the database with `$group` is usually better still:

```js run
db.films.aggregate([{ $group: { _id: null, minutes: { $sum: "$lengthMinutes" } } }])
```

### The shell prints 20 and waits

In an interactive `mongosh`, a `find()` that is not assigned prints the first 20 documents and then shows `Type "it" for more`. Typing `it` continues the same cursor. Scripts and drivers do not have `it`; they iterate the cursor.

### Explaining a cursor

`explain()` shows how the server will run the query. A later module covers it fully; here is the plan stage for an `_id` lookup (the stage name differs between server versions):

```js run
db.films.find({ _id: 5 }).explain().queryPlanner.winningPlan.stage
```

## Try it yourself

Loop over the `Horror` films with a `while (cur.hasNext())` loop and count how many are longer than 150 minutes. Then get the same number with `countDocuments`.

## Watch out

### Cursors time out

An idle cursor is closed by the server after about 10 minutes. Reading it afterwards gives a `CursorNotFound` error. Process results promptly, or page with keyset pagination.

### A cursor sees changing data

Documents inserted, updated or deleted while you iterate can be included, skipped or seen twice. For a stable view, use a snapshot read inside a transaction or a query that cannot be affected (for example, sort by `_id` and page).

### `toArray()` on a huge result

It builds one big array in memory. For millions of documents, iterate instead.

### Do not hold a cursor across long work

If each document needs slow processing, fetch in chunks by `_id` ranges rather than holding one cursor open.

## Interview corner

**"What does `find()` return?"**
A cursor: an iterator over the result set. Documents are fetched from the server in batches as you iterate.

**"What happens when a cursor is idle for a long time?"**
The server closes it after a timeout (10 minutes by default), and using it then fails with `CursorNotFound`.

**"How do you process a very large result set?"**
Iterate the cursor (or use an aggregation to do the work in the database), keeping only what you need in memory, or page with a range query on an indexed key.

## Practice

### Warm-up: hasNext

Return `true` or `false`: does a cursor for films with `rating: "G"` have a next document?

```js practice
// hint: `find(...).hasNext()`.
db.films.find({ rating: "G" }).hasNext()
```

### Core: forEach total

Add up the `rentalRate` of all `NC-17` films using `forEach`, and return the total rounded to 2 decimals.

```js practice
// hint: Keep a running total in a variable, then `Math.round(total * 100) / 100`.
let total = 0
db.films.find({ rating: "NC-17" }, { rentalRate: 1, _id: 0 }).forEach((d) => { total += d.rentalRate })
Math.round(total * 100) / 100
```

### Stretch: the same in the database

Return the same total with an aggregation, as `{ total: ... }` rounded to 2 decimals.

```js practice
// hint: `$match`, `$group`, then `$round` in a `$project`.
db.films.aggregate([
  { $match: { rating: "NC-17" } },
  { $group: { _id: null, total: { $sum: "$rentalRate" } } },
  { $project: { _id: 0, total: { $round: ["$total", 2] } } }
])
```
