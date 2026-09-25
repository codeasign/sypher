---
title: "Backup, Restore and Watching the Server"
order: 0
---

Security is also about **recovering**: a backup you have never restored is a hope, not a backup. This page runs a real dump and restore of a collection after a deliberate disaster, then looks at the tools for watching a running server: `currentOp`, `killOp` and the profiler.

## What you'll learn

- `mongodump` and `mongorestore` with archives
- Restoring after data loss, and checking that indexes and rules came back
- Finding slow or stuck operations with `currentOp` and the profiler
- A backup checklist

## Syntax

```bash
mongodump --uri "mongodb://user:pwd@host/?authSource=admin" --db shop --archive=shop.gz --gzip
mongorestore --uri "mongodb://user:pwd@host/?authSource=admin" --archive=shop.gz --gzip --drop
```

## Examples

### Step 1: back up a collection

`mongodump` runs inside the lab container. The archive is one compressed file. The command prints progress lines with timestamps, so we keep only the summary line:

```bash run
docker compose exec -T mongodb mongodump --uri "mongodb://sypher:password@localhost:27017/?authSource=admin" --db sypher-mongodb-DvdRental --collection films --archive=/tmp/films.archive --gzip 2>&1 | grep -o "done dumping [^ ]* ([0-9]* documents)"
```

### Step 2: the disaster

Somebody runs the wrong delete:

```js run destructive
db.films.deleteMany({});
[db.films.countDocuments(), db.films.getIndexes().length]
```

### Step 3: restore

`--drop` removes the damaged collection first. The restore also recreates the indexes and the validator, because they are part of the dump:

```bash run
docker compose exec -T mongodb mongorestore --uri "mongodb://sypher:password@localhost:27017/?authSource=admin" --archive=/tmp/films.archive --gzip --drop 2>&1 | grep -o "[0-9]* document(s) restored successfully"
```

### Step 4: verify

Count the documents, the indexes and the rules:

```js run destructive
[db.films.countDocuments(), db.films.getIndexes().length, !!db.getCollectionInfos({ name: "films" })[0].options.validator]
```

Everything is back: 1000 documents, 4 indexes, the validator.

### Clean the archive

```bash run
docker compose exec -T mongodb rm /tmp/films.archive && echo removed
```

### currentOp: what is running now?

`currentOp` lists operations in progress. Filter it to find long ones, or to see who is doing what:

```js run
db.getSiblingDB("admin").aggregate([{ $currentOp: { allUsers: true } }, { $match: { active: true, "command.aggregate": { $exists: true } } }, { $project: { _id: 0, ns: 1, secs: { $ifNull: ["$secs_running", 0] } } }, { $limit: 1 }]).toArray().length
```

The one operation is the aggregation that is asking the question. To stop a runaway operation use `db.killOp(opid)` with the `opid` from `currentOp`.

### The profiler: record slow operations

Level 1 records operations slower than a threshold, level 2 records everything. It writes to `system.profile` of that database:

```js run destructive
const lab = db.getSiblingDB("lab_ops");
lab.t.insertMany(Array.from({ length: 2000 }, (_, i) => ({ _id: i, a: i % 10 })));
lab.setProfilingLevel(2);
lab.t.find({ a: 3 }).toArray();
lab.setProfilingLevel(0);
const p = lab.system.profile.find({ ns: "lab_ops.t", op: "query" }).sort({ ts: -1 }).limit(1).toArray()[0];
({ op: p.op, ns: p.ns, planSummary: p.planSummary })
```

Each profile entry also records how many documents were examined and how long the operation took (left out here because they change from run to run), and which plan ran. That is how you find slow queries in production.

### Clean up

```js run destructive
db.getSiblingDB("lab_ops").dropDatabase()
```

## A backup checklist

1. **Automate** dumps or snapshots, and keep several generations.
2. **Store copies elsewhere** (another machine, another region).
3. **Test restores** regularly, and time them.
4. **Encrypt** backups and protect access (they contain everything, including password hashes).
5. Know your **recovery point** (how much data you can lose) and **recovery time** (how long an outage is acceptable).
6. For replica sets, use **oplog-based** backups or filesystem snapshots for point-in-time recovery.

## Try it yourself

Dump a collection to an archive, restore it into a **different** database with `--nsFrom` and `--nsTo`, and compare the counts of the two.

## Watch out

### `--drop` deletes before it restores

It is right for a repair, dangerous if the archive is bad. Restore into a scratch database first if you are unsure.

### `mongodump` is a logical backup

It reads documents through the server, which is slow on very large data and does not capture a consistent moment on a busy cluster unless you use `--oplog`. For big systems use snapshots or a managed backup.

### Backups contain secrets

The staff password hashes in `stores` are in the dump. Protect and encrypt the archive.

### The profiler slows the server at level 2

Use level 1 with a threshold in production (`setProfilingLevel(1, { slowms: 100 })`), and turn it off when done.

### `killOp` is a last resort

It interrupts an operation, which may leave work half done (though writes stay atomic per document). Fix the cause, not only the symptom.

## Interview corner

**"How do you back up MongoDB?"**
`mongodump` (logical), filesystem or volume snapshots with the journal, or a managed backup service. For replica sets, snapshots plus the oplog give point-in-time recovery.

**"How do you know a backup works?"**
By restoring it regularly into a test environment and checking counts, indexes and application behaviour.

**"How do you find slow queries?"**
The database profiler (`system.profile`), `currentOp` for what is running now, and `explain("executionStats")` for a specific query.

## Practice

### Warm-up: profile level

Return the current profiling level of the `admin` database (a number).

```js practice
// hint: `db.getSiblingDB("admin").getProfilingStatus().was`.
db.getSiblingDB("admin").getProfilingStatus().was
```

### Core: a scratch backup in the database itself

Without files, copy `stores` into `stores_backup` with `$out`, delete one store, restore it from the backup with `$merge`, and return the number of stores.

```js practice destructive
// hint: `$out` then `deleteOne`, then `$merge` back.
db.stores.aggregate([{ $out: "stores_backup" }]);
db.stores.deleteOne({ _id: 2 });
db.stores_backup.aggregate([{ $merge: { into: "stores", on: "_id", whenNotMatched: "insert", whenMatched: "keepExisting" } }]);
const n = db.stores.countDocuments();
db.stores_backup.drop();
n
```

### Stretch: profile one query

In a scratch database, set the profiling level to 2, run a `find`, set it to 0, and return the `op` of the last profile entry for that namespace.

```js practice destructive
// hint: Read `system.profile` filtered by `ns`.
const lab = db.getSiblingDB("lab_ops");
lab.t.insertMany([{ a: 1 }, { a: 2 }]);
lab.setProfilingLevel(2);
lab.t.find({ a: 1 }).toArray();
lab.setProfilingLevel(0);
const op = lab.system.profile.find({ ns: "lab_ops.t", op: "query" }).sort({ ts: -1 }).limit(1).toArray()[0].op;
lab.dropDatabase();
op
```
