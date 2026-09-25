---
title: "Databases: Create, List and Drop"
order: 0
---

MongoDB has no `CREATE DATABASE` command. A database appears the first moment you store something in it, and disappears when you drop it. This page shows how to list, create, inspect and remove databases safely.

## What you'll learn

- Listing databases and switching between them
- How a database comes into existence
- Reading database statistics
- Dropping a database, and why that needs care

## Syntax

```js show
show dbs                          // shell command
db.getMongo().getDBNames()        // the same, as code
db.getSiblingDB("name")           // point at another database
db.dropDatabase()                 // delete the current database
```

## Examples

### List the databases

```js run destructive
db.getMongo().getDBNames().sort()
```

### A database is created by its first write

Asking for a database that does not exist creates nothing. Only a write does:

```js run destructive
const lab = db.getSiblingDB("lab_shop")
db.getMongo().getDBNames().includes("lab_shop")
```

```js run destructive
lab.items.insertOne({ name: "pen" })
db.getMongo().getDBNames().includes("lab_shop")
```

### Look inside it

```js run destructive
lab.getCollectionNames()
```

```js run destructive
const st = lab.stats();
[st.db, Number(st.collections), Number(st.objects)]
```

### Drop it

`dropDatabase()` removes the database and everything in it. There is no undo:

```js run destructive
lab.dropDatabase()
```

```js run destructive
db.getMongo().getDBNames().includes("lab_shop")
```

### Reserved databases

`admin`, `local` and `config` belong to the server. They hold users, replication data and cluster settings. Leave them alone unless you are administering the server:

```js run
db.getMongo().getDBNames().filter((n) => ["admin", "local", "config"].includes(n)).sort()
```

## Try it yourself

Create a database called `lab_notes` with one document in a collection `todo`, check that it appears in the list, then drop it and check that it is gone.

## Watch out

### `dropDatabase()` drops the *current* database

If `db` points at your real database, that is the one that disappears. Print `db.getName()` first, every time.

### Typing a name creates nothing

`use lab_typo` succeeds even if you mistyped. The database only appears after the first insert, so a typo quietly writes into a brand-new database instead of failing.

### Names have rules

A database name cannot contain `/ \ . " $` or spaces, and must be shorter than 64 characters. Names are case sensitive: `Shop` and `shop` are different, and case-only differences can be rejected on some platforms.

### Empty databases are not kept

If you drop the last collection of a database, the database disappears from the list.

## Interview corner

**"How do you create a database in MongoDB?"**
You do not create it explicitly. `use name` selects it, and it is created when the first document or collection is written.

**"How do you delete a database?"**
Switch to it and run `db.dropDatabase()`.

**"What are `admin`, `local` and `config`?"**
System databases: `admin` holds users and roles, `local` holds replication data (the oplog) and is never replicated, `config` holds cluster metadata for sharding and sessions.

## Practice

### Warm-up: which database am I in?

Return the name of the current database.

```js practice
// hint: `db.getName()`.
db.getName()
```

### Core: create and detect

Create the database `lab_quiz` by inserting one document into `questions`, then return whether it is in the database list (`true`). Afterwards drop it, so your lab stays clean.

```js practice destructive
// hint: `getSiblingDB`, `insertOne`, then look at `getDBNames()`.
const q = db.getSiblingDB("lab_quiz")
q.questions.insertOne({ text: "2+2" });
const seen = db.getMongo().getDBNames().includes("lab_quiz")
q.dropDatabase();
seen
```

### Stretch: count the collections

Return the number of collections in the `admin` database that are **not** system collections (their names do not start with `system.`).

```js practice
// hint: `db.getSiblingDB("admin").getCollectionNames()` and a filter.
db.getSiblingDB("admin").getCollectionNames().filter((n) => !n.startsWith("system.")).length
```
