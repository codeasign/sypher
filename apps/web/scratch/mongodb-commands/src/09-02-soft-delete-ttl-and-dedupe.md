---
title: "Soft Delete, TTL Indexes and Removing Duplicates"
order: 0
---

Real systems rarely just call `deleteMany`. They keep a record of what was removed, expire old data on a schedule, and clean up duplicates that crept in. This page shows the three patterns.

## What you'll learn

- Soft delete with a flag, and how to query around it
- TTL indexes that delete expired documents for you
- Finding and removing duplicate documents
- Archiving instead of deleting

## Syntax

```js show
db.c.updateOne(filter, { $set: { deletedAt: new Date() } })            // soft delete
db.c.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })      // TTL index
db.c.aggregate([ { $group: { _id: "$key", ids: { $push: "$_id" }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } } ])
```

## Examples

```js run destructive
const lab = db.getSiblingDB("lab_cleanup")
lab.users.insertMany([
  { _id: 1, name: "Ann", email: "ann@x.com" },
  { _id: 2, name: "Bob", email: "bob@x.com" },
  { _id: 3, name: "Ann again", email: "ann@x.com" },
  { _id: 4, name: "Cy", email: "cy@x.com" },
  { _id: 5, name: "Bob dup", email: "bob@x.com" },
  { _id: 6, name: "Ann third", email: "ann@x.com" }
]);
lab.users.countDocuments()
```

### Soft delete

Instead of removing a document, mark it. It stays for audits and can be restored:

```js run destructive
lab.users.updateOne({ _id: 4 }, { $set: { deletedAt: "2026-03-01" } })
lab.users.countDocuments({ deletedAt: { $exists: false } })
```

Every normal query now has to exclude deleted documents. A **view** hides that rule from callers:

```js run destructive
lab.createView("activeUsers", "users", [{ $match: { deletedAt: { $exists: false } } }]);
lab.activeUsers.countDocuments()
```

Restoring is just removing the flag:

```js run destructive
lab.users.updateOne({ _id: 4 }, { $unset: { deletedAt: "" } });
lab.activeUsers.countDocuments()
```

### Archive then delete

Copy the documents to an archive, then delete them from the live collection:

```js run destructive
lab.users.aggregate([{ $match: { _id: { $in: [5, 6] } } }, { $merge: { into: "users_archive" } }]);
lab.users.deleteMany({ _id: { $in: [5, 6] } });
[lab.users.countDocuments(), lab.users_archive.countDocuments()]
```

### TTL index: expire by time

A TTL index deletes documents once a date field is older than the limit. A background task checks about once a minute:

```js run destructive
lab.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600, name: "sessions_ttl" })
lab.sessions.getIndexes().filter((i) => i.expireAfterSeconds).map((i) => [i.name, i.expireAfterSeconds])
```

The field must hold a **date** (not text). A document is removed roughly one hour after its `createdAt`. To expire at a specific time per document, use `expireAfterSeconds: 0` and store the expiry date in the field.

### Finding duplicates

Group by the key that should be unique, and keep only groups with more than one document:

```js run destructive
lab.users.insertMany([{ _id: 7, name: "Ann 4", email: "ann@x.com" }, { _id: 8, name: "Bob 3", email: "bob@x.com" }]);
lab.users.aggregate([
  { $group: { _id: "$email", ids: { $push: "$_id" }, copies: { $sum: 1 } } },
  { $match: { copies: { $gt: 1 } } },
  { $sort: { _id: 1 } }
])
```

### Removing duplicates, keeping the first

Delete every document that is not the smallest `_id` of its group:

```js run destructive
const dupes = lab.users.aggregate([
  { $group: { _id: "$email", ids: { $push: "$_id" } } },
  { $project: { remove: { $slice: [{ $sortArray: { input: "$ids", sortBy: 1 } }, 1, 100] } } },
  { $unwind: "$remove" }
]).toArray().map((d) => d.remove).sort((a, b) => a - b);
const r = lab.users.deleteMany({ _id: { $in: dupes } });
[dupes, r.deletedCount]
```

```js run destructive
lab.users.find({}, { email: 1 }).sort({ _id: 1 }).toArray().map((d) => d._id + ":" + d.email)
```

### Prevent them next time

A unique index refuses duplicates from now on:

```js run destructive
lab.users.createIndex({ email: 1 }, { unique: true });
lab.users.getIndexes().map((i) => i.name)
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Write a script that finds users with the same `email`, ignoring case, and keeps the newest of each. Then add a unique index with a case-insensitive collation.

## Watch out

### Soft deletes leak into every query

If one query forgets the `deletedAt` condition, deleted data reappears. Use a view, or a helper in your data access layer, and index `deletedAt`.

### The TTL task is not exact

Documents may live up to a minute (or more under load) past their expiry. Do not rely on TTL for security-sensitive timing.

### TTL needs a date, and a single-field index

A text date is ignored. Compound indexes cannot be TTL indexes.

### Deleting duplicates is one-way

Back up or archive before removing them, and check the group counts. The wrong "keep" rule removes the better record.

### Legal deletion

If a user asks to be forgotten, a soft delete is not enough. You have to actually remove (or anonymise) the data, including backups per policy.

## Interview corner

**"What is a soft delete and what is its downside?"**
Marking a document as deleted instead of removing it. It keeps history and allows restore, but every query must filter it out, and data stays on disk.

**"How does a TTL index work?"**
A single-field index on a date with `expireAfterSeconds`. A background task deletes documents whose date is older than the limit.

**"How do you find and remove duplicates?"**
`$group` by the key collecting `_id`s, keep groups with count above 1, delete all but one `_id` per group, then add a unique index.

## Practice

### Warm-up: count duplicates

Insert emails `a, b, a, a, c` and return the number of emails that appear more than once.

```js practice destructive
// hint: `$group` by email, `$match` on count.
const lab = db.getSiblingDB("lab_cleanup")
lab.u.insertMany(["a", "b", "a", "a", "c"].map((e) => ({ email: e })));
const n = lab.u.aggregate([{ $group: { _id: "$email", c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }]).toArray().length
lab.dropDatabase();
n
```

### Core: soft delete

Insert three users, soft delete one, and return the number of users that are not deleted.

```js practice destructive
// hint: `deletedAt` and `$exists: false`.
const lab = db.getSiblingDB("lab_cleanup")
lab.u.insertMany([{ _id: 1 }, { _id: 2 }, { _id: 3 }]);
lab.u.updateOne({ _id: 2 }, { $set: { deletedAt: 1 } });
const n = lab.u.countDocuments({ deletedAt: { $exists: false } })
lab.dropDatabase();
n
```

### Stretch: the TTL definition

Create a TTL index on `createdAt` that expires documents after 120 seconds, and return its `expireAfterSeconds` value.

```js practice destructive
// hint: `createIndex(..., { expireAfterSeconds: 120 })`, then read `getIndexes()`.
const lab = db.getSiblingDB("lab_cleanup")
lab.u.createIndex({ createdAt: 1 }, { expireAfterSeconds: 120 });
const s = lab.u.getIndexes().find((i) => i.expireAfterSeconds !== undefined).expireAfterSeconds
lab.dropDatabase();
s
```
