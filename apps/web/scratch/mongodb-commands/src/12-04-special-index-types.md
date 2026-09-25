---
title: "Unique, Partial, Sparse, TTL and Hidden Indexes"
order: 0
---

Besides speeding up queries, indexes can **enforce rules** (uniqueness), **shrink themselves** (partial and sparse), **delete data** (TTL) and be **switched off for testing** (hidden). These options make indexes a design tool, not just a performance one.

## What you'll learn

- Unique indexes, including compound and case-insensitive ones
- Partial and sparse indexes
- TTL indexes for expiry
- Hidden indexes and collations

## Syntax

```js show
db.c.createIndex({ email: 1 }, { unique: true })
db.c.createIndex({ email: 1 }, { partialFilterExpression: { active: true } })
db.c.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })
db.c.hideIndex("email_1")
db.c.createIndex({ name: 1 }, { collation: { locale: "en", strength: 2 } })
```

## Examples

```js run destructive
const lab = db.getSiblingDB("lab_special")
lab.users.insertMany([
  { _id: 1, email: "ann@x.com", active: true, plan: "pro" },
  { _id: 2, email: "bob@x.com", active: false, plan: "free" },
  { _id: 3, email: "cy@x.com", active: true },
  { _id: 4, email: "di@x.com", active: true, plan: "free" }
]);
lab.users.countDocuments()
```

### Unique index

A second document with the same value is refused:

```js run destructive
lab.users.createIndex({ email: 1 }, { unique: true })
```

```js run destructive error
lab.users.insertOne({ email: "ann@x.com" })
```

### Unique on several fields

The **combination** must be unique, each value alone may repeat:

```js run destructive
lab.enrol.createIndex({ student: 1, course: 1 }, { unique: true });
lab.enrol.insertMany([{ student: "a", course: "x" }, { student: "a", course: "y" }, { student: "b", course: "x" }]);
lab.enrol.countDocuments()
```

```js run destructive error
lab.enrol.insertOne({ student: "a", course: "x" })
```

### Unique treats missing as null (once)

Only one document may lack the field on a unique index:

```js run destructive
lab.tags.createIndex({ code: 1 }, { unique: true });
lab.tags.insertOne({ name: "first, no code" });
```

```js run destructive error
lab.tags.insertOne({ name: "second, no code" })
```

### Partial index: only some documents

Index only what you query. Here only active users, so the index is smaller. The query must include the filter condition to use it:

```js run destructive
lab.users.createIndex({ plan: 1 }, { partialFilterExpression: { active: true }, name: "active_plan" });
const usesIt = (q) => JSON.stringify(lab.users.find(q).hint("active_plan").explain().queryPlanner.winningPlan).includes("IXSCAN");
[usesIt({ plan: "free", active: true }), lab.users.find({ plan: "free", active: true }).explain("executionStats").executionStats.nReturned]
```

### Partial unique: unique among the active ones

Combine both: an email must be unique only among active users, so an old deactivated account does not block a new one:

```js run destructive
lab.acct.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { active: true } });
lab.acct.insertMany([{ email: "z@x.com", active: false }, { email: "z@x.com", active: true }]);
lab.acct.countDocuments()
```

### Sparse index

A sparse index skips documents that lack the field. Partial indexes are more flexible and preferred today:

```js run destructive
lab.users.createIndex({ plan: 1 }, { sparse: true, name: "plan_sparse" });
lab.users.getIndexes().filter((i) => i.name === "plan_sparse").map((i) => i.sparse)
```

### TTL index

Expire documents automatically an hour after their date. The date field must be a real date:

```js run destructive
lab.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600, name: "ttl" });
lab.sessions.getIndexes().filter((i) => i.name === "ttl").map((i) => i.expireAfterSeconds)
```

### Hidden index: test before dropping

A hidden index is still maintained but the planner ignores it. Hide it, watch the queries, and drop it only if nothing gets slower:

```js run destructive
lab.users.hideIndex("email_1");
const idx = lab.users.getIndexes().find((i) => i.name === "email_1");
[idx.hidden, JSON.stringify(lab.users.find({ email: "ann@x.com" }).explain().queryPlanner.winningPlan).includes("COLLSCAN")]
```

```js run destructive
lab.users.unhideIndex("email_1");
JSON.stringify(lab.users.find({ email: "ann@x.com" }).explain().queryPlanner.winningPlan).includes("IXSCAN")
```

### Case-insensitive unique index with a collation

Strength 2 ignores case, so `Ann@X.com` collides with `ann@x.com`:

```js run destructive
lab.people.createIndex({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
lab.people.insertOne({ email: "Ann@X.com" });
```

```js run destructive error
lab.people.insertOne({ email: "ann@x.com" })
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Design the index for "each customer has at most one active subscription, but any number of cancelled ones". Test it with three inserts.

## Watch out

### Creating a unique index on data with duplicates fails

Find and fix the duplicates first (module 9), then build the index.

### A partial index is used only if the query implies the filter

If the query does not include `active: true` (or something narrower), the planner cannot use the partial index.

### TTL indexes need dates, one field, and time

Text dates are ignored, compound TTL is not allowed, and deletion runs about every 60 seconds.

### Unique and `null`

Documents without the field all count as `null`, so a second one is refused. Use a partial index with `$exists: true` to allow many missing values.

### Collation must match the query

A query must use the same collation as the index (or the index is not used). Set a default collation on the collection to keep it consistent.

## Interview corner

**"How do you enforce uniqueness in MongoDB?"**
A unique index. Duplicate inserts or updates fail with error code 11000.

**"What is a partial index?"**
An index over only the documents that match a filter expression, so it is smaller and cheaper, used when queries include that condition.

**"What is a hidden index for?"**
To test the effect of dropping an index without dropping it: the planner ignores it but it is still kept up to date, and can be unhidden instantly.

## Practice

### Warm-up: enforce a rule

Create a unique index on `sku` in a scratch collection, insert `{ sku: "a" }` twice with a try/catch and return the error code of the second insert.

```js practice destructive
// hint: The duplicate key error code is 11000.
const lab = db.getSiblingDB("lab_special")
lab.t.createIndex({ sku: 1 }, { unique: true });
lab.t.insertOne({ sku: "a" });
let code = null
try { lab.t.insertOne({ sku: "a" }) } catch (e) { code = e.code }
lab.dropDatabase();
code
```

### Core: partial unique

Allow two documents with the same `email` when one has `active: false`, using a partial unique index, and return the count stored.

```js practice destructive
// hint: `partialFilterExpression: { active: true }`.
const lab = db.getSiblingDB("lab_special")
lab.t.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { active: true } });
lab.t.insertMany([{ email: "a", active: false }, { email: "a", active: true }]);
const n = lab.t.countDocuments()
lab.dropDatabase();
n
```

### Stretch: TTL definition

Create a TTL index expiring after 90 seconds on `at` and return its `expireAfterSeconds`.

```js practice destructive
// hint: `expireAfterSeconds: 90`.
const lab = db.getSiblingDB("lab_special")
lab.t.createIndex({ at: 1 }, { expireAfterSeconds: 90 });
const s = lab.t.getIndexes().find((i) => i.name === "at_1").expireAfterSeconds
lab.dropDatabase();
s
```
