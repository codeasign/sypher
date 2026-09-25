---
title: "updateOne and updateMany"
order: 0
---

An update has two parts: a **filter** that picks the documents, and an **update document** that says what to change. `updateOne` changes the first match, `updateMany` changes them all. The result object tells you how many documents were matched and how many actually changed.

## What you'll learn

- `updateOne` and `updateMany` with `$set`
- Reading `matchedCount` and `modifiedCount`
- Updating nested fields
- Why the update document must use operators

## Syntax

```js show
db.collection.updateOne(filter, { $set: { field: value } })
db.collection.updateMany(filter, { $set: { field: value } })
```

## Examples

The changes below run on the real DVD Rental data. This course restores the original data after each page, and you can restore it yourself with the reset script from module 1.

### Update one document

```js run destructive
db.films.updateOne({ _id: 1 }, { $set: { rentalRate: 1.99 } })
```

The result says one document matched and one changed. Read it back:

```js run destructive
db.films.findOne({ _id: 1 }, { title: 1, rentalRate: 1, _id: 0 })
```

### Setting the same value changes nothing

`modifiedCount` is 0 when the document already had that value:

```js run destructive
db.films.updateOne({ _id: 1 }, { $set: { rentalRate: 1.99 } })
```

### No match is not an error

```js run destructive
db.films.updateOne({ _id: 99999 }, { $set: { rentalRate: 1 } })
```

### Update many

Raise every 0.99 rental to 1.29 for `G` films:

```js run destructive
db.films.updateMany({ rating: "G", rentalRate: 0.99 }, { $set: { rentalRate: 1.29 } })
```

```js run destructive
db.films.countDocuments({ rating: "G", rentalRate: 1.29 })
```

### Nested fields and several fields at once

Dot notation reaches inside embedded documents. One `$set` can change several fields:

```js run destructive
db.films.updateOne({ _id: 2 }, { $set: { "category.name": "Classics Plus", rating: "PG", lengthMinutes: 100 } })
db.films.findOne({ _id: 2 }, { rating: 1, lengthMinutes: 1, category: 1, _id: 0 })
```

### An update document needs operators

Passing a plain document to `updateOne` is an error, so a typo cannot wipe a document:

```js run destructive error
db.films.updateOne({ _id: 3 }, { rentalRate: 5 })
```

### Verify a bulk change

Compare counts before and after, and look at a sample:

```js run destructive
db.films.updateMany({ rating: "NC-17" }, { $set: { reviewed: true } })
db.films.countDocuments({ reviewed: true })
```

## Try it yourself

Set `rentalDurationDays` to 7 for the film with `_id` 10, then for all `Horror` films. Compare the `matchedCount` and `modifiedCount` of each result.

## Watch out

### Test the filter first

Run the same filter with `countDocuments` or `find` before you `updateMany`. A wrong filter changes the wrong documents, and there is no undo.

### An empty filter matches everything

`updateMany({}, ...)` changes every document. Make it a deliberate act.

### `matchedCount` is not `modifiedCount`

Matched means the filter found it. Modified means something actually changed. A retry that writes the same value matches but does not modify.

### A validator can reject the update

If the collection has a `$jsonSchema` validator, an update that breaks it fails for that document. In an `updateMany` earlier documents may already have changed.

## Interview corner

**"What is the difference between `updateOne` and `updateMany`?"**
`updateOne` changes at most one document (the first match), `updateMany` changes every matching document.

**"What do `matchedCount` and `modifiedCount` mean?"**
`matchedCount` is how many documents satisfied the filter; `modifiedCount` is how many of them were really changed.

**"Is `updateMany` atomic?"**
Each document is updated atomically, but the whole operation is not: a failure part-way leaves some documents changed. Use a transaction for all-or-nothing.

## Practice

### Warm-up: set a field

Set `rentalRate` of film 5 to 3.99 and return the new value.

```js practice destructive
// hint: `updateOne` then `findOne`.
db.films.updateOne({ _id: 5 }, { $set: { rentalRate: 3.99 } });
db.films.findOne({ _id: 5 }).rentalRate
```

### Core: update many

Set `rentalDurationDays` to 10 for all `Horror` films, and return `modifiedCount` of the operation.

```js practice destructive
// hint: The result of `updateMany` has `modifiedCount`.
db.films.updateMany({ "category.name": "Horror" }, { $set: { rentalDurationDays: 10 } }).modifiedCount
```

### Stretch: a nested field

Change the category name of film 6 to `Zzz` and return the document's `category`.

```js practice destructive
// hint: `"category.name"`.
db.films.updateOne({ _id: 6 }, { $set: { "category.name": "Zzz" } });
db.films.findOne({ _id: 6 }).category
```
