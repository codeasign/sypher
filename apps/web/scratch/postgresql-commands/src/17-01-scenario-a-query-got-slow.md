---
title: "Scenario: A Query That Was Fast Is Now Slow"
order: 0
---

> "This report used to load instantly. Since last week it takes forever. What do you do?"

This is the most common troubleshooting question in a database interview. The interviewer is not looking for a single trick. They want to hear a **calm, ordered method**. This page walks through one realistic case, with a real slowdown you can reproduce.

## What you'll learn

- The questions to ask first
- A checklist of what usually changed
- How to prove which one it is
- What to say at each step

## Step 1: ask before you touch anything

Good answers start with questions:

1. **What exactly is slow?** One query, one page, or everything?
2. **When did it start?** What changed then: a deployment, a data load, a migration, a new customer?
3. **Is it slow every time, or sometimes?** Always slow points at the query or the data. Sometimes slow points at locks or load.
4. **How slow, compared with before?** 2x is a plan change. 1000x is usually a full scan or a lock.

## Step 2: the usual suspects

| Suspect | How to check |
|---|---|
| A **missing or dropped index** (for example, lost in a migration) | `\d table`, `EXPLAIN` |
| **The data grew** and a scan that was fine is not any more | row counts, `EXPLAIN (ANALYZE)` |
| **Stale statistics** so the planner chooses a bad plan | `ANALYZE`, compare estimated vs actual rows |
| The **query changed** (a function on a column, `SELECT *`, a new join) | compare with the old version |
| **Locks** or a long-running transaction | next scenario, `pg_stat_activity` |
| **Bloat**: dead rows that `VACUUM` could not clean | page 11.5, table size |
| **The server** is short of memory, disk or CPU | monitoring, not SQL |

## A worked case: the report and the lost index

The report lists a customer's payments. With an index on `customer_id`, it is quick. We reproduce that on a copy of the table:

```sql run destructive
CREATE TABLE payment_report AS SELECT * FROM payment;
CREATE INDEX idx_customer ON payment_report (customer_id);
VACUUM (ANALYZE) payment_report;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT COUNT(*) FROM payment_report WHERE customer_id = 5;
```

An index lookup finds customer 5's rows and reads nothing else. That was "last week".

### What changed: a migration drops the index

A schema migration rebuilt the table and forgot to recreate the index:

```sql run destructive
DROP INDEX idx_customer;
ANALYZE payment_report;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT COUNT(*) FROM payment_report WHERE customer_id = 5;
```

Same query, same answer, but PostgreSQL now reads **every row** of the table to find a few of them (`Rows Removed by Filter`). This is the slowdown. The query text did not change at all, which is why "nothing changed" is a common and misleading first answer.

### Step 3: prove it with EXPLAIN

`Seq Scan` on a table with no index on `customer_id`. Compare with what the original `payment` table shows for the same query (its partitions each have an index):

```sql run destructive
EXPLAIN (COSTS OFF) SELECT COUNT(*) FROM payment WHERE customer_id = 5;
```

### Step 4: find what is missing

Comparing the indexes of the two tables shows it at once:

```sql run destructive
SELECT 'payment (original, one partition)' AS table_name, COUNT(*) AS indexes
FROM pg_indexes WHERE tablename = 'payment_p2007_03'
UNION ALL
SELECT 'payment_report (copy)', COUNT(*) FROM pg_indexes WHERE tablename = 'payment_report';
```

### Step 5: fix it, and measure again

```sql run destructive
CREATE INDEX idx_customer ON payment_report (customer_id);
ANALYZE payment_report;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT COUNT(*) FROM payment_report WHERE customer_id = 5;
```

Back to an index lookup. Then say what you would do to stop it happening again: add the index to the migration, and add a check (an automated test that runs `EXPLAIN` on the critical queries, or a review step for schema changes).

## What to say out loud

A strong answer in an interview sounds like this:

1. "First I would find out exactly **which query** is slow and **since when**."
2. "I would run `EXPLAIN (ANALYZE, BUFFERS)` to see the plan: is it a sequential scan, is the expected index used, how far are the estimates from reality?"
3. "Then I would compare with what changed: a dropped index, a much larger table, stale statistics, bloat, or a changed query."
4. "I would fix the cause, for example restore or add the index, and **measure again** to confirm."
5. "Finally I would put something in place so it cannot recur silently: `pg_stat_statements` and slow-query logging, and a review of schema migrations."

## Try it yourself

Take any indexed query from Module 14. Drop the index on a copy of the table, look at the plan, and add it back.

## Watch out

### Do not add indexes at random

Every index slows writes. Find the cause first. The fix may be a rewrite, an `ANALYZE` or a missing index on one specific column.

### Do not "fix" it on the production server first

Reproduce the problem on a copy with realistic data, and test the fix there. (Build production indexes with `CREATE INDEX CONCURRENTLY`.)

### Slow sometimes is a different problem

If the same query is fast one minute and slow the next, look at locks, other heavy queries and memory (the next scenario), not just the plan.

## Interview corner

**"A report that used to be fast is now slow. Walk me through it."**
Give the five steps above: identify the query and the time it changed, `EXPLAIN` it, compare with what changed, fix and re-measure, then prevent a repeat.

**"What would you check if the query text has not changed?"**
The data (size, distribution), the indexes (dropped or changed), the statistics (stale), bloat, and the environment (locks, load, memory).

**"How can a migration cause a slowdown?"**
It may rebuild a table without recreating its indexes, change a column type so an index is no longer usable, or change the data so statistics are out of date.

## Practice

### Warm-up: how many indexes are missing?

The real `rental` table has some indexes. On a copy `rental_copy` made with `CREATE TABLE ... AS SELECT`, how many indexes does the copy have? Return one number, `copy_indexes`.

```sql practice destructive
-- hint: `CREATE TABLE ... AS SELECT` copies data but not indexes; count rows in `pg_indexes` for the copy.
CREATE TABLE rental_copy AS SELECT * FROM rental;

SELECT COUNT(*) AS copy_indexes FROM pg_indexes WHERE tablename = 'rental_copy';
```

### Core: measure a scan

On the copy `rental_copy2` (no indexes), refresh statistics and show `Rows Removed by Filter` by running `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)` for a count of the rentals of customer 9.

```sql practice destructive
-- hint: `ANALYZE rental_copy2`, then the EXPLAIN ANALYZE.
CREATE TABLE rental_copy2 AS SELECT * FROM rental;
ANALYZE rental_copy2;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT COUNT(*) FROM rental_copy2 WHERE customer_id = 9;
```

### Stretch: fix and prove it

Add an index on `customer_id` to a third copy `rental_copy3`, refresh statistics, and show the same `EXPLAIN (ANALYZE, ...)`. What scan node do you see now?

```sql practice destructive
-- hint: CREATE INDEX, then VACUUM (ANALYZE), then the EXPLAIN ANALYZE.
CREATE TABLE rental_copy3 AS SELECT * FROM rental;
CREATE INDEX idx_rc3_customer ON rental_copy3 (customer_id);
VACUUM (ANALYZE) rental_copy3;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT COUNT(*) FROM rental_copy3 WHERE customer_id = 9;
```
