---
title: "CREATE DATABASE and CREATE SCHEMA"
order: 0
---

A **database** is a named container for everything in a project. Inside it, a **schema** is a folder for tables, views and functions. You create a database to hold a new project, and schemas to keep its parts apart.

## What you'll learn

- `CREATE DATABASE` and `DROP DATABASE`
- `CREATE SCHEMA` and the `search_path`
- `IF NOT EXISTS` and `IF EXISTS`
- Why PostgreSQL has both databases and schemas

## Syntax

```sql show
CREATE DATABASE database_name;
DROP DATABASE [IF EXISTS] database_name;

CREATE SCHEMA [IF NOT EXISTS] schema_name;
DROP SCHEMA [IF EXISTS] schema_name [CASCADE];
```

## Examples

### Create a database

We practise in a scratch database, never in the DVD Rental data. Your lab account `sypher` may create databases:

```sql run destructive
CREATE DATABASE bookshop;

SELECT datname FROM pg_database WHERE datname = 'bookshop';
```

### Connect to it and put a table in it

In `psql`, `\c` switches database. In the same session, everything after it runs in the new database:

```psql destructive
CREATE DATABASE library;
\c library
CREATE TABLE author (author_id int PRIMARY KEY, name text NOT NULL);
INSERT INTO author VALUES (1, 'Ursula K. Le Guin');
SELECT current_database() AS db, * FROM author;
```

A database is a separate world: you cannot join tables across two databases in one query.

### Choose the encoding

```sql run destructive
CREATE DATABASE atlas ENCODING 'UTF8' TEMPLATE template0;

SELECT datname, pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = 'atlas';
```

`UTF8` covers every language and emoji, and is the right choice. `TEMPLATE template0` gives a clean starting point.

### Schemas: folders inside a database

Every database starts with a schema called `public`. Create your own to group related tables:

```sql run destructive
CREATE SCHEMA shop;
CREATE TABLE shop.product (product_id int PRIMARY KEY, name text NOT NULL);
INSERT INTO shop.product VALUES (1, 'Notebook');

SELECT * FROM shop.product;
```

### The search path

When you write a table name without a schema, PostgreSQL looks in the schemas of the **search path**, in order:

```sql run destructive
SHOW search_path;

SET search_path = shop, public;
SELECT * FROM product;
```

Because `shop` is first on the path, `product` now means `shop.product`.

### Copy a whole database

Because databases are created from a template, you can clone one in seconds. This is how this lab resets itself:

```sql run destructive
CREATE DATABASE shop_backup TEMPLATE bookshop;

SELECT datname FROM pg_database WHERE datname LIKE 'shop%' OR datname = 'bookshop' ORDER BY datname;
```

## Try it yourself

Create a database called `practice`, put two tables in it, list them, and drop it again. Then run `\l` (or query `pg_database`) to make sure it is gone.

## Watch out

### Creating one that already exists is an error

`CREATE DATABASE` has no `IF NOT EXISTS` in PostgreSQL. `CREATE SCHEMA IF NOT EXISTS` does exist:

```sql run error destructive
CREATE DATABASE bookshop;
CREATE DATABASE bookshop;
```

### You cannot drop the database you are connected to

Connect to another one first (`\c postgres`), then `DROP DATABASE`. Other connections must be closed, or use `DROP DATABASE ... WITH (FORCE)`.

### DROP DATABASE cannot be undone

There is no recycle bin. Only a backup (Module 16) brings the data back. Double-check the name.

### Names fold to lower case

`CREATE DATABASE Bookshop` creates `bookshop`. Only a double-quoted name keeps its capitals, and then you must quote it every time. Use lower-case names with underscores everywhere.

### A schema is not a security boundary by itself

Schemas group objects. Access is controlled with privileges (`GRANT USAGE ON SCHEMA`, Module 16).

## Interview corner

**"What is the difference between a database and a schema in PostgreSQL?"**
A database is a separate world with its own catalogues; you cannot query across two databases in one statement. A schema is a namespace inside a database, so tables of different schemas can share a name and be joined. (In MySQL, "schema" and "database" mean the same thing.)

**"What is the `search_path`?"**
The list of schemas PostgreSQL searches, in order, for an unqualified table name. The default is `"$user", public`.

**"How do you create a copy of a database?"**
`CREATE DATABASE new TEMPLATE old` (no one may be connected to `old`), or `pg_dump` and restore.

## Practice

### Warm-up: create and confirm

Create a database `library2` and return how many databases with that name exist, as `found` (it should be 1).

```sql practice destructive
-- hint: `CREATE DATABASE library2`, then count in `pg_database`.
CREATE DATABASE library2;

SELECT COUNT(*) AS found FROM pg_database WHERE datname = 'library2';
```

### Core: a table in a schema

Create a schema `school`, a table `school.student (student_id int PRIMARY KEY, name text)`, insert one student, and return the row.

```sql practice destructive
-- hint: Qualify the table name with the schema.
CREATE SCHEMA school;
CREATE TABLE school.student (student_id int PRIMARY KEY, name text);
INSERT INTO school.student VALUES (1, 'Maya');

SELECT * FROM school.student;
```

### Stretch: drop it and prove it

Create a database `temp_area`, then drop it, and return the number of databases named `temp_area` as `remaining` (it should be 0).

```sql practice destructive
-- hint: `DROP DATABASE temp_area` from a different database.
CREATE DATABASE temp_area;
DROP DATABASE temp_area;

SELECT COUNT(*) AS remaining FROM pg_database WHERE datname = 'temp_area';
```
