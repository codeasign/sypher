---
title: "CROSS JOIN"
order: 0
---

`CROSS JOIN` pairs **every** row of one table with **every** row of another. There is no `ON` condition. The result has as many rows as the two tables multiplied together.

## What you'll learn

- What a cross join (Cartesian product) is
- When it is useful
- Why the accidental version is dangerous
- `generate_series` as a cross join partner

## Syntax

```sql show
SELECT ...
FROM table1
CROSS JOIN table2;
```

## Examples

### Every combination

Every store paired with every category:

```sql run
SELECT s.store_id, c.name AS category
FROM store s
CROSS JOIN category c
ORDER BY s.store_id, c.name
LIMIT 5;
```

The result has {{= SELECT COUNT(*) FROM store }} stores × {{= SELECT COUNT(*) FROM category }} categories = {{= SELECT COUNT(*) FROM store CROSS JOIN category }} rows.

### A useful case: a complete grid

You want a report row for *every* store and category, even when a combination has no data. Build the full grid with `CROSS JOIN`, then `LEFT JOIN` the facts onto it:

```sql run
SELECT s.store_id, c.name AS category, COUNT(i.inventory_id) AS copies
FROM store s
CROSS JOIN category c
LEFT JOIN film_category fc ON fc.category_id = c.category_id
LEFT JOIN inventory i ON i.film_id = fc.film_id AND i.store_id = s.store_id
GROUP BY s.store_id, c.name
ORDER BY s.store_id, c.name
LIMIT 5;
```

Every store × category combination is in the report, including any with zero copies.

### A calendar with generate_series

`generate_series` makes a list of numbers or dates. Cross-joined with a table, it builds every day-and-thing combination:

```sql run
SELECT d::date AS day, s.store_id
FROM generate_series(date '2007-03-01', date '2007-03-03', interval '1 day') AS d
CROSS JOIN store s
ORDER BY day, s.store_id;
```

## Try it yourself

Make a grid of every rating with every rental price, using `SELECT DISTINCT` on the `film` table twice.

## Watch out

### Sizes multiply

Two modest tables make a huge result:

```sql run
SELECT COUNT(*) AS rows_produced
FROM film
CROSS JOIN actor;
```

Cross-joining a 1000 row table with a 200 row table gives 200000 rows. Cross-joining two big tables can bring a server to its knees.

### The comma is a hidden cross join

The old style `FROM film, actor` (tables separated by a comma) is also a cross join, unless a `WHERE` links them. It is easy to forget the `WHERE` and get a giant result. Always use explicit `JOIN ... ON`.

### An accidental cross join hides in a missing condition

```sql run
SELECT COUNT(*) AS rows_produced
FROM film f, inventory i
WHERE f.rating = 'G';
```

That "join" has no link between `f` and `i`, so every G film is paired with every copy. A row count far bigger than either table is the warning sign.

## Interview corner

**"What is a `CROSS JOIN`, and when do you use it?"**
It returns the Cartesian product: every row of the first table with every row of the second. Use it to generate all combinations, such as a calendar × products grid or test data.

**"How many rows does `A CROSS JOIN B` return?"**
`rows(A) × rows(B)`.

## Practice

### Warm-up: how many combinations?

Return `combinations`, the number of rows in the cross join of `category` and `language`.

```sql practice
-- hint: `COUNT(*)` over `category CROSS JOIN language`.
SELECT COUNT(*) AS combinations
FROM category
CROSS JOIN language;
```

### Core: every pair

List every combination of the different film `rating` values with the different `rental_duration` values. Return `rating` and `rental_duration`, ordered by both. Show the first rows.

```sql practice
-- hint: Two `SELECT DISTINCT` subqueries cross-joined.
SELECT r.rating, d.rental_duration
FROM (SELECT DISTINCT rating FROM film) r
CROSS JOIN (SELECT DISTINCT rental_duration FROM film) d
ORDER BY r.rating, d.rental_duration;
```

### Stretch: fill the gaps

For each day from `2007-03-01` to `2007-03-04`, show the day and the number of payments made on it (`payments`), including days with none. Use `generate_series` and a `LEFT JOIN`.

```sql practice
-- hint: `LEFT JOIN payment p ON p.payment_date::date = d::date`, then GROUP BY the day.
SELECT d::date AS day, COUNT(p.payment_id) AS payments
FROM generate_series(date '2007-03-01', date '2007-03-04', interval '1 day') AS d
LEFT JOIN payment p ON p.payment_date::date = d::date
GROUP BY d
ORDER BY d;
```
