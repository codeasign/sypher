---
title: "Explore a Database"
order: 0
---

Before you query a database, you look around: which databases exist, which tables are in them, and what each table's columns are. Five small commands do all of it.

## What you'll learn

- `SHOW DATABASES` and `USE`
- `SHOW TABLES`
- `DESCRIBE`
- `SHOW CREATE TABLE`
- `SELECT VERSION()` and `SELECT DATABASE()`

## Syntax

```sql show
SHOW DATABASES;
USE database_name;
SHOW TABLES;
DESCRIBE table_name;
SHOW CREATE TABLE table_name;
```

## Examples

### SHOW DATABASES

Lists the databases your user is allowed to see:

```sql run
SHOW DATABASES;
```

`information_schema` is MySQL's built-in catalogue of everything it stores. `sypher-mysql-DvdRental` is our DVD Rental database.

### USE

Choose which database later commands apply to:

```sql run
USE `sypher-mysql-DvdRental`;
SELECT DATABASE() AS current_database;
```

The backticks are needed here because the name contains hyphens. Your connection command already selected this database, so this is just for practice. `DATABASE()` tells you which one is active.

### SHOW TABLES

```sql run rows=20
SHOW TABLES;
```

This list includes the base tables and also several **views** (saved queries that behave like tables, such as `customer_list`). You will build views in Module 15.

### DESCRIBE

Shows every column of one table, with its type and whether it can be empty:

```sql run rows=20
DESCRIBE film;
```

| Output column | Meaning |
|---|---|
| `Field` | the column name |
| `Type` | the data type, for example `varchar(128)` or `smallint unsigned` |
| `Null` | `YES` if the column may be empty |
| `Key` | `PRI` for the primary key, `MUL` for an indexed column |
| `Default` | the value used if none is given |
| `Extra` | extras such as `auto_increment` |

`DESC film;` is a shorter way to write the same thing.

### SHOW CREATE TABLE

Shows the exact statement that builds the table, including its keys and indexes:

```sql run raw
SHOW CREATE TABLE language;
```

This is the most complete description of a table, and a good way to learn how tables are built.

### VERSION()

```sql run
SELECT VERSION() AS mysql_version;
```

## Try it yourself

Paste any statement above into your lab prompt (see *Set Up Your Lab* for how to connect). Then run `DESCRIBE` on the tables `customer` and `rental`.

## Watch out

- **Backticks around odd names.** A name with hyphens or spaces, such as `sypher-mysql-DvdRental`, must be wrapped in backticks. Plain quotes will not work for names.
- **`USE` only lasts for your current connection.** A new connection starts with no database chosen unless you name one when connecting.
- **`SHOW` is MySQL-specific.** Other databases use different commands (`\dt` in PostgreSQL, for instance). The universal way is to query `information_schema`.

## Interview corner

**"How would you find out what columns a table has?"**
`DESCRIBE table_name` or `SHOW COLUMNS FROM table_name`. For the full definition including indexes, `SHOW CREATE TABLE table_name`.

**"How do you list every table using SQL rather than a `SHOW` command?"**
Query `information_schema.tables`:

```sql run rows=6
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'sypher-mysql-DvdRental'
ORDER BY table_name;
```

## Practice

### Warm-up: how many columns?

Use `information_schema.columns` to count how many columns the `customer` table has. Return one number called `column_count`.

```sql practice
-- hint: `information_schema.columns` has one row per column, with `table_schema` and `table_name` to filter on.
SELECT COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'sypher-mysql-DvdRental'
  AND table_name = 'customer';
```

### Core: which tables hold an email?

List the names of every table that has a column called `email`. Sort alphabetically.

```sql practice
-- hint: Filter `information_schema.columns` on `column_name = 'email'`, and sort by `table_name`.
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'sypher-mysql-DvdRental'
  AND column_name = 'email'
ORDER BY table_name;
```

### Stretch: the primary keys

Show every column in the DVD Rental database that is the **primary key** of its table, together with its table name. Order by table name, then column name. (In `information_schema.columns`, the `column_key` column is `PRI` for a primary key. Views have no keys, so they will not appear.)

```sql practice rows=8
-- hint: Filter `information_schema.columns` on `table_schema` and `column_key = 'PRI'`, then sort.
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'sypher-mysql-DvdRental'
  AND column_key = 'PRI'
ORDER BY table_name, column_name;
```
