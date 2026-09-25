---
title: "Interview Problem: Pivot Rows into Columns"
order: 0
---

"Turn the rows into columns" is a common request from anyone who builds reports: one row per store, with a column for each month. MySQL has no `PIVOT` keyword, so you build it with conditional aggregation.

## What you'll learn

- Pivoting with `SUM(CASE WHEN ...)`
- Pivoting with boolean expressions
- Turning columns back into rows (unpivot)

## The problem

Show how many rentals each store handled in each month, with **one row per month** and **one column per store**.

## Start with the long form

A plain `GROUP BY` gives one row per month **and** store:

```sql run
SELECT DATE_FORMAT(r.rental_date, '%Y-%m') AS month,
       i.store_id,
       COUNT(*) AS rentals
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
GROUP BY DATE_FORMAT(r.rental_date, '%Y-%m'), i.store_id
ORDER BY month, i.store_id;
```

## Pivot it

Put a `CASE` inside `SUM` for each column you want. Each `SUM` counts only the rows of its own store:

```sql run
SELECT DATE_FORMAT(r.rental_date, '%Y-%m') AS month,
       SUM(CASE WHEN i.store_id = 1 THEN 1 ELSE 0 END) AS store_1,
       SUM(CASE WHEN i.store_id = 2 THEN 1 ELSE 0 END) AS store_2,
       COUNT(*) AS total
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
GROUP BY DATE_FORMAT(r.rental_date, '%Y-%m')
ORDER BY month;
```

## A shorter way

In MySQL a comparison is `1` or `0`, so summing it counts the true rows:

```sql run
SELECT DATE_FORMAT(r.rental_date, '%Y-%m') AS month,
       SUM(i.store_id = 1) AS store_1,
       SUM(i.store_id = 2) AS store_2
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
GROUP BY DATE_FORMAT(r.rental_date, '%Y-%m')
ORDER BY month;
```

The `CASE` form is more portable, and works in every database.

## Pivot with money

Revenue by staff member per month, one column per staff member:

```sql run
SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
       SUM(CASE WHEN staff_id = 1 THEN amount ELSE 0 END) AS staff_1_revenue,
       SUM(CASE WHEN staff_id = 2 THEN amount ELSE 0 END) AS staff_2_revenue
FROM payment
GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
ORDER BY month;
```

## Going the other way: unpivot

To turn columns back into rows, stack one query per column with `UNION ALL`:

```sql run
SELECT rating, 'copies_in_store_1' AS measure, COUNT(*) AS value
FROM inventory AS i JOIN film AS f ON f.film_id = i.film_id
WHERE i.store_id = 1
GROUP BY rating
UNION ALL
SELECT rating, 'copies_in_store_2', COUNT(*)
FROM inventory AS i JOIN film AS f ON f.film_id = i.film_id
WHERE i.store_id = 2
GROUP BY rating
ORDER BY rating, measure;
```

## Try it yourself

Show the number of films per rating as columns, one column per rating, in a single row. Then pivot rentals by weekday (one column per weekday).

## Watch out

### The columns are fixed in the query

A pivot needs to know its columns in advance. If a third store appears, you must add a column. (Building the query text dynamically is possible with prepared statements, but is rarely worth it.)

### Use ELSE 0 with SUM

`SUM` over no matching values is `NULL`, not `0`. In `SUM(CASE WHEN store_id = 1 THEN 1 END)`, a month in which no rental belongs to store 1 has every `CASE` result `NULL`, so the cell shows `NULL`. With `ELSE 0` each non-matching row contributes `0` and the cell shows `0`. Be explicit.

### Watch the join

If a join multiplies rows (a film with several actors, for example), your pivot totals will be too big. Check one total against a plain `COUNT(*)`.

## Interview corner

**"How do you pivot data in MySQL, which has no `PIVOT` operator?"**
Conditional aggregation: `SUM(CASE WHEN column = value THEN amount ELSE 0 END)` for each output column, grouped by the row key.

**"How do you unpivot?"**
`UNION ALL` of one `SELECT` per column, adding a constant that names the measure.

**"Can the pivot columns be dynamic?"**
Not in one static query. You can generate the SQL text from the distinct values and run it with a prepared statement.

## Practice

### Warm-up: ratings as columns

In one row, show the number of films for each rating as columns `g`, `pg`, `pg13`, `r`, `nc17`.

```sql practice
-- hint: `SUM(rating = 'G')` and so on, over the whole `film` table.
SELECT SUM(rating = 'G') AS g,
       SUM(rating = 'PG') AS pg,
       SUM(rating = 'PG-13') AS pg13,
       SUM(rating = 'R') AS r,
       SUM(rating = 'NC-17') AS nc17
FROM film;
```

### Core: weekdays as columns

In one row, show how many rentals happened on each weekday, as columns `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`.

```sql practice
-- hint: `SUM(DAYNAME(rental_date) = 'Monday')` for each day.
SELECT SUM(DAYNAME(rental_date) = 'Monday') AS monday,
       SUM(DAYNAME(rental_date) = 'Tuesday') AS tuesday,
       SUM(DAYNAME(rental_date) = 'Wednesday') AS wednesday,
       SUM(DAYNAME(rental_date) = 'Thursday') AS thursday,
       SUM(DAYNAME(rental_date) = 'Friday') AS friday,
       SUM(DAYNAME(rental_date) = 'Saturday') AS saturday,
       SUM(DAYNAME(rental_date) = 'Sunday') AS sunday
FROM rental;
```

### Stretch: categories by store

Show one row per category `name` with the number of copies held by each store as columns `store_1` and `store_2`, ordered by category.

```sql practice rows=6
-- hint: inventory → film_category → category, then `SUM(i.store_id = 1)` and `SUM(i.store_id = 2)`.
SELECT c.name AS category,
       SUM(i.store_id = 1) AS store_1,
       SUM(i.store_id = 2) AS store_2
FROM inventory AS i
JOIN film_category AS fc ON fc.film_id = i.film_id
JOIN category AS c ON c.category_id = fc.category_id
GROUP BY c.name
ORDER BY c.name;
```
