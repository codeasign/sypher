---
title: "Recursive CTEs"
order: 0
---

A **recursive CTE** refers to itself. It starts with an *anchor* row and keeps adding rows until a stopping condition. It is how SQL walks a tree, builds a sequence, or fills the gaps in a calendar.

## What you'll learn

- The anchor + recursive shape of `WITH RECURSIVE`
- Generating a sequence of numbers and dates
- Filling gaps in data
- Walking a hierarchy, and stopping runaway recursion

## Syntax

```sql show
WITH RECURSIVE name AS (
  SELECT ...            -- the anchor: starting rows
  UNION ALL
  SELECT ... FROM name  -- the recursive part: uses the previous rows
  WHERE stop_condition
)
SELECT * FROM name;
```

## Examples

### Counting

Numbers 1 to 10:

```sql run
WITH RECURSIVE n AS (
  SELECT 1 AS i
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 10
)
SELECT i FROM n;
```

The anchor is the single row `1`. Each round takes the previous row, adds 1, and stops when `i` reaches 10.

### Filling in the gaps

Generate every day in a range and left-join the data, so days with **no** rentals still appear (with 0). This data has a gap: after 31 May there are no rentals at all for a while, and a plain `GROUP BY` on the rentals would simply skip those empty days:

```sql run
WITH RECURSIVE days AS (
  SELECT date '2005-05-31' AS day
  UNION ALL
  SELECT (day + 1) FROM days WHERE day < date '2005-06-06'
)
SELECT d.day, COUNT(r.rental_id) AS rentals
FROM days d
LEFT JOIN rental r ON lower(r.rental_period)::date = d.day
GROUP BY d.day
ORDER BY d.day;
```

In PostgreSQL there is a shortcut for plain sequences, `generate_series(start, stop, step)`, which does not need recursion. Use recursion when each row depends on the previous one.

### Walking a hierarchy

Recursion shines on trees. The database has no tree of its own, so here a small one is built inline: each row names its parent.

```sql run
WITH RECURSIVE org(id, name, boss) AS (
  VALUES (1, 'Ana', NULL), (2, 'Ben', 1), (3, 'Cy', 1), (4, 'Dee', 2), (5, 'Eli', 4)
),
chain AS (
  SELECT id, name, boss, 0 AS depth, name::text AS path FROM org WHERE boss IS NULL
  UNION ALL
  SELECT o.id, o.name, o.boss, c.depth + 1, c.path || ' > ' || o.name
  FROM org o
  JOIN chain c ON o.boss = c.id
)
SELECT depth, path FROM chain ORDER BY path;
```

The anchor is the person with no boss. Each round finds the people whose boss was found in the previous round, and extends the path.

## Try it yourself

Rewrite one of your `generate_series` queries with `WITH RECURSIVE`, then generate the numbers 1 to 20 both ways.

## Watch out

### Recursive CTEs need a way to stop

Every pass must eventually stop adding rows. If the condition never fails, the query runs until memory or the disk fills up, so always include a `WHERE` that ends the recursion. A common safety net is a depth counter:

```sql run
WITH RECURSIVE n AS (
  SELECT 1 AS i
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 1000000
)
SELECT COUNT(*) AS rows_counted FROM (SELECT i FROM n LIMIT 5) x;
```

With a `LIMIT` on the outer query, PostgreSQL stops early even though the condition allows a million rows.

### The anchor and recursive parts must have the same columns

Both parts of the `UNION ALL` must return the same number of columns, of compatible types. A common mistake is a text column that starts as `varchar` in the anchor and grows: cast it (`name::text`) in the anchor, as above.

### UNION versus UNION ALL

`UNION ALL` is normal. Plain `UNION` removes duplicates on every round, which also stops some cycles in graph data, but costs more. For real cycle protection use a visited-path check, or the `CYCLE` clause (PostgreSQL 14 and later).

## Interview corner

**"What is a recursive CTE used for?"**
Sequences (numbers, dates) and hierarchies such as an employee-manager chain, a category tree, or a bill of materials.

**"What are the two parts of a recursive CTE?"**
The anchor (non-recursive) query that supplies the first rows, and the recursive query that joins the CTE to itself, combined with `UNION ALL`.

**"How do you prevent an infinite recursion?"**
A stopping `WHERE`, a depth counter, a `LIMIT` in the outer query, or the `CYCLE` clause for graphs.

## Practice

### Warm-up: count to 12

Use a recursive CTE to return the numbers 1 to 12, in a single column called `month_number`.

```sql practice
-- hint: Anchor `SELECT 1`, recursive part `SELECT month_number + 1 ... WHERE month_number < 12`.
WITH RECURSIVE m(month_number) AS (
  SELECT 1
  UNION ALL
  SELECT month_number + 1 FROM m WHERE month_number < 12
)
SELECT month_number FROM m;
```

### Core: quiet days

Using a recursive CTE for the days from `2005-05-30` to `2005-06-03`, show each day with the number of **rentals** that started on it (`rentals`), including days with none. Order by day.

```sql practice
-- hint: Same shape as the example, `LEFT JOIN` rental on `lower(rental_period)::date`.
WITH RECURSIVE days AS (
  SELECT date '2005-05-30' AS day
  UNION ALL
  SELECT day + 1 FROM days WHERE day < date '2005-06-03'
)
SELECT d.day, COUNT(r.rental_id) AS rentals
FROM days d
LEFT JOIN rental r ON lower(r.rental_period)::date = d.day
GROUP BY d.day
ORDER BY d.day;
```

### Stretch: powers of two

Return the first 8 powers of two (`1, 2, 4, ...`) with their exponent, as `exponent` and `value`, in exponent order.

```sql practice
-- hint: Carry two columns: `exponent + 1` and `value * 2`.
WITH RECURSIVE p(exponent, value) AS (
  SELECT 0, 1
  UNION ALL
  SELECT exponent + 1, value * 2 FROM p WHERE exponent < 7
)
SELECT exponent, value FROM p ORDER BY exponent;
```
