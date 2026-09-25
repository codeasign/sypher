---
title: "Insert One Document"
order: 0
---

`insertOne` adds a single document to a collection. It is the first write command most people learn, and it shows how MongoDB generates ids, applies validation and reports success.

## What you'll learn

- Inserting a document and reading the result
- How `_id` is generated or chosen
- Inserting nested documents and arrays
- What happens on a duplicate `_id` and on validation failure

## Syntax

```js show
db.collection.insertOne(document)
db.collection.insertOne(document, { writeConcern: { w: "majority" } })
```

## Examples

The examples below work in a scratch database, so your DVD Rental data stays untouched.

### A first insert

The result reports whether the write was acknowledged and the new `_id`:

```js run destructive
const lab = db.getSiblingDB("lab_insert")
const r = lab.notes.insertOne({ text: "buy milk", done: false });
[r.acknowledged, typeof r.insertedId, r.insertedId.constructor.name]
```

### Reading it back

```js run destructive
lab.notes.find({}, { _id: 0 }).toArray()
```

### Choosing your own _id

If you supply `_id`, MongoDB uses it. It can be a number, a string or a document, but not an array:

```js run destructive
lab.notes.insertOne({ _id: "n-100", text: "call the bank" })
```

```js run destructive
lab.notes.find({ _id: "n-100" }).toArray()
```

### Nested documents and arrays

```js run destructive
lab.notes.insertOne({
  _id: "n-200",
  text: "trip",
  tags: ["travel", "urgent"],
  place: { city: "Oslo", country: "Norway" },
  created: new Date("2026-03-01T09:00:00Z")
})
lab.notes.findOne({ _id: "n-200" })
```

### Duplicate _id is an error

```js run destructive error
lab.notes.insertOne({ _id: "n-200", text: "again" })
```

### A validator can refuse the document

```js run destructive
lab.createCollection("users", { validator: { $jsonSchema: { bsonType: "object", required: ["email"], properties: { email: { bsonType: "string" } } } } })
```

```js run destructive error
lab.users.insertOne({ name: "Sam" })
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Insert a document with your own `_id` and a nested `address`, read it back, then insert it again and read the error message.

## Watch out

### The same document twice is two documents

Without your own `_id`, every insert gets a new `ObjectId`, so repeating the command creates duplicates. Give documents a natural key as `_id` (or add a unique index) when duplicates must not happen.

### Field types are not enforced unless you add a validator

`{ age: 30 }` and `{ age: "thirty" }` can live in the same collection. That flexibility is why validators (module 13) exist.

### `insertOne` does not return the document

It returns `acknowledged` and `insertedId`. Read the document with `findOne` if you need it.

### The 16 MB limit

A document cannot exceed 16 MB, and field names may not contain a `null` character. Avoid starting field names with `$` or containing dots: they are legal in recent versions but clash with operators and dotted paths.

## Interview corner

**"What does `insertOne` return?"**
An object with `acknowledged` (true when the server confirmed the write) and `insertedId` (the document's `_id`).

**"What happens if you insert a document without `_id`?"**
The driver or the shell adds one, an `ObjectId`, before sending it. Every stored document has an `_id`.

**"How do you stop duplicate documents?"**
Use a natural value as `_id`, or create a unique index on the fields that identify the document. A duplicate then raises error code `11000`.

## Practice

### Warm-up: insert and count

In `lab_insert`, insert `{ item: "pen" }` into `stock` and return the number of documents in it (then drop the database).

```js practice destructive
// hint: `insertOne` then `countDocuments()`.
const lab = db.getSiblingDB("lab_insert")
lab.stock.insertOne({ item: "pen" });
const n = lab.stock.countDocuments()
lab.dropDatabase();
n
```

### Core: your own _id

Insert `{ _id: 7, item: "ink" }` into `stock`, then return the document back from a `findOne`, and drop the database.

```js practice destructive
// hint: Query by `_id: 7`.
const lab = db.getSiblingDB("lab_insert")
lab.stock.insertOne({ _id: 7, item: "ink" });
const d = lab.stock.findOne({ _id: 7 })
lab.dropDatabase();
d
```

### Stretch: catch the duplicate

Insert `{ _id: 1 }` twice into `stock`, catching the error, and return its `code` (a number). Drop the database afterwards.

```js practice destructive
// hint: Wrap the second insert in `try { } catch (e) { }` and read `e.code`.
const lab = db.getSiblingDB("lab_insert")
lab.stock.insertOne({ _id: 1 });
let code = null
try { lab.stock.insertOne({ _id: 1 }) } catch (e) { code = e.code }
lab.dropDatabase();
code
```
