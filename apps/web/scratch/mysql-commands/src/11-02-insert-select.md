---
title: "INSERT ... SELECT"
order: 0
---

`INSERT ... SELECT` fills a table from the result of a query. Instead of typing the values, you tell MySQL where to get them. It is how you copy, archive and transform data in bulk.

## What you'll learn

- Copying rows from one table into another
- Making a table with the same structure
- Creating a table from a query

## Syntax

```sql show
INSERT INTO target_table (column1, column2)
SELECT column1, column2
FROM source_table
WHERE condition;
```

The columns you insert into and the columns you select must match in number and type.

## Examples

### Copy some rows into a new table

First create an empty table with the same structure as `film`, then copy the long films into it:

```sql run destructive
CREATE TABLE film_long LIKE film;

INSERT INTO film_long
SELECT * FROM film WHERE length > 180;

SELECT COUNT(*) AS long_films_copied FROM film_long;

SELECT film_id, title, length FROM film_long ORDER BY film_id;
```

`CREATE TABLE ... LIKE` copies the columns and indexes, but no rows.

### Choose the columns

Insert only some columns. Here, a small table of active customers' emails:

```sql run destructive
CREATE TABLE customer_emails (
  customer_id SMALLINT UNSIGNED PRIMARY KEY,
  email VARCHAR(50) NOT NULL
);

INSERT INTO customer_emails (customer_id, email)
SELECT customer_id, email
FROM customer
WHERE active = 1;

SELECT COUNT(*) AS emails_stored FROM customer_emails;
```

### Create and fill in one step

`CREATE TABLE ... AS SELECT` builds the table from the query result in one go:

```sql run destructive
CREATE TABLE revenue_by_customer AS
SELECT customer_id, SUM(amount) AS total_spent
FROM payment
GROUP BY customer_id;

SELECT customer_id, total_spent
FROM revenue_by_customer
ORDER BY total_spent DESC, customer_id;
```

The new table gets the query's columns, but not the keys or indexes of the source.

### Transforming while copying

Calculations, joins and functions all work in the `SELECT`:

```sql run destructive
CREATE TABLE film_summary (
  film_id SMALLINT UNSIGNED PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  length_hours DECIMAL(4, 1) NOT NULL
);

INSERT INTO film_summary (film_id, label, length_hours)
SELECT film_id, CONCAT(title, ' (', rating, ')'), ROUND(length / 60, 1)
FROM film;

SELECT film_id, label, length_hours
FROM film_summary
ORDER BY film_id;
```

## Try it yourself

Copy all films of one rating into a new table, and create a table of the ten most expensive payments with `CREATE TABLE ... AS SELECT`.

## Watch out

### Column count must match

```sql run error destructive
CREATE TABLE tiny (a INT, b INT);
INSERT INTO tiny (a, b) SELECT film_id FROM film;
```

The `SELECT` returns one column (`film_id`) but the `INSERT` names two (`a, b`), so MySQL refuses with error 1136. The columns you insert into and the columns you select must match in number.

### Copying into a table with a primary key can collide

If you run the same `INSERT ... SELECT` twice into a table with a primary key, the second run fails with a duplicate-key error. Use `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE` (next pages) to handle re-runs.

### CREATE TABLE ... AS SELECT loses constraints

The new table has the data but no primary key, foreign keys or indexes. Use `CREATE TABLE ... LIKE` followed by `INSERT ... SELECT` when you need the structure too.

### A table you copy into is not kept in sync

The copy is a snapshot. Changes to the original later are not reflected.

## Interview corner

**"How do you copy data from one table into another?"**
`INSERT INTO target (cols) SELECT cols FROM source WHERE ...`.

**"What is the difference between `CREATE TABLE ... LIKE` and `CREATE TABLE ... AS SELECT`?"**
`LIKE` copies the structure (columns, keys, indexes) and no data. `AS SELECT` copies the query result's columns and data, but not the keys and indexes.

**"How would you back up a table quickly before a risky change?"**
`CREATE TABLE t_backup LIKE t;` then `INSERT INTO t_backup SELECT * FROM t;`.

## Practice

### Warm-up: copy the short films

Create a table `film_short` with the same structure as `film`, copy the films **shorter than 50 minutes** into it, and return the number of rows as `short_films`.

```sql practice destructive
-- hint: `CREATE TABLE film_short LIKE film;` then `INSERT INTO film_short SELECT * FROM film WHERE length < 50;`.
DROP TABLE IF EXISTS film_short;
CREATE TABLE film_short LIKE film;

INSERT INTO film_short
SELECT * FROM film WHERE length < 50;

SELECT COUNT(*) AS short_films FROM film_short;
```

### Core: a report table

Create `rating_report` from a query (`CREATE TABLE ... AS SELECT`) with `rating`, the number of `films` and the average `length` rounded to 1 decimal as `avg_length`. Then select all rows ordered by rating.

```sql practice destructive
-- hint: `CREATE TABLE rating_report AS SELECT rating, COUNT(*) AS films, ROUND(AVG(length), 1) AS avg_length FROM film GROUP BY rating;`
DROP TABLE IF EXISTS rating_report;
CREATE TABLE rating_report AS
SELECT rating, COUNT(*) AS films, ROUND(AVG(length), 1) AS avg_length
FROM film
GROUP BY rating;

SELECT rating, films, avg_length
FROM rating_report
ORDER BY rating;
```

### Stretch: a backup, then the count

Make a backup of the `category` table (structure and data) called `category_backup`, then return the number of rows in it as `backed_up`.

```sql practice destructive
-- hint: `CREATE TABLE ... LIKE`, then `INSERT ... SELECT *`.
DROP TABLE IF EXISTS category_backup;
CREATE TABLE category_backup LIKE category;

INSERT INTO category_backup SELECT * FROM category;

SELECT COUNT(*) AS backed_up FROM category_backup;
```
