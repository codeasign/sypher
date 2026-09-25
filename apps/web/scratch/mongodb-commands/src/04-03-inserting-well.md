---
title: "Inserting Well: Dates, Ids and Bulk Loads"
order: 0
---

Insert commands are simple. Getting the data right is the hard part: real dates instead of text, sensible ids, a write concern that matches how important the data is, and a way to load thousands of documents quickly.

## What you'll learn

- Storing real dates and numbers
- Custom `_id` values and `ObjectId` timestamps
- Write concern: how safe is "acknowledged"?
- Bulk loading and `bulkWrite`

## Syntax

```js show
new Date()                                   // current time as a BSON date
insertOne(doc, { writeConcern: { w: 1 } })
db.collection.bulkWrite([ { insertOne: { document } }, ... ])
```

## Examples

### Real dates

The DVD Rental data keeps dates as text. New data should use real dates, which sort, compare and group properly:

```js run destructive
const lab = db.getSiblingDB("lab_load")
lab.events.insertMany([
  { _id: 1, at: new Date("2026-01-15T08:30:00Z"), what: "login" },
  { _id: 2, at: new Date("2026-01-15T09:45:00Z"), what: "purchase" },
  { _id: 3, at: new Date("2026-02-01T00:00:00Z"), what: "logout" }
])
lab.events.find({ at: { $gte: new Date("2026-01-15T09:00:00Z"), $lt: new Date("2026-02-01T00:00:00Z") } }, { what: 1 }).toArray()
```

### Numbers with a type

Whole numbers that fit in 32 bits are stored as `int`, fractions as `double`. Say the type yourself with `NumberInt`, `NumberLong`, or `Decimal128` for money:

```js run destructive
lab.prices.insertOne({ _id: "a", qty: NumberInt(3), price: Decimal128("19.99") })
lab.prices.aggregate([{ $project: { qty: { $type: "$qty" }, price: { $type: "$price" } } }])
```

### Time inside an ObjectId

Every default `_id` contains its creation time:

```js run destructive
const oid = ObjectId("65f0c0a1a1b2c3d4e5f60718")
oid.getTimestamp().toISOString()
```

### Write concern

`w: 1` waits for the primary to acknowledge. `w: "majority"` waits until most members have the write (needs a replica set to matter). `w: 0` does not wait at all:

```js run destructive
[
  lab.events.insertOne({ _id: 10, what: "a" }, { writeConcern: { w: 1 } }).acknowledged,
  lab.events.insertOne({ _id: 11, what: "b" }, { writeConcern: { w: 0 } }).acknowledged
]
```

`w: 0` gives no confirmation, so `acknowledged` is `false` and errors are invisible.

### bulkWrite: many kinds of write in one call

```js run destructive
lab.stock.bulkWrite([
  { insertOne: { document: { _id: "pen", qty: 10 } } },
  { insertOne: { document: { _id: "ink", qty: 5 } } },
  { updateOne: { filter: { _id: "pen" }, update: { $inc: { qty: 5 } } } },
  { deleteOne: { filter: { _id: "ink" } } }
])
lab.stock.find().toArray()
```

### Loading many documents from code

Build the array in JavaScript, then insert it in chunks:

```js run destructive
const docs = []
for (let i = 1; i <= 2500; i++) docs.push({ _id: i, square: i * i })
for (let i = 0; i < docs.length; i += 1000) lab.numbers.insertMany(docs.slice(i, i + 1000))
[lab.numbers.countDocuments(), lab.numbers.findOne({ _id: 50 }).square]
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Insert a document with `createdAt: new Date()` and read it back. Then find it with a `$gte` filter for one minute ago.

## Watch out

### Text dates sort right only in one format

`"2026-01-15 08:30:00"` sorts correctly as text, but `"15/01/2026"` does not. Use real dates.

### Timezones

A BSON date is stored in UTC. Displaying it in a local timezone is the client's job. Always create dates with a trailing `Z` or an explicit offset.

### Write concern `w: 0` hides failures

Use it only for data you can afford to lose. It does not tell you about duplicate keys or validation errors.

### Ids you invent must be unique and stable

A natural id (an email, a SKU) is fine if it never changes. `_id` cannot be changed after the insert.

## Interview corner

**"What is write concern?"**
The level of acknowledgement MongoDB gives before a write is reported as successful: `w: 0` (none), `w: 1` (primary), or `w: "majority"` (most replica set members, so it survives a failover).

**"When would you use `bulkWrite`?"**
When you have a mix of inserts, updates and deletes to send together, for speed and fewer round trips.

**"How do you store dates?"**
As BSON dates (`new Date()` or `ISODate`), in UTC.

## Practice

### Warm-up: a date

Return the year of `new Date("2026-06-15T00:00:00Z")` (use `getUTCFullYear()`).

```js practice
// hint: `new Date(...).getUTCFullYear()`.
new Date("2026-06-15T00:00:00Z").getUTCFullYear()
```

### Core: bulk insert and count

In `lab_load`, insert 300 documents `{ _id: 1..300 }` with `insertMany`, then return the count and drop the database.

```js practice destructive
// hint: Build an array with a loop.
const lab = db.getSiblingDB("lab_load")
const docs = []
for (let i = 1; i <= 300; i++) docs.push({ _id: i })
lab.nums.insertMany(docs);
const c = lab.nums.countDocuments()
lab.dropDatabase();
c
```

### Stretch: bulkWrite

With one `bulkWrite`, insert `{ _id: 1, qty: 1 }` and then increase its `qty` by 9. Return the final `qty`, then drop the database.

```js practice destructive
// hint: An `insertOne` followed by an `updateOne` with `$inc`.
const lab = db.getSiblingDB("lab_load")
lab.s.bulkWrite([
  { insertOne: { document: { _id: 1, qty: 1 } } },
  { updateOne: { filter: { _id: 1 }, update: { $inc: { qty: 9 } } } }
]);
const q = lab.s.findOne({ _id: 1 }).qty
lab.dropDatabase();
q
```
