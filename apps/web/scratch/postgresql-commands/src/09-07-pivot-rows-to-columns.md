---
title: "Interview Problem: Pivot Rows into Columns"
order: 0
---

"Turn the rows into columns" is a common request from anyone who builds reports: one row per store, with a column for each month. PostgreSQL has no `PIVOT` keyword, so you build it with conditional aggregation, and the `FILTER` clause makes that tidy.

## What you'll learn

- Pivoting with `COUNT(*) FILTER` and `SUM(CASE WHEN ...)`
- Turning columns back into rows (unpivot with `VALUES` and `LATERAL`)
- The `crosstab` function, briefly

## The problem

Show how many rentals each store handled in each month, with **one row per month** and **one column per store**.

## Start with the long form

A plain `GROUP BY` gives one row per month **and** store:

```sql run
SELECT to_char(lower(r.rental_period), 'YYYY-MM') AS month, i.store_id, COUNT(*) AS rentals
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
GROUP BY 1, 2
ORDER BY 1, 2;
```

## Pivot it

Put a `FILTER` on a `COUNT` for each column you want. Each count sees only the rows of its own store:

```sql run
SELECT to_char(lower(r.rental_period), 'YYYY-MM') AS month,
       COUNT(*) FILTER (WHERE i.store_id = 1) AS store_1,
       COUNT(*) FILTER (WHERE i.store_id = 2) AS store_2
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
GROUP BY 1
ORDER BY 1;
```

## The portable form

`SUM(CASE WHEN ... THEN 1 ELSE 0 END)` does the same and works in every database:

```sql run
SELECT to_char(lower(r.rental_period), 'YYYY-MM') AS month,
       SUM(CASE WHEN i.store_id = 1 THEN 1 ELSE 0 END) AS store_1,
       SUM(CASE WHEN i.store_id = 2 THEN 1 ELSE 0 END) AS store_2
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
GROUP BY 1
ORDER BY 1;
```

## Pivot with money

Revenue by staff member per month, one column per staff member:

```sql run
SELECT to_char(payment_date, 'YYYY-MM') AS month,
       SUM(amount) FILTER (WHERE staff_id = 1) AS staff_1,
       SUM(amount) FILTER (WHERE staff_id = 2) AS staff_2
FROM payment
GROUP BY 1
ORDER BY 1
LIMIT 4;
```

## Going the other way: unpivot

To turn columns back into rows, join each row to a small list of its own columns with `LATERAL` and `VALUES`:

```sql run
SELECT s.month, v.store, v.rentals
FROM (
  SELECT to_char(lower(r.rental_period), 'YYYY-MM') AS month,
         COUNT(*) FILTER (WHERE i.store_id = 1) AS store_1,
         COUNT(*) FILTER (WHERE i.store_id = 2) AS store_2
  FROM rental r JOIN inventory i ON i.inventory_id = r.inventory_id
  GROUP BY 1
) s
CROSS JOIN LATERAL (VALUES ('store_1', s.store_1), ('store_2', s.store_2)) AS v(store, rentals)
ORDER BY s.month, v.store
LIMIT 4;
```

## Try it yourself

Show the number of films per rating as columns, one column per rating, in a single row. Then pivot rentals by weekday (one column per weekday).

## Watch out

### The columns are fixed in the query

A pivot needs to know its columns in advance. If a third store appears, you must add a column. (Building the query text dynamically is possible with `format()` and `EXECUTE`, but is rarely worth it.)

### FILTER versus CASE with SUM

`COUNT(*) FILTER (...)` gives `0` when nothing matches. `SUM(amount) FILTER (...)` gives `NULL` when nothing matches, so wrap it in `COALESCE(..., 0)` when you want zeros. The same is true for `SUM(CASE WHEN ... THEN amount END)` without an `ELSE 0`.

### Watch the join

If a join multiplies rows (a film with several actors, for example), your pivot totals will be too big. Check one total against a plain `COUNT(*)`.

## Interview corner

**"How do you pivot data in PostgreSQL, which has no `PIVOT` operator?"**
Conditional aggregation: `COUNT(*) FILTER (WHERE column = value)`, or `SUM(CASE WHEN column = value THEN amount ELSE 0 END)`, for each output column, grouped by the row key. (The `tablefunc` extension also offers `crosstab()`.)

**"How do you unpivot?"**
`UNION ALL` of one `SELECT` per column, or in PostgreSQL a `CROSS JOIN LATERAL (VALUES ...)`, or `unnest` on arrays.

**"Can the pivot columns be dynamic?"**
Not in one static query. You can generate the SQL text from the distinct values and run it with `EXECUTE` in a function or `DO` block.

## Practice

### Warm-up: ratings as columns

In one row, show the number of films for each rating as columns `g`, `pg`, `pg13`, `r`, `nc17`.

```sql practice
-- hint: `COUNT(*) FILTER (WHERE rating = 'G')` and so on.
SELECT COUNT(*) FILTER (WHERE rating = 'G') AS g,
       COUNT(*) FILTER (WHERE rating = 'PG') AS pg,
       COUNT(*) FILTER (WHERE rating = 'PG-13') AS pg13,
       COUNT(*) FILTER (WHERE rating = 'R') AS r,
       COUNT(*) FILTER (WHERE rating = 'NC-17') AS nc17
FROM film;
```

### Core: weekdays as columns

In one row, show how many rentals started on each weekday, as columns `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`. (`EXTRACT(isodow FROM ...)` gives 1 for Monday to 7 for Sunday.)

```sql practice
-- hint: `COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 1) AS mon`, and so on.
SELECT COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 1) AS mon,
       COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 2) AS tue,
       COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 3) AS wed,
       COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 4) AS thu,
       COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 5) AS fri,
       COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 6) AS sat,
       COUNT(*) FILTER (WHERE EXTRACT(isodow FROM lower(rental_period)) = 7) AS sun
FROM rental;
```

### Stretch: categories by store

Show one row per category `name` with the number of copies held by each store as columns `store_1` and `store_2`, ordered by category.

```sql practice
-- hint: Join inventory -> film_category -> category, `COUNT(*) FILTER (WHERE i.store_id = 1)`.
SELECT c.name,
       COUNT(*) FILTER (WHERE i.store_id = 1) AS store_1,
       COUNT(*) FILTER (WHERE i.store_id = 2) AS store_2
FROM inventory i
JOIN film_category fc ON fc.film_id = i.film_id
JOIN category c ON c.category_id = fc.category_id
GROUP BY c.name
ORDER BY c.name;
```
