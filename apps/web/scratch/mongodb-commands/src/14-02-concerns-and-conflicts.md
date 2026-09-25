---
title: "Read and Write Concerns, Conflicts and Retries"
order: 0
---

On a replica set, "the write succeeded" can mean different things: written on the primary only, or safely on most members. **Write concern** and **read concern** let you choose how safe and how fresh each operation must be, and **conflicts** show what happens when two transactions touch the same document.

## What you'll learn

- Write concern: `w`, `j` and `wtimeout`
- Read concern: `local`, `majority`, `snapshot`
- Write conflicts between two transactions
- Retryable writes and `TransientTransactionError`

## Syntax

```js show
db.c.insertOne(doc, { writeConcern: { w: "majority", j: true, wtimeout: 5000 } })
db.c.find().readConcern("majority")
session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } })
```

## Examples

```js run rs
const lab = db.getSiblingDB("lab_concern")
lab.stock.insertOne({ _id: "pen", qty: 10 });
lab.stock.countDocuments()
```

### Write concern

| Setting | Meaning | Risk |
|---|---|---|
| `w: 0` | Do not wait for an answer | Errors and losses are invisible |
| `w: 1` | The primary applied it | Lost if the primary fails before replicating |
| `w: "majority"` | Most members have it | Survives a failover |
| `j: true` | Written to the on-disk journal | Survives a crash of that node |

```js run rs
const r = lab.stock.insertOne({ _id: "ink", qty: 5 }, { writeConcern: { w: "majority", j: true, wtimeout: 5000 } });
r.acknowledged
```

### An impossible write concern

With one member, asking for two acknowledgements can never be met, and the server says so instead of waiting for ever:

```js run rs error
lab.stock.insertOne({ _id: "pad", qty: 1 }, { writeConcern: { w: 2, wtimeout: 500 } })
```

Notice what the error means: the acknowledgement could not be given, **not** that the write was undone. The document `pad` was written on the primary anyway (the counts below include it). A write concern error is a warning about durability, so handle it, do not assume nothing happened.

### Read concern

`local` returns the newest data on this member (which might roll back after a failover). `majority` returns only data that most members have. `snapshot` is used in transactions for a consistent view:

```js run rs
[lab.stock.find().readConcern("local").itcount(), lab.stock.find().readConcern("majority").itcount()]
```

### A snapshot inside a transaction

A transaction sees the data as of when it started, even if another client changes it meanwhile:

```js run rs
const s = db.getMongo().startSession();
s.startTransaction({ readConcern: { level: "snapshot" } });
const before = s.getDatabase("lab_concern").stock.findOne({ _id: "pen" }).qty;
lab.stock.updateOne({ _id: "pen" }, { $set: { qty: 99 } });
const during = s.getDatabase("lab_concern").stock.findOne({ _id: "pen" }).qty;
s.abortTransaction(); s.endSession();
[before, during, lab.stock.findOne({ _id: "pen" }).qty]
```

The transaction still saw 10; the world moved on to 99.

### A write conflict

Two transactions cannot change the same document at once. The second one to write fails with a `TransientTransactionError`:

```js run rs error
const a = db.getMongo().startSession();
const b = db.getMongo().startSession();
a.startTransaction();
b.startTransaction();
a.getDatabase("lab_concern").stock.updateOne({ _id: "ink" }, { $inc: { qty: -1 } });
try {
  b.getDatabase("lab_concern").stock.updateOne({ _id: "ink" }, { $inc: { qty: -2 } });
} finally {
  a.abortTransaction(); b.abortTransaction(); a.endSession(); b.endSession();
}
```

### The retry pattern

`withTransaction` retries the callback automatically on transient errors and on unknown commit results. If you manage transactions by hand, you must do the same loop:

```js show
for (let attempt = 0; attempt < 5; attempt++) {
  session.startTransaction();
  try {
    /* operations */
    session.commitTransaction();
    break;
  } catch (e) {
    session.abortTransaction();
    if (!e.hasErrorLabel || !e.hasErrorLabel("TransientTransactionError")) throw e;
  }
}
```

### Retryable writes

Drivers retry a single write once if a network error or a failover interrupts it, and the server makes sure it is applied only once. It is on by default with `retryWrites=true` in the connection string, and needs no code from you.

### Clean up

```js run rs
lab.dropDatabase()
```

## Try it yourself

Insert with `w: "majority"` and `j: true`, then repeat with `w: 1`. Which would you choose for a payment, and which for a click counter? Explain the risk you accept.

## Watch out

### `w: 1` can lose acknowledged data

If the primary fails before a secondary copies the write, and the old primary rejoins, that write is rolled back, even though it was acknowledged.

### `majority` costs latency

It waits for replication. Use it for data you cannot afford to lose, `w: 1` for cheap and reproducible data.

### Read concern `majority` needs a majority

If the replica set lacks a majority (nodes down), reads with `majority` wait or fail.

### Long transactions and conflicts

The longer a transaction, the higher the chance of a conflict. Keep them short and touch few documents.

### Retrying non-idempotent work

A retried transaction runs its callback again. Do not send emails or charge cards inside it.

## Interview corner

**"What is write concern?"**
The acknowledgement level required for a write: `w: 0`, `1`, a number, or `"majority"`, with optional `j` for journaling and `wtimeout`.

**"What is the difference between `local` and `majority` read concern?"**
`local` returns the latest data on the node, possibly not yet replicated (and could be rolled back). `majority` returns only data that a majority of members have, which cannot be rolled back.

**"What happens when two transactions update the same document?"**
The second gets a write conflict (`TransientTransactionError`) and must abort and retry.

## Practice

### Warm-up: acknowledged

Insert `{ _id: 1 }` with `w: "majority"` into `lab_concern.c` and return `acknowledged`, then drop the database.

```js practice rs
// hint: `{ writeConcern: { w: "majority" } }`.
const lab = db.getSiblingDB("lab_concern")
const a = lab.c.insertOne({ _id: 1 }, { writeConcern: { w: "majority" } }).acknowledged
lab.dropDatabase();
a
```

### Core: snapshot

In a snapshot transaction, read `n`, update it outside the transaction, read again inside, and return `[first read, second read]`.

```js practice rs
// hint: Both reads inside the transaction see the same value.
const lab = db.getSiblingDB("lab_concern")
lab.c.insertOne({ _id: 1, n: 1 });
const s = db.getMongo().startSession();
s.startTransaction({ readConcern: { level: "snapshot" } });
const first = s.getDatabase("lab_concern").c.findOne({ _id: 1 }).n;
lab.c.updateOne({ _id: 1 }, { $set: { n: 2 } });
const second = s.getDatabase("lab_concern").c.findOne({ _id: 1 }).n;
s.abortTransaction(); s.endSession();
lab.dropDatabase();
[first, second]
```

### Stretch: a conflict

Start two transactions, update the same document in both, and return the `errorLabels` of the second error.

```js practice rs
// hint: The second update throws; read `e.errorLabels`.
const lab = db.getSiblingDB("lab_concern")
lab.c.insertOne({ _id: 1, n: 0 });
const a = db.getMongo().startSession(); const b = db.getMongo().startSession();
a.startTransaction(); b.startTransaction();
a.getDatabase("lab_concern").c.updateOne({ _id: 1 }, { $inc: { n: 1 } });
let labels = null
try { b.getDatabase("lab_concern").c.updateOne({ _id: 1 }, { $inc: { n: 1 } }); } catch (e) { labels = e.errorLabels }
a.abortTransaction(); b.abortTransaction(); a.endSession(); b.endSession();
lab.dropDatabase();
labels
```
