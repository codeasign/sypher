---
title: "CREATE INDEX"
order: 0
---

An **index** is a sorted lookup structure that lets PostgreSQL find rows without reading the whole table. It works like the index at the back of a book: instead of reading every page to find a word, you jump straight to the right page. Adding the right index is the single most effective way to speed up a slow query.

## What you'll learn

- What an index does, and what it costs
- `CREATE INDEX`, `DROP INDEX` and how to list indexes
- Unique indexes, and `CREATE INDEX CONCURRENTLY`
- How to see the difference with `EXPLAIN`

## Syntax

```sql show
CREATE [UNIQUE] INDEX [CONCURRENTLY] index_name
ON table_name (column1 [, column2]);

DROP INDEX [IF EXISTS] index_name;
```

## Set up a table with no indexes

To see an index at work we need a table that has none. This copy of `payment` has the data, but not the keys and indexes of the original. `ANALYZE` gives the planner fresh statistics:

```sql run destructive
CREATE TABLE payment_plain AS SELECT * FROM payment;
ANALYZE payment_plain;

SELECT indexname FROM pg_indexes WHERE tablename = 'payment_plain';
```

No index at all. (`pg_indexes` lists every index; the empty result means none.)

## Measuring: how does PostgreSQL find the rows?

`EXPLAIN` shows the plan PostgreSQL chooses. `COSTS OFF` hides the estimated numbers so we can concentrate on the shape:

```sql run destructive
EXPLAIN (COSTS OFF)
SELECT * FROM payment_plain WHERE customer_id = 5;
```

`Seq Scan` means a **sequential scan**: PostgreSQL reads the **entire table**, row after row, to find customer 5's payments. To see how much work that was, add `ANALYZE`, which really runs the query and counts:

```sql run destructive
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT * FROM payment_plain WHERE customer_id = 5;
```

`Rows Removed by Filter` is how many rows were read and thrown away to find the few that matched.

## Add an index

```sql run destructive
CREATE INDEX idx_payment_plain_customer ON payment_plain (customer_id);
ANALYZE payment_plain;

EXPLAIN (COSTS OFF)
SELECT * FROM payment_plain WHERE customer_id = 5;
```

Now the plan uses the index instead of reading every row: a `Bitmap Index Scan` finds where customer 5's rows are, and a `Bitmap Heap Scan` fetches just those. Compare the work done:

```sql run destructive
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT * FROM payment_plain WHERE customer_id = 5;
```

No more `Rows Removed by Filter`: PostgreSQL went straight to customer 5's rows.

## A unique index

A `UNIQUE` index makes lookups fast **and** refuses duplicates:

```sql run destructive
CREATE UNIQUE INDEX uq_payment_plain_id ON payment_plain (payment_id);

SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'payment_plain' ORDER BY indexname;
```

## How big is an index?

Indexes take disk space, and it grows with the table:

```sql run destructive
SELECT pg_size_pretty(pg_relation_size('payment_plain')) AS table_size,
       pg_size_pretty(pg_relation_size('idx_payment_plain_customer')) AS index_size;
```

## Drop an index

```sql run destructive
DROP INDEX idx_payment_plain_customer;

SELECT indexname FROM pg_indexes WHERE tablename = 'payment_plain' ORDER BY indexname;
```

## Try it yourself

Create a copy of another table, look at the plan for a query on an unindexed column, add an index, and compare the plans again.

## Watch out

### Indexes are not free

Every index has to be updated on each `INSERT`, `UPDATE` and `DELETE`, so more indexes make **writes slower**. They also take disk space and memory. Add an index because a real query needs it, not "just in case".

### Index the columns you search and join on

The best candidates are columns in `WHERE`, `JOIN ... ON`, `ORDER BY` and `GROUP BY` of slow queries. Primary keys are indexed for you, but **foreign keys are not**: index them yourself (page 12.6).

### Low-value columns are poor candidates

An index on a column with only a few different values (a yes/no flag, or `rating` with five values) helps little, because each value matches a large fraction of the table. Look for columns with many different values (high **selectivity**).

### Building an index locks writes

A plain `CREATE INDEX` blocks inserts, updates and deletes on the table while it builds. On a live system use `CREATE INDEX CONCURRENTLY`, which takes longer but does not block writers. It cannot run inside a transaction, and if it fails it leaves an invalid index you must drop.

### An index only helps if the query can use it

A query written in the wrong way ignores the index entirely. Page 14.5 shows how that happens.

## Interview corner

**"What is an index, and why does it speed up queries?"**
A separate, sorted structure (a B-tree by default) that points to rows, so PostgreSQL can find them with a few lookups instead of scanning the table.

**"What is the downside of indexes?"**
They use space and slow down writes, because each index must be kept up to date. They can also stop `HOT` updates.

**"How do you add an index to a busy production table?"**
`CREATE INDEX CONCURRENTLY`, so writes are not blocked. Then check the index is valid.

**"Which columns should you index?"**
Those used often to filter, join or sort, especially with many different values, and foreign key columns.

## Practice

### Warm-up: count the indexes

The real `payment` table is partitioned. How many indexes does the **parent** table `payment` have in `pg_indexes`? Return one number, `index_count`.

```sql practice
-- hint: Count rows of `pg_indexes` where `tablename = 'payment'`.
SELECT COUNT(*) AS index_count FROM pg_indexes WHERE tablename = 'payment';
```

### Core: make a lookup fast

On a fresh unindexed copy `rental_plain` of `rental`, add an index on `customer_id`, then return the index names as `index_name` from `pg_indexes` for that table.

```sql practice destructive
-- hint: `CREATE TABLE rental_plain AS SELECT * FROM rental`, then `CREATE INDEX`.
CREATE TABLE rental_plain AS SELECT * FROM rental;
CREATE INDEX idx_rental_plain_customer ON rental_plain (customer_id);

SELECT indexname AS index_name FROM pg_indexes WHERE tablename = 'rental_plain';
```

### Stretch: prove the index is used

On a second copy `rental_plain2` (with the same index and fresh statistics), show the plan for `SELECT * FROM rental_plain2 WHERE customer_id = 7` (with `EXPLAIN (COSTS OFF)`), so you can see whether it says `Seq Scan` or an index-based scan.

```sql practice destructive
-- hint: `ANALYZE rental_plain;` first, then `EXPLAIN (COSTS OFF) ...`.
CREATE TABLE rental_plain2 AS SELECT * FROM rental;
CREATE INDEX idx_rental_plain2_customer ON rental_plain2 (customer_id);
ANALYZE rental_plain2;

EXPLAIN (COSTS OFF) SELECT * FROM rental_plain2 WHERE customer_id = 7;
```
