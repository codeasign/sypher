---
title: "EXPLAIN"
order: 0
---

`EXPLAIN` shows **how MySQL plans to run a query**: which indexes it will use, in what order it will read the tables, and roughly how many rows it expects to touch. It is the first tool you reach for when a query is slow, and a very common interview topic.

## What you'll learn

- How to read the columns of `EXPLAIN`
- The `type` column, from best to worst
- What `Using filesort` and `Using index` mean
- Explaining a join

## Syntax

```sql show
EXPLAIN SELECT ... ;
EXPLAIN FORMAT=TREE SELECT ... ;
```

`EXPLAIN` does not run the query. It only shows the plan.

## Step zero: refresh the statistics

`EXPLAIN` is only as good as MySQL's **statistics** about a table: how many rows it has and how many different values each index holds. MySQL updates them in the background, but right after a database is first loaded they can be missing or badly out of date. Then MySQL may show a full scan even though a perfectly good index exists, and every number on this page would look wrong. Refresh them before you experiment:

```sql run
ANALYZE TABLE payment, rental, customer, film;
```

Run this whenever a plan looks strange after a big load or a big change.

## The columns that matter

| Column | What it tells you |
|---|---|
| `type` | how rows are found (the most important column) |
| `key` | the index MySQL chose (`NULL` means none) |
| `possible_keys` | the indexes it could have used |
| `rows` | an estimate of rows to examine |
| `Extra` | notes such as `Using filesort` or `Using index` |

The real output has a few more columns (`partitions` and `filtered`, and `select_type`, which is `SIMPLE` for every query on this page). The tables below leave those out so that the columns you need fit on the screen.

The `type` values, from best to worst:

| `type` | Meaning |
|---|---|
| `const` | at most one row, found by a primary or unique key |
| `eq_ref` | one row per row of the previous table (join on a key) |
| `ref` | several rows, found by a non-unique index |
| `range` | a range of an index (`BETWEEN`, `>`, `<`, `IN`) |
| `index` | the whole index is scanned |
| `ALL` | the whole table is scanned (the one to avoid) |

## Examples

### const: one row by primary key

```sql run
EXPLAIN SELECT * FROM payment WHERE payment_id = 100;
```

### ref: several rows by an index

```sql run
EXPLAIN SELECT * FROM payment WHERE customer_id = 5;
```

### range: a slice of an index

```sql run
EXPLAIN SELECT * FROM payment WHERE payment_id BETWEEN 100 AND 200;
```

### ALL: no index, read everything

`amount` has no index, so MySQL has to read the whole table:

```sql run
EXPLAIN SELECT * FROM payment WHERE amount > 5;
```

### Using filesort: sorting without an index

Sorting by an unindexed column makes MySQL sort the rows itself:

```sql run
EXPLAIN SELECT payment_id, amount FROM payment ORDER BY amount;
```

`Using filesort` in `Extra` means an extra sorting step. (It has nothing to do with files on disk, despite the name.)

### Using index: a covering index

If every column the query needs is inside the index itself, MySQL never reads the table:

```sql run
EXPLAIN SELECT customer_id FROM payment WHERE customer_id = 5;
```

`Using index` is good news: the index alone answered the query.

### Explaining a join

For a join, `EXPLAIN` gives one row per table, in the order MySQL will read them:

```sql run
EXPLAIN
SELECT c.last_name, r.rental_date
FROM customer AS c
JOIN rental AS r ON r.customer_id = c.customer_id
WHERE c.customer_id = 5;
```

### The tree format

`FORMAT=TREE` prints the plan as a tree, which some people find easier to read for joins:

```sql run raw
EXPLAIN FORMAT=TREE SELECT * FROM payment WHERE customer_id = 5;
```

## Try it yourself

Run `EXPLAIN` on a few of your own queries from earlier in this course. Which ones scan the whole table (`ALL`)? Which use an index?

## Watch out

### `rows` is an estimate

The number is a guess from statistics about the table, not a count. It can be off, especially after big changes. `ANALYZE TABLE` refreshes the statistics, and `EXPLAIN ANALYZE` (page 14.5) shows what really happened.

### `type: ALL` is fine on a tiny table

On a table with 20 rows, a full scan is faster than using an index. Do not add indexes to fix a "problem" on small tables.

### `key: NULL` with `possible_keys` filled in

MySQL saw an index it could use but decided a scan was cheaper, usually because the query matches a large share of the table.

### EXPLAIN shows the plan, not the result

The plan can change when the data or statistics change. A query that is fast today may switch to a worse plan as the table grows.

## Interview corner

**"How do you find out why a query is slow?"**
Run `EXPLAIN` and look for `type = ALL`, a `NULL` key, a large `rows` estimate, and `Using filesort` or `Using temporary`. Then add or change an index, or rewrite the query.

**"What does `type = ref` mean? And `ALL`?"**
`ref`: rows found through a non-unique index. `ALL`: a full table scan.

**"What does `Using index` mean in `Extra`?"**
A covering index: the query was answered from the index alone, without reading table rows.

**"What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?"**
`EXPLAIN` shows the plan without running the query. `EXPLAIN ANALYZE` runs it and adds real timings and row counts.

## Practice

### Warm-up: which index?

Run `EXPLAIN` for `SELECT * FROM customer WHERE last_name = 'SMITH'`. Return the `EXPLAIN` output.

```sql practice
-- hint: Just put EXPLAIN in front of the query. `customer` has an index on `last_name`.
EXPLAIN SELECT * FROM customer WHERE last_name = 'SMITH';
```

### Core: an unindexed column

Run `EXPLAIN` for `SELECT * FROM customer WHERE email = 'MARY.SMITH@sakilacustomer.org'`. Is `type` `ALL` or an index lookup?

```sql practice
-- hint: `email` has no index in this table.
EXPLAIN SELECT * FROM customer WHERE email = 'MARY.SMITH@sakilacustomer.org';
```

### Stretch: a covering query

Run `EXPLAIN` for `SELECT customer_id FROM rental WHERE customer_id = 5` and check the `Extra` column.

```sql practice
-- hint: The index on `customer_id` holds everything the query needs.
EXPLAIN SELECT customer_id FROM rental WHERE customer_id = 5;
```
