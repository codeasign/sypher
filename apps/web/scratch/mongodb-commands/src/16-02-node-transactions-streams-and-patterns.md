---
title: "Transactions, Change Streams and Patterns in Node.js"
order: 0
---

The advanced features of the previous modules (transactions, change streams, safe updates) look slightly different in application code. This page shows the Node.js versions, again with code that ran against the lab's replica set (`mongodb-rs`, port 27019).

## What you'll learn

- Running a transaction with `withTransaction` and a session
- Failing safely when a condition is not met
- Reading a change stream from code
- A few patterns that keep application code robust

## Syntax

```js show
const client = new MongoClient("mongodb://localhost:27019/?directConnection=true");
const session = client.startSession();
await session.withTransaction(async () => { /* operations with { session } */ });
await session.endSession();
```

## Examples

`directConnection=true` connects to the one node without replica-set discovery, which is what a single-node lab needs. In production you list the members and the replica set name instead.

### A money transfer in a transaction

Every operation inside the transaction must receive `{ session }`. Throwing inside the callback aborts the whole transaction:

```js show
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27019/?directConnection=true");
await client.connect();
const db = client.db("lab_node2");
const accounts = db.collection("accounts");
await accounts.insertMany([{ _id: "a", bal: 100 }, { _id: "b", bal: 20 }]);

async function transfer(from, to, amount) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const src = await accounts.findOneAndUpdate(
        { _id: from, bal: { $gte: amount } },
        { $inc: { bal: -amount } },
        { session }
      );
      if (!src) throw new Error("insufficient funds");
      await accounts.updateOne({ _id: to }, { $inc: { bal: amount } }, { session });
    });
    return "ok";
  } catch (err) {
    return err.message;
  } finally {
    await session.endSession();
  }
}

console.log(await transfer("a", "b", 30));
console.log(await transfer("a", "b", 500));
console.log((await accounts.find().sort({ _id: 1 }).toArray()).map((d) => d.bal));
```

Output of that run:

```text
ok
insufficient funds
[ 70, 50 ]
```

The first transfer committed (100 to 70, 20 to 50). The second failed the balance check and left both balances untouched.

### Why the check is part of the update

`findOneAndUpdate` with `bal: { $gte: amount }` makes the check and the change one atomic step on that document. Reading the balance first and updating later would let two transfers overspend. Even inside a transaction, prefer a conditional update to read-then-write.

### A change stream in code

Start the stream, make a change, read the event. `tryNext()` forces the stream to open on the server before the change happens, otherwise the change could occur before the stream exists:

```js show
const stream = accounts.watch([], { fullDocument: "updateLookup" });
await stream.tryNext(); // starts the stream on the server before we make changes
await accounts.updateOne({ _id: "a" }, { $set: { bal: 1 } });
const ev = await stream.next();
console.log({ op: ev.operationType, id: ev.documentKey._id, bal: ev.fullDocument.bal });
await stream.close();
```

Output:

```text
{ op: 'update', id: 'a', bal: 1 }
```

In a service you loop `for await (const change of stream)` and persist `change._id` (the resume token) after handling each event.

### Patterns worth copying

```js show
// 1. Validate input before building a query (module 15)
const rating = ["G", "PG", "PG-13", "R", "NC-17"].includes(req.query.rating) ? req.query.rating : null;

// 2. Project only what you need
const rows = await films.find({ rating }, { projection: { title: 1, lengthMinutes: 1 } }).limit(20).toArray();

// 3. Idempotent writes: upsert by a natural key
await stats.updateOne({ _id: `${day}:${page}` }, { $inc: { views: 1 } }, { upsert: true });

// 4. Retry only what is safe to retry (the driver retries single writes for you)
// 5. Close the client on shutdown
process.on("SIGTERM", async () => { await client.close(); process.exit(0); });
```

## Try it yourself

Write an `order(productId, qty)` function that, in one transaction, decreases `stock` (only if enough) and inserts an `orders` document. Test it with enough and with too little stock.

## Watch out

### Operations without `{ session }` run outside the transaction

The easiest bug to make. Pass the session to every call, or use a small wrapper that adds it.

### `withTransaction` may run your callback more than once

On a transient error it retries. Keep the callback free of side effects such as sending email or calling payment APIs.

### The connection string for a real replica set

```text
mongodb://node1:27017,node2:27017,node3:27017/shop?replicaSet=rs0&w=majority&retryWrites=true
```

`directConnection=true` is only for a single node you talk to directly.

### Change streams need a resume strategy

Store the last processed token, or you will miss events during a restart or process them twice.

### Do not trust the client for authorisation

Whatever the driver sends is checked by the server against the user's roles. Authorisation rules belong on the server (roles, views) and in your API, not only in the front end.

## Interview corner

**"How do you run a multi-document transaction in Node.js?"**
Start a session, use `session.withTransaction(async () => { ... })`, pass `{ session }` to every operation, and let it commit or retry. Throwing aborts.

**"How do you consume a change stream reliably?"**
Loop over the stream, handle each event idempotently, save the resume token after each, and reopen with `resumeAfter` after a failure.

**"Why prefer a conditional update over read-then-write?"**
A single `updateOne` with the condition in the filter is atomic. Read-then-write can be interleaved by another client.

## Practice

### Warm-up: conditional update

In a scratch collection with `{ _id: "a", bal: 100 }`, run `findOneAndUpdate` with the filter `{ _id: "a", bal: { $gte: 500 } }` and return whether it matched (`true`/`false`).

```js practice destructive
// hint: The result is `null` when nothing matched.
const lab = db.getSiblingDB("lab_node2");
lab.a.insertOne({ _id: "a", bal: 100 });
const r = lab.a.findOneAndUpdate({ _id: "a", bal: { $gte: 500 } }, { $inc: { bal: -500 } });
lab.dropDatabase();
r !== null
```

### Core: the same transfer in mongosh

Run the two transfers of the Node example (30, then 500) in a transaction on the replica set, and return the final balances as `[a, b]`.

```js practice rs
// hint: Use `withTransaction` and throw when `findOneAndUpdate` returns null.
const lab = db.getSiblingDB("lab_node2");
lab.accounts.insertMany([{ _id: "a", bal: 100 }, { _id: "b", bal: 20 }]);
const transfer = (from, to, amount) => {
  const s = db.getMongo().startSession();
  try {
    s.withTransaction(() => {
      const acc = s.getDatabase("lab_node2").accounts;
      if (!acc.findOneAndUpdate({ _id: from, bal: { $gte: amount } }, { $inc: { bal: -amount } })) throw new Error("insufficient funds");
      acc.updateOne({ _id: to }, { $inc: { bal: amount } });
    });
  } catch (e) {}
  s.endSession();
};
transfer("a", "b", 30);
transfer("a", "b", 500);
const r = lab.accounts.find().sort({ _id: 1 }).toArray().map((d) => d.bal);
lab.dropDatabase();
r
```

### Stretch: the stream event

Reproduce the change stream example in mongosh and return `[operationType, updated balance]`.

```js practice rs
// hint: `watch`, then update, then `next()`.
const lab = db.getSiblingDB("lab_node3");
lab.accounts.insertOne({ _id: "a", bal: 100 });
const cs = lab.accounts.watch([], { fullDocument: "updateLookup" });
lab.accounts.updateOne({ _id: "a" }, { $set: { bal: 1 } });
const ev = cs.next();
const r = [ev.operationType, ev.fullDocument.bal];
cs.close();
lab.dropDatabase();
r
```
