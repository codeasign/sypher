---
title: "Interview Problem: Find and Delete Duplicates"
order: 0
---

"Find the duplicate rows" is one of the most common SQL interview questions. It has two parts: **finding** the duplicates, and **deleting** all but one of each.

## What you'll learn

- Finding duplicates with `GROUP BY ... HAVING COUNT(*) > 1`
- Listing exactly which rows are the extras
- Deleting duplicates safely, keeping one row per group

## The problem

Two actors can share the same first and last name. Find them, then remove the extra rows so each name is stored once.

## Step 1: find the duplicated values

Group by the columns that define "the same", and keep the groups with more than one row:

```sql run
SELECT first_name, last_name, COUNT(*) AS times
FROM actor
GROUP BY first_name, last_name
HAVING COUNT(*) > 1
ORDER BY first_name, last_name;
```

## Step 2: list the individual rows

To delete duplicates you need each row's identity, not just the group. Number the rows within each duplicate group, and everything after the first is an extra:

```sql run
WITH numbered AS (
  SELECT actor_id, first_name, last_name,
         ROW_NUMBER() OVER (PARTITION BY first_name, last_name ORDER BY actor_id) AS copy_number
  FROM actor
)
SELECT actor_id, first_name, last_name, copy_number
FROM numbered
WHERE copy_number > 1
ORDER BY actor_id;
```

`copy_number = 1` is the row we keep (the lowest id). Rows with `copy_number > 1` are the ones to delete.

## Step 3: delete them, on a copy

Never practice a delete on the real table. Make a copy, and try it there. This page changes data, so the lab is restored afterwards.

```sql run destructive
CREATE TABLE actor_copy AS SELECT * FROM actor;

SELECT COUNT(*) AS rows_before FROM actor_copy;

DELETE a
FROM actor_copy AS a
JOIN actor_copy AS b
  ON a.first_name = b.first_name
 AND a.last_name = b.last_name
 AND a.actor_id > b.actor_id;

SELECT COUNT(*) AS rows_after FROM actor_copy;

SELECT COUNT(*) AS duplicate_groups_left
FROM (SELECT 1 FROM actor_copy GROUP BY first_name, last_name HAVING COUNT(*) > 1) AS d;
```

The `DELETE ... JOIN` deletes every row `a` that has a twin `b` with the same name but a **lower** id. The lowest-id row in each group has no such twin, so it survives.

## Try it yourself

Change `a.actor_id > b.actor_id` to `a.actor_id < b.actor_id` and see which of each pair remains. Then find duplicates in the `film` table by `title`.

## Watch out

### Run the SELECT before the DELETE

Turn the `DELETE a` into `SELECT a.*` first, look at exactly which rows would go, and only then change it back. A `DELETE` cannot be undone unless you are inside a transaction (Module 12).

### Decide what "the same" means

Names alone may not identify a person: two different people can genuinely share a name. In real data you would compare more columns (email, birthday) before deleting.

### Always keep one

A careless `DELETE` that removes every row in a duplicate group removes the data entirely. The `>` on the id is what protects one row per group.

### Prevent it next time

After cleaning, add a `UNIQUE` constraint so duplicates cannot come back (Module 13).

## Interview corner

**"How do you find duplicate rows?"**
`SELECT col, COUNT(*) FROM t GROUP BY col HAVING COUNT(*) > 1`.

**"How do you delete duplicates and keep one?"**
Either a self-join delete keeping the smallest (or largest) id, or number the rows with `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY id)` and delete those with `rn > 1`.

**"How do you stop duplicates from being inserted?"**
Put a `UNIQUE` constraint or a unique index on the column(s), and use `INSERT ... ON DUPLICATE KEY UPDATE` (Module 11) for upserts.

## Practice

### Warm-up: how many duplicated names?

How many first-name and last-name combinations are shared by more than one actor? Return one number, `duplicated_names`.

```sql practice
-- hint: Put the `GROUP BY ... HAVING` query in a derived table and `COUNT(*)` its rows.
SELECT COUNT(*) AS duplicated_names
FROM (
  SELECT first_name, last_name
  FROM actor
  GROUP BY first_name, last_name
  HAVING COUNT(*) > 1
) AS d;
```

### Core: the ids to remove

List the `actor_id` values that would be deleted if we kept the **highest** id of each duplicate name. Order by id.

```sql practice
-- hint: `ROW_NUMBER() OVER (PARTITION BY first_name, last_name ORDER BY actor_id DESC)` and keep numbers above 1.
WITH numbered AS (
  SELECT actor_id,
         ROW_NUMBER() OVER (PARTITION BY first_name, last_name ORDER BY actor_id DESC) AS rn
  FROM actor
)
SELECT actor_id
FROM numbered
WHERE rn > 1
ORDER BY actor_id;
```

### Stretch: delete on a copy, keep the newest

Make a copy called `actor_keep_newest`, delete the duplicates so that the row with the **highest** `actor_id` in each name group survives, and return the number of rows left as `rows_left`.

```sql practice destructive
-- hint: Same self-join delete, but delete the row that has a twin with a HIGHER id.
CREATE TABLE actor_keep_newest AS SELECT * FROM actor;

DELETE a
FROM actor_keep_newest AS a
JOIN actor_keep_newest AS b
  ON a.first_name = b.first_name
 AND a.last_name = b.last_name
 AND a.actor_id < b.actor_id;

SELECT COUNT(*) AS rows_left FROM actor_keep_newest;
```
