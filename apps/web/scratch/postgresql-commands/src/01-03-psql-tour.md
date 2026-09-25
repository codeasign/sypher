---
title: "A Tour of psql"
order: 0
---

`psql` is PostgreSQL's command-line client. Besides running SQL, it has its own small commands, all starting with a backslash, that show you what is in the database. Learn these eight and you can explore any PostgreSQL database.

## What you'll learn

- Backslash commands versus SQL statements
- `\dt`, `\d`, `\dn`, `\dv`, `\df`: look around
- `\x`: read wide rows
- `\timing`, `\i` and `\copy`: measure, run a file, move data

## Syntax

```sql show
\command [arguments]      -- psql command: no semicolon
SELECT ...;               -- SQL: ends with a semicolon
```

A backslash command is handled by `psql` itself, not sent to the server, and it ends at the end of the line. SQL statements always end with `;`. Inside the SQL boxes of this course you will only see SQL, and this page uses `psql` boxes for the commands.

## Examples

### Where am I?

`\conninfo` prints the server, port, user and database you are connected to (the details differ on every machine, so it is not run here):

```sql show
\conninfo
```

### List the tables

`\dt` lists the tables of the current schema. The `payment` table is stored as several monthly pieces, so you see those too:

```psql
\dt
```

### Describe one table

`\d table_name` shows the columns, their types, and everything attached to the table (keys, indexes, triggers):

```psql
\d category
```

Add a `+` (`\d+ category`) for extra detail such as storage and descriptions.

### Schemas, views and functions

A **schema** is a folder of tables inside a database. `\dn` lists them, `\dv` lists views, and `\df` lists functions (a pattern such as `film*` narrows the list):

```psql
\dn
\df film*
```

### Wide rows: expanded display

A row with many columns is hard to read across the screen. `\x` switches to one column per line:

```psql
\x
SELECT * FROM film WHERE film_id = 1;
\x
```

### Timing, files and copying

These are shown here rather than run, because their results depend on your machine:

```sql show
\timing on                         -- print how long every query takes
\i my_queries.sql                  -- run the SQL in a file
\copy film TO 'films.csv' CSV HEADER   -- save a table as a CSV file on YOUR computer
\?                                 -- help for all backslash commands
\h SELECT                          -- help for one SQL command
\q                                 -- quit
```

## Try it yourself

Connect with `psql` (see the previous page) and run `\dt`, then `\d film`, then `\d rental`. Notice the two odd things in `rental`: a column called `rental_period` (you will learn what it is soon), and the triggers listed at the bottom.

## Watch out

### No semicolon after a backslash command

`\dt;` looks harmless but can give an error. A backslash command ends at the end of the line.

### `\d` needs quotes for unusual names

A table called `Order` (with a capital) must be written `\d "Order"`, because PostgreSQL folds unquoted names to lower case. The same rule applies to SQL.

### Backslash commands only work in psql

They are not SQL. A tool such as DBeaver or an application cannot run `\dt`. The universal way to look around is to query `information_schema` or the `pg_catalog` tables, which you will use on the next page.

## Interview corner

**"How do you see the structure of a table in psql?"**
`\d table_name`. For the same information from SQL, query `information_schema.columns`.

**"How do you list all databases, and how do you switch?"**
`\l` lists them, and `\c database_name` connects to another one.

**"What is the difference between `\d` and `\d+`?"**
`\d+` adds detail: storage type, statistics targets, table size and comments.
