---
title: "CREATE DATABASE and DROP DATABASE"
order: 0
---

A **database** is a named container for tables. You create one to hold a new project's tables, and you drop it to throw the whole project away. Because creating and dropping databases are powerful, ordinary users usually cannot do it. On this page we connect as the `root` administrator, and we practice in a scratch database, never in the DVD Rental data.

## What you'll learn

- `CREATE DATABASE` and `DROP DATABASE`
- Choosing a character set
- `IF NOT EXISTS` and `IF EXISTS`
- Why the learner account cannot do this

## Connect as an administrator

Creating databases needs more privileges than the practice account `sypher` has. Connect as `root` (same password as before):

```bash
docker compose exec mysql mysql -uroot -ppassword
```

## Syntax

```sql show
CREATE DATABASE database_name;
DROP DATABASE database_name;
```

`CREATE SCHEMA` and `DROP SCHEMA` mean exactly the same in MySQL.

## Examples

### Create a database

```sql run as=root destructive
DROP DATABASE IF EXISTS bookshop;

CREATE DATABASE bookshop;

SHOW DATABASES LIKE 'bookshop';
```

### Choose the character set

A **character set** decides which characters can be stored, and a **collation** decides how text is compared and sorted. `utf8mb4` covers every language and emoji, and is the right choice:

```sql run as=root destructive raw
DROP DATABASE IF EXISTS bookshop;

CREATE DATABASE bookshop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

SHOW CREATE DATABASE bookshop;
```

### Use it, and put a table in it

`USE` chooses the current database. You can also name a table with its database (`bookshop.author`) from anywhere:

```sql run as=root destructive
DROP DATABASE IF EXISTS bookshop;
CREATE DATABASE bookshop;

USE bookshop;
CREATE TABLE author (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL);
INSERT INTO author VALUES (1, 'Ursula Le Guin');

SHOW TABLES;

SELECT * FROM bookshop.author;
```

### Drop it

`DROP DATABASE` deletes the database, **all its tables and all their data**, immediately, with no question asked:

```sql run as=root destructive
DROP DATABASE IF EXISTS bookshop;
CREATE DATABASE bookshop;

DROP DATABASE bookshop;

SHOW DATABASES LIKE 'bookshop';
```

## Try it yourself

Create a database called `practice`, put two tables in it, list them, and drop it again. Then run `SHOW DATABASES` to make sure it is gone.

## Watch out

### Creating one that already exists is an error

```sql run as=root error destructive
DROP DATABASE IF EXISTS bookshop;
CREATE DATABASE bookshop;
CREATE DATABASE bookshop;
```

`CREATE DATABASE IF NOT EXISTS bookshop` does nothing (and no error) when it is already there.

### Dropping one that does not exist is an error too

```sql run as=root error destructive
DROP DATABASE no_such_database;
```

`DROP DATABASE IF EXISTS` is the tolerant form, and it is what you want at the top of a script you run many times.

### The practice account is not allowed

The learner account `sypher` only has rights on the DVD Rental database, so it cannot create new ones:

```sql run error
CREATE DATABASE bookshop;
```

That is a good thing: least privilege means an ordinary user cannot wipe out a whole database by accident.

### DROP DATABASE cannot be undone

There is no recycle bin. Only a backup (Module 16) brings the data back. Double-check the name before you press Enter, and be very careful on a server with real data.

### Names can be case-sensitive

On Linux, database and table names are case-sensitive (`Bookshop` and `bookshop` are different). On Windows and macOS they are not. Use lower-case names with underscores everywhere and you will never be surprised.

## Interview corner

**"What is the difference between a database and a schema in MySQL?"**
In MySQL they are the same thing. `CREATE SCHEMA` is a synonym for `CREATE DATABASE`. (In PostgreSQL and SQL Server, a schema is a namespace *inside* a database.)

**"What character set should you use?"**
`utf8mb4`. MySQL's older `utf8` is only a 3-byte subset and cannot store emoji or some rare characters.

**"How do you avoid an error when creating or dropping in a script?"**
`CREATE DATABASE IF NOT EXISTS ...` and `DROP DATABASE IF EXISTS ...`.

## Practice

### Warm-up: create and confirm

As `root`, create a database `library`, then run `SHOW DATABASES LIKE 'library'` to prove it exists.

```sql practice as=root destructive
-- hint: `DROP DATABASE IF EXISTS library;` first makes it safe to re-run.
DROP DATABASE IF EXISTS library;
CREATE DATABASE library;

SHOW DATABASES LIKE 'library';
```

### Core: a table in it

In `library`, create a table `book` with columns `id INT PRIMARY KEY` and `title VARCHAR(100) NOT NULL`, insert one book, and return the row (`id`, `title`).

```sql practice as=root destructive
-- hint: `USE library;` then CREATE TABLE and INSERT, then SELECT.
DROP DATABASE IF EXISTS library;
CREATE DATABASE library;

USE library;
CREATE TABLE book (id INT PRIMARY KEY, title VARCHAR(100) NOT NULL);
INSERT INTO book VALUES (1, 'A Wizard of Earthsea');

SELECT id, title FROM book;
```

### Stretch: drop it and prove it

Create a database `temp_area`, then drop it, and return the number of databases named `temp_area` as `remaining` (it should be 0).

```sql practice as=root destructive
-- hint: Count the rows in `information_schema.schemata` where `schema_name = 'temp_area'`.
DROP DATABASE IF EXISTS temp_area;
CREATE DATABASE temp_area;
DROP DATABASE temp_area;

SELECT COUNT(*) AS remaining
FROM information_schema.schemata
WHERE schema_name = 'temp_area';
```
