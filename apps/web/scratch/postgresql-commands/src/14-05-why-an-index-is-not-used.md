---
title: "Why an Index Is Not Used"
order: 0
---

You added an index, and the query is still slow. In most cases the index exists but the query is written in a way that **cannot use it**, or PostgreSQL correctly decides a scan is cheaper. This page shows the usual culprits, each proved with `EXPLAIN`, and how to rewrite the query so the index works.

## What you'll learn

- The habits that make PostgreSQL ignore an index
- How to rewrite each one
- How to spot the problem in `EXPLAIN`

## Set up

A table of 300000 rows with a primary key on `id` and an index on the timestamp `ts`:

```sql run destructive
CREATE TABLE big AS
SELECT g AS id, md5(g::text) AS txt, timestamp '2020-01-01' + g * interval '1 minute' AS ts, g % 7 AS grp
FROM generate_series(1, 300000) g;
ALTER TABLE big ADD PRIMARY KEY (id);
CREATE INDEX idx_big_ts ON big (ts);
VACUUM (ANALYZE) big;
```

An index is being ignored when the plan shows `Seq Scan` on a big table although a suitable index exists.

## Cause 1: a function on the column

Wrapping the column in a function forces PostgreSQL to compute it for every row, so it cannot search the index. Here `ts` is inside `date_trunc()`:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE date_trunc('day', ts) = '2020-03-01';
```

Rewrite it as a range on the bare column, and the index works:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE ts >= '2020-03-01' AND ts < '2020-03-02';
```

The results are identical. **Keep the column on its own side of the comparison.** (The other fix is an expression index on `date_trunc('day', ts)`, page 14.3.)

## Cause 2: arithmetic or a cast on the column

`id + 1 = 501` and `id::text = '500'` both hide `id` from the index:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE id::text = '500';
```

Compare the direct form, with the value on the other side:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE id = 500;
```

## Cause 3: a leading wildcard

A `LIKE` that starts with `%` cannot use a B-tree, because the index is sorted by the *start* of the text. Page 14.4 showed the `pg_trgm` fix.

## Cause 4: an OR where one side has no index

An `OR` needs **both** sides to be searchable. `id` is indexed but `grp` is not, so PostgreSQL scans the whole table:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE id = 500 OR grp = 3;
```

If both sides are on the same indexed column, `OR` is fine, and PostgreSQL turns it into a single lookup:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE id = 500 OR id = 700;
```

## Cause 5: the index is not selective

If a condition matches most of the table, jumping around an index costs more than reading straight through, so PostgreSQL (rightly) chooses a full scan even though the index exists:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE id > 10;
```

Compare a condition that matches only a few rows:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE id < 50;
```

This is why an index on a column with few different values (a flag, or a status) helps so little.

## Cause 6: the wrong leading column

An index on `(a, b)` cannot serve a query on `b` alone (the leftmost-prefix rule from page 14.3).

## Cause 7: stale statistics

If the table changed a lot and `ANALYZE` has not run, the row estimates are wrong, and so are the plans. Run `ANALYZE table_name` before you blame the index (page 14.8).

## Try it yourself

Find a query of your own that uses a function on an indexed column, `EXPLAIN` it, then rewrite it as a range.

## Watch out

### Even `WHERE col + 1 = 10` breaks the index

Any arithmetic on the column does. Move the arithmetic to the other side: `WHERE col = 9`.

### A different type on the two sides can hide an index

Comparing a `bigint` column with a `numeric` value, or two text columns with different collations, can force a cast on the column and block the index. Keep types and collations the same across related columns.

### The planner has the last word

PostgreSQL may skip a perfectly good index when it judges a scan cheaper. `EXPLAIN` tells you what it decided. If you disagree, refresh statistics with `ANALYZE` first. Turning off a scan type (`SET enable_seqscan = off`) is a fine experiment, never a fix.

### An index on a partitioned table is per partition

Each partition has its own index; a query that does not mention the partition key reads all of them. Page 14.7 explains.

## Interview corner

**"You added an index, but `EXPLAIN` still shows `Seq Scan`. Why?"**
The query probably cannot use it: a function or calculation on the indexed column, a leading wildcard, an `OR` with an unindexed side, or a type mismatch. Rewrite the condition so the bare column is compared with a constant. It may also be that the condition is not selective enough, or that the statistics are stale.

**"Why is `LIKE '%text'` slow?"**
The index is ordered by the start of the text, so a leading wildcard gives no starting point. Use a trigram index.

**"How do you write `WHERE date_trunc('day', ts) = ...` so it uses an index?"**
`ts >= day AND ts < day + interval '1 day'`, or create an index on the expression.

## Practice

### Warm-up: rewrite the function

The query `SELECT COUNT(*) FROM big WHERE date_trunc('month', ts) = '2020-03-01'` has a function on the column. Rewrite it as a range and return the count as `march_rows`. (March 2020 is `ts >= '2020-03-01' AND ts < '2020-04-01'`.)

```sql practice destructive
-- hint: Create the table first (as in Set up), then use the half-open range.
CREATE TABLE big2 AS SELECT g AS id, timestamp '2020-01-01' + g * interval '1 minute' AS ts FROM generate_series(1, 300000) g;
CREATE INDEX idx_big2_ts ON big2 (ts);

SELECT COUNT(*) AS march_rows FROM big2 WHERE ts >= '2020-03-01' AND ts < '2020-04-01';
```

### Core: which form uses the index?

On a copy `customer_x` of `customer` with an index on `last_name` and fresh statistics (`VACUUM (ANALYZE)`), show the plan for `SELECT * FROM customer_x WHERE last_name = 'SMITH'`.

```sql practice destructive
-- hint: `CREATE INDEX ON customer_x (last_name)`, then EXPLAIN.
CREATE TABLE customer_x AS SELECT * FROM customer;
CREATE INDEX idx_cx_last ON customer_x (last_name);
VACUUM (ANALYZE) customer_x;

EXPLAIN (COSTS OFF) SELECT * FROM customer_x WHERE last_name = 'SMITH';
```

### Stretch: not selective

On a copy `film_x` of `film` with an index on `rental_duration` and fresh statistics, show the plan for `SELECT * FROM film_x WHERE rental_duration > 2`. Why does PostgreSQL not use the index?

```sql practice destructive
-- hint: Nearly every film has a `rental_duration` above 2.
CREATE TABLE film_x AS SELECT film_id, title, rental_duration FROM film;
CREATE INDEX idx_fx_dur ON film_x (rental_duration);
VACUUM (ANALYZE) film_x;

EXPLAIN (COSTS OFF) SELECT * FROM film_x WHERE rental_duration > 2;
```
