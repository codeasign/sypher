---
title: "Advanced Aggregates: string_agg, FILTER and ROLLUP"
order: 0
---

Once you know `GROUP BY`, PostgreSQL offers three tools that save a lot of code: collecting values into a list, counting several conditions at once, and adding subtotal and grand-total rows.

## What you'll learn

- `string_agg` and `array_agg`
- `FILTER (WHERE ...)` on any aggregate
- `ROLLUP`, `CUBE` and `GROUPING SETS`: subtotals in one query
- `bool_and` and `bool_or`

## Syntax

```sql show
SELECT string_agg(column, ', ' ORDER BY column) FROM table_name;
SELECT aggregate(column) FILTER (WHERE condition) FROM table_name;
SELECT a, b, SUM(c) FROM table_name GROUP BY ROLLUP (a, b);
```

## Examples

### string_agg and array_agg

Every category a film is in, as one text:

```sql run
SELECT f.title,
       string_agg(c.name, ', ' ORDER BY c.name) AS categories
FROM film f
JOIN film_category fc ON fc.film_id = f.film_id
JOIN category c ON c.category_id = fc.category_id
WHERE f.film_id <= 3
GROUP BY f.film_id, f.title
ORDER BY f.film_id;
```

`array_agg` collects the values into a real array, which you can pass on to other functions:

```sql run
SELECT rating, (array_agg(title ORDER BY title))[1:3] AS first_three_titles
FROM film
GROUP BY rating
ORDER BY rating;
```

### FILTER on any aggregate

`FILTER` restricts the rows an aggregate sees. It works with `SUM`, `AVG`, `string_agg` and the rest:

```sql run
SELECT SUM(amount) AS all_revenue,
       SUM(amount) FILTER (WHERE amount >= 5) AS from_big_payments,
       round(AVG(amount) FILTER (WHERE staff_id = 1), 2) AS avg_by_staff_1
FROM payment;
```

### ROLLUP: subtotals and a grand total

`ROLLUP (a, b)` gives a row per `(a, b)`, a subtotal per `a`, and a grand total:

```sql run rows=12
SELECT rating, rental_duration, COUNT(*) AS films
FROM film
GROUP BY ROLLUP (rating, rental_duration)
ORDER BY rating, rental_duration;
```

The `NULL`s in the result are not missing data: they mean "all values". `GROUPING(column)` tells you which:

```sql run
SELECT CASE WHEN GROUPING(rating) = 1 THEN 'ALL RATINGS' ELSE rating::text END AS rating,
       COUNT(*) AS films
FROM film
GROUP BY ROLLUP (rating)
ORDER BY GROUPING(rating), rating;
```

### CUBE and GROUPING SETS

`CUBE (a, b)` gives every combination of subtotals. `GROUPING SETS` lets you pick exactly the groupings you want:

```sql run
SELECT rating, store_id, COUNT(*) AS copies
FROM film f
JOIN inventory i ON i.film_id = f.film_id
GROUP BY GROUPING SETS ((rating), (store_id), ())
ORDER BY rating NULLS LAST, store_id NULLS LAST;
```

The empty set `()` is the grand total.

### bool_and and bool_or

These aggregate true/false values: "is every one true?" and "is any one true?":

```sql run
SELECT bool_and(active = 1) AS all_active, bool_or(active = 1) AS any_active
FROM customer;
```

## Try it yourself

List each actor with the titles of their first three films (join `film_actor` and `film`, use `string_agg`), or a per-store, per-rating count of copies with a `ROLLUP`.

## Watch out

### string_agg needs text

`string_agg(film_id, ',')` fails because `film_id` is an integer. Cast it: `string_agg(film_id::text, ',')`.

### Give string_agg an ORDER BY

The order inside the list is otherwise arbitrary, so the same query can give different text on different runs.

### Do not confuse ROLLUP NULLs with real NULLs

If the column itself can be `NULL`, use `GROUPING()` to tell a subtotal row from a real `NULL` group.

### Large lists are large values

`string_agg` and `array_agg` build one value in memory. Do not aggregate millions of rows into one list.

## Interview corner

**"How do you turn many rows into one comma-separated value?"**
`string_agg(column, ', ' ORDER BY column)` grouped as needed. (MySQL calls it `GROUP_CONCAT`.)

**"What does `ROLLUP` do?"**
It adds subtotal and grand-total rows to a `GROUP BY` in one pass, moving from the most detailed level up.

**"What is the difference between `ROLLUP`, `CUBE` and `GROUPING SETS`?"**
`ROLLUP (a, b)` gives `(a, b)`, `(a)` and `()`. `CUBE (a, b)` gives every combination: `(a, b)`, `(a)`, `(b)` and `()`. `GROUPING SETS` lists exactly the ones you want.

## Practice

### Warm-up: a list per rating

For each `rating`, return the number of films (`films`) and the shortest length in the group (`shortest`). Order by rating.

```sql practice
-- hint: `COUNT(*)` and `MIN(length)` grouped by rating.
SELECT rating, COUNT(*) AS films, MIN(length) AS shortest
FROM film
GROUP BY rating
ORDER BY rating;
```

### Core: two counts in one row

In one row, return the number of payments by staff member 1 (`staff_1`) and by staff member 2 (`staff_2`), using `FILTER`.

```sql practice
-- hint: `COUNT(*) FILTER (WHERE staff_id = 1)`.
SELECT COUNT(*) FILTER (WHERE staff_id = 1) AS staff_1,
       COUNT(*) FILTER (WHERE staff_id = 2) AS staff_2
FROM payment;
```

### Stretch: a grand total

For each store, return the number of customers (`customers`), with an extra last row for all stores together. Use `ROLLUP`, and show the store as `store` (text `all` for the total row).

```sql practice
-- hint: `GROUP BY ROLLUP (store_id)` and `COALESCE(store_id::text, 'all')`.
SELECT COALESCE(store_id::text, 'all') AS store, COUNT(*) AS customers
FROM customer
GROUP BY ROLLUP (store_id)
ORDER BY store_id NULLS LAST;
```
