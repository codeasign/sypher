---
title: "Using MongoDB from Node.js"
order: 0
---

Everything in this course ran in `mongosh`. Applications talk to MongoDB through a **driver**, and the concepts carry over almost one to one: `find`, `updateOne`, `aggregate` and the same documents. This page shows the official Node.js driver, with code that was run against this lab, and the few places where a driver differs from the shell.

## What you'll learn

- Installing the driver and connecting with a connection string
- Running `find`, `aggregate`, inserts and updates from code
- Iterating cursors, handling errors and closing the client
- What differs from mongosh: `await`, cursors, `ObjectId`

## Syntax

```bash
npm install mongodb
```

```js show
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://user:password@localhost:27018/?authSource=admin");
await client.connect();
const films = client.db("sypher-mongodb-DvdRental").collection("films");
```

## Examples

The page shows the code and the output. Both come from a real run of this script against the lab server (connection string with the lab user `sypher`).

### The whole script

```js show
import { MongoClient, ObjectId } from "mongodb";

const uri = "mongodb://sypher:password@localhost:27018/?authSource=admin";
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db("sypher-mongodb-DvdRental");
  const films = db.collection("films");

  // find with filter, projection, sort, limit
  const shortFilms = await films
    .find({ rating: "G", lengthMinutes: { $lt: 50 } }, { projection: { title: 1, _id: 0 } })
    .sort({ title: 1 })
    .limit(3)
    .toArray();
  console.log(shortFilms);

  // findOne returns null when nothing matches
  console.log(await films.findOne({ title: "NO SUCH FILM" }));

  // aggregate
  const perRating = await films
    .aggregate([{ $group: { _id: "$rating", films: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    .toArray();
  console.log(perRating);

  // iterate a cursor without loading everything
  let n = 0;
  for await (const film of films.find({ rating: "NC-17" }).project({ title: 1 })) n += 1;
  console.log(n);

  // writes in a scratch database
  const scratch = client.db("lab_node").collection("notes");
  const ins = await scratch.insertOne({ text: "hello", at: new Date("2026-01-01T00:00:00Z") });
  console.log(ins.acknowledged, ins.insertedId instanceof ObjectId);
  const up = await scratch.updateOne({ _id: ins.insertedId }, { $set: { done: true } });
  console.log(up.matchedCount, up.modifiedCount);
  try {
    await scratch.insertOne({ _id: ins.insertedId });
  } catch (err) {
    console.log(err.name, err.code);
  }
  console.log(await scratch.findOne({ _id: new ObjectId(ins.insertedId.toString()) }, { projection: { _id: 0 } }));
  await client.db("lab_node").dropDatabase();
} finally {
  await client.close();
}
```

### The output of that run

```text
[
  { title: 'ACE GOLDFINGER' },
  { title: 'DIVORCE SHINING' },
  { title: 'DOWNHILL ENOUGH' }
]
null
[
  { _id: 'G', films: 178 },
  { _id: 'NC-17', films: 210 },
  { _id: 'PG', films: 194 },
  { _id: 'PG-13', films: 223 },
  { _id: 'R', films: 195 }
]
210
true true
1 1
MongoServerError 11000
{ text: 'hello', at: 2026-01-01T00:00:00.000Z, done: true }
```

Compare with the shell results earlier in the course: the numbers are the same, because the driver sends the same commands.

### What is different from mongosh

| mongosh | Node.js driver |
|---|---|
| Statements run synchronously | Every operation returns a **Promise**: use `await` |
| `db.films.find()` prints a cursor | `find()` returns a cursor: call `toArray()`, `for await`, or `next()` |
| `db.films` works for any name | `client.db(name).collection(name)` |
| `ObjectId("…")` is global | `import { ObjectId } from "mongodb"` |
| Results are printed | You handle results and errors in code |
| `NumberInt(5)` | `new Int32(5)` from `bson` (whole numbers under 2 billion are stored as ints anyway) |

### Connection strings

```text
mongodb://user:password@host1:27017,host2:27017/?authSource=admin&replicaSet=rs0&retryWrites=true&w=majority
mongodb+srv://user:password@cluster0.example.mongodb.net/shop
```

`mongodb+srv` looks up the hosts and options through DNS, and is what hosted services give you. Put the password in an environment variable, not in source code.

### One client per application

The client manages a **pool** of connections. Create it once at start-up and reuse it. Creating a client per request is a classic mistake:

```js show
// db.js
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 20 });
export const db = client.db("shop");
export const start = () => client.connect();
export const stop = () => client.close();
```

### Handling errors

Driver errors carry a `name`, a numeric `code` and sometimes `errorLabels`. The duplicate key error is code 11000:

```js show
try {
  await users.insertOne({ email });
} catch (err) {
  if (err.code === 11000) return { status: 409, message: "email already registered" };
  throw err;
}
```

## Try it yourself

Install the driver, connect to the lab, and write a function `filmsByRating(rating)` that returns the titles of the first 5 films, with an input check that rejects anything but a string (module 15).

## Watch out

### Forgetting `await` gives a Promise, not data

`const rows = films.find().toArray()` (no `await`) is a Promise. Logging it prints `Promise { <pending> }`.

### Always close the client (or reuse it for the life of the process)

A script that never calls `client.close()` keeps the process alive. A web server should keep it open and close it on shutdown.

### `toArray()` loads everything

Use `for await` on large results, or limit the query.

### Data types differ from what you expect

A JavaScript `Date` becomes a BSON date, a `string` stays a string, and `_id` returned as an `ObjectId` object must be converted to a string to put it in JSON (`String(id)`).

### Keep credentials out of code

Read the connection string from an environment variable or a secret manager.

## Interview corner

**"How do you connect to MongoDB from Node.js?"**
Create a `MongoClient` with a connection string, call `connect()`, get a database and collection, and reuse the single client for the application's lifetime.

**"Why one `MongoClient` per application?"**
It owns a connection pool. Creating one per request wastes connections and slows everything.

**"What does a driver return for `find`?"**
A cursor. You iterate it or call `toArray()`, which reads all results into memory.

## Practice

The driver code cannot run inside `mongosh`, so these questions test the shell equivalents of what you just read.

### Warm-up: the cursor

Return the number of documents that a `for await` loop would visit for `{ rating: "NC-17" }` (use `countDocuments`).

```js practice
// hint: `countDocuments`.
db.films.countDocuments({ rating: "NC-17" })
```

### Core: duplicate key code

Insert `{ _id: 1 }` twice in a scratch collection, catching the error, and return its `code`.

```js practice destructive
// hint: Code 11000, as in the Node example.
const lab = db.getSiblingDB("lab_node");
lab.t.insertOne({ _id: 1 });
let code = null
try { lab.t.insertOne({ _id: 1 }) } catch (e) { code = e.code }
lab.dropDatabase();
code
```

### Stretch: the same query as the script

Reproduce the first query of the script in mongosh: titles of `G` films shorter than 50 minutes, sorted, first 3.

```js practice
// hint: Same filter, projection, sort and limit.
db.films.find({ rating: "G", lengthMinutes: { $lt: 50 } }, { title: 1, _id: 0 }).sort({ title: 1 }).limit(3)
```
