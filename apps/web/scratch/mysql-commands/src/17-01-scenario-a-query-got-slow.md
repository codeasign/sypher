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
| A **missing or dropped index** (for example, lost in a migration) | `SHOW INDEX`, `EXPLAIN` |
| **The data grew** and a scan that was fine is not any more | row counts, `EXPLAIN` `rows` |
| **Stale statistics** so the optimiser chooses a bad plan | `ANALYZE TABLE`, compare estimated vs actual rows |
| The **query changed** (a function on a column, `SELECT *`, a new join) | compare with the old version |
| **Locks** or a long-running transaction | next scenario |
| **The server** is short of memory, disk or CPU | monitoring, not SQL |

## A worked case: the report and the lost index

The report lists a customer's payments. With an index on `customer_id`, it is quick. We reproduce that on a copy of the table:

```sql run as=root destructive
CREATE TABLE payment_report AS SELECT * FROM payment;
CREATE INDEX idx_customer ON payment_report (customer_id);

FLUSH STATUS;

SELECT COUNT(*) AS payments_of_customer_5 FROM payment_report WHERE customer_id = 5;

SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_key', 'Handler_read_next', 'Handler_read_rnd_next');
```

One lookup, 38 rows read. That was "last week".

### What changed: a migration drops the index

A schema migration rebuilt the table and forgot to recreate the index:

```sql run as=root destructive
DROP INDEX idx_customer ON payment_report;

FLUSH STATUS;

SELECT COUNT(*) AS payments_of_customer_5 FROM payment_report WHERE customer_id = 5;

SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_key', 'Handler_read_next', 'Handler_read_rnd_next');
```

Same query, same answer, but MySQL now reads **every row** of the table to find 38 of them. This is the slowdown. The query text did not change at all, which is why "nothing changed" is a common and misleading first answer.

### Step 3: prove it with EXPLAIN

```sql run as=root destructive
EXPLAIN SELECT COUNT(*) FROM payment_report WHERE customer_id = 5;
```

`type: ALL` and `key: NULL`: a full scan. Compare with what the original table shows for the same query:

```sql run
ANALYZE TABLE payment;

EXPLAIN SELECT COUNT(*) FROM payment WHERE customer_id = 5;
```

### Step 4: find what is missing

Comparing the indexes of the two tables shows it at once:

```sql run as=root destructive
SELECT 'payment (original)' AS table_name, COUNT(DISTINCT index_name) AS indexes
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'payment'
UNION ALL
SELECT 'payment_report (copy)', COUNT(DISTINCT index_name)
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'payment_report';
```

### Step 5: fix it, and measure again

```sql run as=root destructive
CREATE INDEX idx_customer ON payment_report (customer_id);

FLUSH STATUS;

SELECT COUNT(*) AS payments_of_customer_5 FROM payment_report WHERE customer_id = 5;

SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_key', 'Handler_read_next', 'Handler_read_rnd_next');
```

Back to one lookup. Then say what you would do to stop it happening again: add the index to the migration, and add a check (an automated test that runs `EXPLAIN` on the critical queries, or a review step for schema changes).

## What to say out loud

A strong answer in an interview sounds like this:

1. "First I would find out exactly **which query** is slow and **since when**."
2. "I would run `EXPLAIN` to see the plan: is it a full scan, is the expected index used, how many rows does it estimate?"
3. "Then I would compare with what changed: a dropped index, a much larger table, stale statistics, or a changed query."
4. "I would fix the cause, for example restore or add the index, and **measure again** to confirm."
5. "Finally I would put something in place so it cannot recur silently: monitoring on slow queries, and a review of schema migrations."

## Try it yourself

Take any indexed query from Module 14. Drop the index on a copy of the table, measure the rows read, and add it back.

## Watch out

### Do not add indexes at random

Every index slows writes. Find the cause first. The fix may be a rewrite, an update of statistics or a missing index on one specific column.

### Do not "fix" it on the production server first

Reproduce the problem on a copy with realistic data, and test the fix there.

### Slow sometimes is a different problem

If the same query is fast one minute and slow the next, look at locks, other heavy queries and memory (the next scenario), not just the plan.

## Interview corner

**"A report that used to be fast is now slow. Walk me through it."**
Give the five steps above: identify the query and the time it changed, `EXPLAIN` it, compare with what changed, fix and re-measure, then prevent a repeat.

**"What would you check if the query text has not changed?"**
The data (size, distribution), the indexes (dropped or changed), the statistics (stale), and the environment (locks, load, memory).

**"How can a migration cause a slowdown?"**
It may rebuild a table without recreating its indexes, change a column type so an index is no longer usable, or change collation so joins stop using an index.

## Practice

### Warm-up: how many indexes are missing?

The real `rental` table has some indexes. On a copy `rental_copy` made with `CREATE TABLE ... AS SELECT`, how many indexes does the copy have? Return one number, `copy_indexes`.

```sql practice as=root destructive
-- hint: `CREATE TABLE ... AS SELECT` copies data but not indexes; count rows in information_schema.statistics for the copy.
DROP TABLE IF EXISTS rental_copy;
CREATE TABLE rental_copy AS SELECT * FROM rental;

SELECT COUNT(DISTINCT index_name) AS copy_indexes
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'rental_copy';
```

### Core: measure a scan

On the copy `rental_copy` (no indexes), reset the counters, count the rentals of customer 9, and return `Handler_read_rnd_next`.

```sql practice as=root destructive
-- hint: FLUSH STATUS; the COUNT query; then SHOW SESSION STATUS LIKE 'Handler_read_rnd_next'.
DROP TABLE IF EXISTS rental_copy;
CREATE TABLE rental_copy AS SELECT * FROM rental;

FLUSH STATUS;
SELECT COUNT(*) AS rentals_of_9 FROM rental_copy WHERE customer_id = 9;
SHOW SESSION STATUS LIKE 'Handler_read_rnd_next';
```

### Stretch: fix and prove it

Add an index on `customer_id` to the copy, reset the counters, run the same count, and return `Handler_read_key` and `Handler_read_next` together.

```sql practice as=root destructive
-- hint: CREATE INDEX first, then measure as above, with the two status variables.
DROP TABLE IF EXISTS rental_copy;
CREATE TABLE rental_copy AS SELECT * FROM rental;
CREATE INDEX idx_customer ON rental_copy (customer_id);

FLUSH STATUS;
SELECT COUNT(*) AS rentals_of_9 FROM rental_copy WHERE customer_id = 9;
SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_key', 'Handler_read_next');
```
