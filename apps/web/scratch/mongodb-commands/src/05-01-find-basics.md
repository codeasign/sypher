---
title: "find() and findOne()"
order: 0
---

`find` is the command you will run most. It takes a **filter** describing which documents you want and returns a cursor over the matches. `findOne` returns just the first match as a document.

## What you'll learn

- `find()` with an empty filter and with equality filters
- `findOne()` and what it returns when nothing matches
- Matching several fields at once
- Turning a cursor into an array, and counting matches

## Syntax

```js show
db.collection.find(filter, projection)
db.collection.findOne(filter, projection)
db.collection.countDocuments(filter)
```

## Examples

### Everything, limited

An empty filter `{}` matches every document. Always limit when you explore:

```js run
db.films.find({}, { title: 1, _id: 0 }).limit(3)
```

### Equality on one field

```js run
db.films.find({ rating: "NC-17", lengthMinutes: 46 }, { title: 1, rating: 1, lengthMinutes: 1, _id: 0 }).sort({ title: 1 })
```

That filter has two conditions, and both must hold. Listing several fields is an implicit **AND**.

### findOne: the first match, or null

```js run
db.films.findOne({ title: "ACADEMY DINOSAUR" }, { title: 1, releaseYear: 1, rentalRate: 1 })
```

When nothing matches, `findOne` returns `null`, not an error:

```js run
db.films.findOne({ title: "NO SUCH FILM" })
```

### Find by _id

`_id` is unique and always indexed, so this is the fastest lookup there is:

```js run
db.films.findOne({ _id: 100 }, { title: 1, _id: 0 })
```

### Counting the matches

```js run
db.films.countDocuments({ rating: "G", rentalRate: 0.99 })
```

### From cursor to array

`find` returns a cursor. `toArray()` reads all of it into an array so you can use ordinary JavaScript on the result:

```js run
const titles = db.films.find({ rating: "G", lengthMinutes: { $lt: 50 } }, { title: 1, _id: 0 }).sort({ title: 1 }).toArray()
titles.map((d) => d.title)
```

### Matching text is case sensitive

```js run
[db.films.countDocuments({ title: "academy dinosaur" }), db.films.countDocuments({ title: "ACADEMY DINOSAUR" })]
```

## Try it yourself

Find the titles of all `PG-13` films of exactly 90 minutes (`lengthMinutes`), then count them with `countDocuments`.

## Watch out

### Values must have the right type

`{ rentalRate: "0.99" }` (text) does not match the number `0.99`. No error appears, just an empty result.

### Field names are case sensitive too

`{ Rating: "PG" }` matches nothing, because the field is called `rating`.

### An empty filter on a big collection is expensive

`find({})` without a limit walks the entire collection. In a real system always filter, project and limit.

### `findOne` returns the first in natural order

"First" means insertion order on disk, not the smallest `_id`. Add a sort with `find().sort().limit(1)` when order matters.

## Interview corner

**"What is the difference between `find` and `findOne`?"**
`find` returns a cursor over all matching documents. `findOne` returns the first matching document, or `null`.

**"How do you AND and OR conditions in a filter?"**
Fields listed in one filter document are ANDed. OR needs the `$or` operator with an array of filters (module 6).

**"Does `find` return the documents immediately?"**
No, it returns a cursor. Documents are fetched from the server in batches as you iterate.

## Practice

### Warm-up: one film

Return the `title` and `lengthMinutes` of the film with `_id` 250 (no `_id` in the result).

```js practice
// hint: `findOne` with a projection.
db.films.findOne({ _id: 250 }, { title: 1, lengthMinutes: 1, _id: 0 })
```

### Core: two conditions

How many films are rated `PG` and cost `4.99` to rent?

```js practice
// hint: `countDocuments` with both fields in the filter.
db.films.countDocuments({ rating: "PG", rentalRate: 4.99 })
```

### Stretch: a list of names

Return the titles (as an array of strings, sorted) of the films with `rentalDurationDays` 3, `rating` "G" and `lengthMinutes` under 50.

```js practice
// hint: `find(...).sort({ title: 1 }).toArray().map(...)`.
db.films.find({ rentalDurationDays: 3, rating: "G", lengthMinutes: { $lt: 50 } }, { title: 1, _id: 0 }).sort({ title: 1 }).toArray().map((d) => d.title)
```
