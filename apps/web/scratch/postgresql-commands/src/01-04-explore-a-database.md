---
title: "Explore a Database with SQL"
order: 0
---

`psql` has its own commands for looking around, but every PostgreSQL tool can run SQL. This page shows the SQL way, which is also how you answer "what is in this database?" in an interview.

## What you'll learn

- `SELECT version()`, `current_database()` and friends
- `information_schema`: the standard catalogue
- `pg_catalog`: PostgreSQL's own catalogue
- Comments: `--` and `/* */`

## Syntax

```sql show
SELECT column1
FROM information_schema.tables;    -- standard: works in most databases
SELECT relname
FROM pg_catalog.pg_class;          -- PostgreSQL only: more detail
```

## Examples

### Who and where

```sql run
SELECT version() AS server_version;
```

```sql run
SELECT current_database() AS db, current_user AS me, current_schema() AS schema;
```

### The tables

`information_schema.tables` has one row per table and view:

```sql run
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name
LIMIT 8;
```

`BASE TABLE` is a real table, `VIEW` is a saved query.

### The columns of one table

```sql run rows=6
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'film'
ORDER BY ordinal_position;
```

Some of these types are PostgreSQL specials: `ARRAY`, `USER-DEFINED` (an enum) and `tsvector` (text prepared for searching). Module 13 covers them.

### Schemas

```sql run
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg\_%' AND schema_name <> 'information_schema'
ORDER BY schema_name;
```

### PostgreSQL's own catalogue

`pg_catalog` holds the real internals. For example, how many indexes does each table have, and how many columns? (`pg_class` lists every table, index and view; `pg_index` links an index to its table.)

```sql run
SELECT c.relname AS table_name,
       c.relnatts AS columns,
       (SELECT COUNT(*) FROM pg_index i WHERE i.indrelid = c.oid) AS indexes
FROM pg_class c
WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace AND c.relname IN ('film', 'rental', 'customer')
ORDER BY c.relname;
```

Sizes on disk (`pg_relation_size`, `pg_size_pretty`) come from the same catalogue, and page 11.5 uses them.

## Comments

A comment is text PostgreSQL ignores. Use them to explain a query, or to switch part of it off:

```sql run
-- everything after two dashes to the end of the line is ignored
SELECT 1 + 1 AS two; -- this works too

/* a block comment can
   span several lines */
SELECT title
FROM film
WHERE film_id <= 3 /* AND rating = 'PG' */
ORDER BY film_id;
```

## Try it yourself

Use `information_schema.columns` to list the columns of `customer` and `rental`. Which column names appear in both?

## Watch out

### `information_schema` is standard, `pg_catalog` is precise

`information_schema` works in other databases too, but hides PostgreSQL-only objects. `pg_catalog` shows everything.

### Names are folded to lower case

`WHERE table_name = 'Film'` finds nothing, because the table is stored as `film`. Table and column names you create without quotes are always lower case.

### Backticks are not PostgreSQL

If you know MySQL: PostgreSQL quotes names with double quotes (`"my table"`), and single quotes are always text.

## Interview corner

**"How do you list every table in a PostgreSQL database with SQL?"**
`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';` (or `pg_tables` / `pg_class` for more detail).

**"How do you write comments in PostgreSQL?"**
`-- to the end of the line`, and `/* ... */` for blocks. Block comments can be nested.

## Practice

### Warm-up: how many columns?

Use `information_schema.columns` to count how many columns the `customer` table has. Return one number called `column_count`.

```sql practice
-- hint: `information_schema.columns` has one row per column, with `table_schema` and `table_name` to filter on.
SELECT COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customer';
```

### Core: which tables hold an email?

List the names of every table (or view) in the `public` schema that has a column called `email`. Sort alphabetically.

```sql practice
-- hint: Filter `information_schema.columns` on `column_name = 'email'`, and sort by `table_name`.
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'email'
ORDER BY table_name;
```

### Stretch: the primary keys

List every primary-key column in the `public` schema together with its table name, ordered by table name and then column name. Use `information_schema.key_column_usage` joined to `information_schema.table_constraints`, and show the first rows.

```sql practice rows=8
-- hint: `table_constraints.constraint_type = 'PRIMARY KEY'`, joined to `key_column_usage` on `constraint_name` and `table_name`.
SELECT kcu.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name AND kcu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
ORDER BY kcu.table_name, kcu.column_name;
```
