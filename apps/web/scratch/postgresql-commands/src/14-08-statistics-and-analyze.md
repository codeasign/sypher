---
title: "Statistics and the Planner"
order: 0
---

PostgreSQL chooses a plan by **estimating** how many rows each step will produce. Those estimates come from **statistics** it collects about your tables. When the statistics are wrong, the plans are wrong. Knowing how to look at them, refresh them and improve them is what separates a guess from a diagnosis.

## What you'll learn

- What `ANALYZE` collects, and where it is stored
- Reading `pg_stats`: distinct values, common values, correlation
- Estimated versus actual rows
- Extended statistics for correlated columns

## Syntax

```sql show
ANALYZE table_name;
SELECT * FROM pg_stats WHERE tablename = 'film';
CREATE STATISTICS name (dependencies) ON a, b FROM t;
```

## Examples

### What PostgreSQL knows about a column

`pg_stats` has one row per column: how many distinct values, the most common ones, and how the values are spread:

```sql run
SELECT attname AS column, n_distinct, most_common_vals
FROM pg_stats
WHERE tablename = 'film' AND attname IN ('rating', 'rental_duration', 'rental_rate')
ORDER BY attname;
```

`n_distinct` positive is a count; negative is a fraction of the row count (`-1` means every value is different). Statistics need `ANALYZE` first; this lab's tables may show nothing until `ANALYZE` has run. The next block makes sure.

### Refresh, then look

```sql run destructive
ANALYZE film;

SELECT attname AS column, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'film' AND attname IN ('film_id', 'rental_rate', 'title')
ORDER BY attname;
```

`correlation` runs from -1 to 1: how closely the column's order matches the physical row order. Near 1 means very well ordered (good for BRIN and range scans).

### The row estimate

The planner turns those numbers into a row estimate. Compare the estimate (plain `EXPLAIN`) with the truth (`ANALYZE`):

```sql run destructive
EXPLAIN SELECT * FROM film WHERE rating = 'PG-13';
```

```sql run
SELECT COUNT(*) AS actual_rows FROM film WHERE rating = 'PG-13';
```

The `rows=` estimate is close to the real count, because `rating` has few distinct values and the statistics list how common each is.

### When the estimate is wrong

Change the data without refreshing statistics, and the planner keeps believing the old picture. Here every row says `old`, statistics are collected, and then every row is changed to `new`:

```sql run destructive
CREATE TABLE stale AS SELECT g AS id, 'old'::text AS status FROM generate_series(1, 100000) g;
ANALYZE stale;
UPDATE stale SET status = 'new';

EXPLAIN SELECT * FROM stale WHERE status = 'new';
```

The planner has never seen the value `new`, so it expects almost no rows. In fact every row matches. After a fresh `ANALYZE` the estimate is right:

```sql run destructive
ANALYZE stale;

EXPLAIN SELECT * FROM stale WHERE status = 'new';
```

Autovacuum normally does this for you, but not instantly.

### Correlated columns: extended statistics

The planner assumes columns are independent. When they are not (a city determines a country), it multiplies the probabilities and underestimates. `CREATE STATISTICS` teaches it about the link:

```sql run destructive
CREATE TABLE place AS
SELECT g AS id, (g % 100) AS city, ((g % 100) / 10) AS region FROM generate_series(1, 50000) g;
ANALYZE place;

EXPLAIN SELECT * FROM place WHERE city = 42 AND region = 4;
```

```sql run destructive
CREATE STATISTICS place_dep (dependencies) ON city, region FROM place;
ANALYZE place;

EXPLAIN SELECT * FROM place WHERE city = 42 AND region = 4;
```

Each city sits in exactly one region, so the true answer is the number of rows for that city: about 500. The second estimate is far closer.

## Try it yourself

Look at `pg_stats` for `customer.last_name`: which names are the most common? Compare `EXPLAIN` on a common and a rare last name.

## Watch out

### Autovacuum analyses in the background, but not instantly

After a bulk load or a big delete, run `ANALYZE` yourself before you look at plans.

### A big statistics target costs planning time

`ALTER TABLE t ALTER COLUMN c SET STATISTICS 1000` keeps more detail for skewed columns, but makes `ANALYZE` and planning slower. Raise it only for columns that need it.

### Estimates are not counts

Even good statistics give estimates. A factor of 2 off is normal; a factor of 100 off is a signal.

### Extended statistics are opt-in

PostgreSQL never creates them itself. You add them for the correlated column pairs that cause bad plans.

### Statistics travel with pg_dump only as data

A restored database has no statistics until `ANALYZE` runs. Always analyse after a restore.

## Interview corner

**"What is `ANALYZE`?"**
It samples a table and stores statistics (distinct values, most common values, histograms, correlation) that the planner uses to estimate row counts and choose plans.

**"A query got slower after a big data load. What do you check first?"**
Whether statistics are up to date (`ANALYZE`), then `EXPLAIN (ANALYZE)` comparing estimated and actual rows, then indexes.

**"What are extended statistics?"**
Statistics on several columns together (dependencies, distinct counts, most common combinations), created with `CREATE STATISTICS`, so the planner stops treating correlated columns as independent.

## Practice

### Warm-up: how many distinct values?

Return the number of different `rating` values in `film` as `ratings`, using `COUNT(DISTINCT ...)`.

```sql practice
-- hint: `COUNT(DISTINCT rating)`.
SELECT COUNT(DISTINCT rating) AS ratings FROM film;
```

### Core: the correlation of an id

After `ANALYZE film`, return the `correlation` of the `film_id` column as `corr` (it is the primary key, inserted in order, so it should be 1).

```sql practice destructive
-- hint: `SELECT correlation FROM pg_stats WHERE tablename = 'film' AND attname = 'film_id'`.
ANALYZE film;

SELECT correlation AS corr FROM pg_stats WHERE tablename = 'film' AND attname = 'film_id';
```

### Stretch: stale versus fresh

Create `pile` with 50000 rows (`id`), run `ANALYZE pile`, delete the rows with `id > 50`, then return whether the planner's estimate for `WHERE id <= 50` **after** a fresh `ANALYZE` is at most 100 rows. (Use `EXPLAIN (FORMAT JSON)` and read `Plan Rows`: `((EXPLAIN-json)->0->'Plan'->>'Plan Rows')::int`. Simpler: return `n_live_tup`... see hint.)

```sql practice destructive
-- hint: After the DELETE and ANALYZE, `SELECT reltuples::int <= 100 AS estimate_is_small FROM pg_class WHERE relname = 'pile'`.
CREATE TABLE pile AS SELECT g AS id FROM generate_series(1, 50000) g;
ANALYZE pile;
DELETE FROM pile WHERE id > 50;
ANALYZE pile;

SELECT reltuples::int <= 100 AS estimate_is_small FROM pg_class WHERE relname = 'pile';
```
