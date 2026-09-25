---
title: "Tuning a Slow Query"
order: 0
---

"A query is slow. What do you do?" is the most common performance question in interviews, and the most common job in real life. This page turns everything from Module 14 into a **repeatable method**, applied to a real gap in this database: the `rental` table has no index on `customer_id`.

## What you'll learn

- How slow queries are found (`log_min_duration_statement`, `pg_stat_statements`)
- A step-by-step method for tuning one
- `EXPLAIN (ANALYZE, BUFFERS)` in practice
- What else to try when an index is not enough

## Finding slow queries

PostgreSQL can log every statement that takes longer than a limit. Its settings, in this lab:

```sql run
SELECT name, setting, unit
FROM pg_settings
WHERE name IN ('log_min_duration_statement', 'log_lock_waits', 'track_io_timing', 'shared_preload_libraries')
ORDER BY name;
```

`-1` means the slow-statement log is off. On a real server you turn it on and lower the threshold (`ALTER SYSTEM SET log_min_duration_statement = '250ms'`). The **`pg_stat_statements`** extension goes further: it adds up the time of every distinct query, so you can see which ones cost the most in total. It has to be listed in `shared_preload_libraries` and needs a server restart, which this lab does not do, so we describe rather than run it:

```sql show
CREATE EXTENSION pg_stat_statements;
SELECT calls, round(total_exec_time) AS ms, query
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;
```

## The method

1. **Reproduce and measure.** Run the query with `EXPLAIN (ANALYZE, BUFFERS)`, and note the time and the pages read.
2. **Read the plan.** Is there a `Seq Scan` on a big table? Are estimates far from actual rows? Is there a `Sort` that spills to disk?
3. **Fix the cause.** Add or change an index, rewrite the condition, select fewer columns, refresh statistics.
4. **Measure again.** Confirm it really got better.
5. **Check the cost.** Does the new index slow writes too much? Does it help other queries?

## A worked example

A report needs all rentals of customer 7 in July 2005. On a copy of `rental` (as it is: with only its primary key and one other index):

```sql run destructive
CREATE TABLE rental_tune AS SELECT * FROM rental;
ALTER TABLE rental_tune ADD PRIMARY KEY (rental_id);
VACUUM (ANALYZE) rental_tune;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT rental_id, lower(rental_period) AS rented_at
FROM rental_tune
WHERE customer_id = 7 AND rental_period && tsrange('2005-07-01', '2005-08-01');
```

### Step 2: the plan

`Seq Scan` and a large `Rows Removed by Filter`: it read every row to find a handful.

### Step 3: the fix

The query has an **equality** on `customer_id` and a **range** test on `rental_period`. A composite index cannot serve the range operator with a B-tree, but an index on `customer_id` alone already narrows 16000 rows to a few dozen:

```sql run destructive
CREATE INDEX idx_report_customer ON rental_tune (customer_id);
VACUUM (ANALYZE) rental_tune;
```

### Step 4: measure again

```sql run destructive
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT rental_id, lower(rental_period) AS rented_at
FROM rental_tune
WHERE customer_id = 7 AND rental_period && tsrange('2005-07-01', '2005-08-01');
```

The full scan is gone: the index finds customer 7's rentals, and the remaining condition is checked only on those.

### Step 5: check the cost

```sql run destructive
SELECT pg_size_pretty(pg_relation_size('rental_tune')) AS table_size,
       pg_size_pretty(pg_relation_size('idx_report_customer')) AS new_index_size;
```

A small index for a large speed-up. It does add a little work to every insert, so it is worth it only because the report runs often.

## When an index is not enough

- **Select fewer columns and rows**: `SELECT *` on a wide table reads more than you need.
- **Refresh statistics**: `ANALYZE`, or raise the statistics target on a skewed column.
- **Rewrite the query**: replace a correlated subquery by a join or a window function.
- **Pre-compute**: a materialised view (Module 15) or a summary table for heavy reports.
- **Partition** a very large table by date (page 14.7).
- **Use more memory**: `work_mem` for sorts and hashes, `shared_buffers` for cache: server settings, not SQL.

## Try it yourself

Take the slowest query you can find from the earlier modules (a join of several tables, or one with a `LIKE '%...%'`), and walk through the five steps.

## Watch out

### Measure, do not guess

"It feels faster" is not measurement. Compare `EXPLAIN (ANALYZE, BUFFERS)` output (rows, pages, time) and repeat runs, and remember that the first run may be slow because the data was not yet in memory.

### Test with realistic data

A query that is fine on 1000 rows can be terrible on 50 million. Tune against data of a realistic size, and realistic values.

### Each fix has a cost

A new index speeds up reads and slows down writes. Check that you have not made the important write path worse.

### One slow query is not always the problem

A query that takes 5 ms but runs 10000 times a minute can hurt more than one that takes 5 seconds once a day. `pg_stat_statements` shows the *total time per query*, which finds it.

### Do not tune with `enable_seqscan = off`

Forcing the planner is a good experiment, but a bad fix: it applies to every query in the session.

## Interview corner

**"How do you optimise a slow query?"**
Use this method: measure it with `EXPLAIN (ANALYZE, BUFFERS)`, find the cause (a missing or unusable index, stale statistics, too many columns or rows, a bad join), fix it (index, rewrite, `ANALYZE`), and measure again. Mention `pg_stat_statements` and the slow-query log to find the worst offenders.

**"The server's CPU is at 100%. Where do you start?"**
`pg_stat_activity` for what is running now, `pg_stat_statements` for what costs the most overall, then `EXPLAIN` the worst ones, and check for missing indexes and runaway sequential scans.

**"How would you page through a million rows efficiently?"**
Keyset pagination: `WHERE id > last_seen_id ORDER BY id LIMIT n`, not `OFFSET`.

## Practice

### Warm-up: is logging on?

Return the value of `log_min_duration_statement` as `threshold` (from `current_setting`).

```sql practice
-- hint: `current_setting('log_min_duration_statement')`.
SELECT current_setting('log_min_duration_statement') AS threshold;
```

### Core: find the scan

On a copy `payment_report` of `payment` (no indexes), refresh statistics, and show the plan (`EXPLAIN (COSTS OFF)`) for counting payments over 10 dollars: `SELECT COUNT(*) FROM payment_report WHERE amount > 10`.

```sql practice destructive
-- hint: `VACUUM (ANALYZE) payment_report` first.
CREATE TABLE payment_report AS SELECT * FROM payment;
VACUUM (ANALYZE) payment_report;

EXPLAIN (COSTS OFF) SELECT COUNT(*) FROM payment_report WHERE amount > 10;
```

### Stretch: fix and re-measure

On a copy `rental_fix` of `rental`, add an index on `customer_id` and refresh statistics. Then show the plan with `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT * FROM rental_fix WHERE customer_id = 9`, and check that there is no `Seq Scan` and no `Rows Removed by Filter` any more.

```sql practice destructive
-- hint: `CREATE INDEX` then `VACUUM (ANALYZE)`, then the EXPLAIN ANALYZE.
CREATE TABLE rental_fix AS SELECT * FROM rental;
CREATE INDEX idx_rental_fix_customer ON rental_fix (customer_id);
VACUUM (ANALYZE) rental_fix;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT * FROM rental_fix WHERE customer_id = 9;
```
