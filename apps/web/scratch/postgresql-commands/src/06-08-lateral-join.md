---
title: "LATERAL Joins"
order: 0
---

A normal subquery in `FROM` cannot see the other tables next to it. A `LATERAL` subquery **can**: it runs once for each row of the table on its left. That makes "top N per row" questions short and fast, and it is one of PostgreSQL's most useful features.

## What you'll learn

- What `LATERAL` means
- "Top N per group" with `LATERAL` and `LIMIT`
- `CROSS JOIN LATERAL` versus `LEFT JOIN LATERAL`
- Calling a set-returning function per row

## Syntax

```sql show
SELECT ...
FROM table1 t
CROSS JOIN LATERAL (
  SELECT ... FROM table2 WHERE table2.key = t.key ORDER BY ... LIMIT n
) AS sub;
```

The word `LATERAL` lets the subquery use `t.key` from the row to its left.

## Examples

### The latest two payments of each customer

For customers 1 to 3, the two most recent payments each. Notice the inner query mentions `c.customer_id`:

```sql run
SELECT c.customer_id, c.last_name, p.payment_id, p.amount, p.payment_date
FROM customer c
CROSS JOIN LATERAL (
  SELECT payment_id, amount, payment_date
  FROM payment
  WHERE customer_id = c.customer_id
  ORDER BY payment_date DESC, payment_id DESC
  LIMIT 2
) AS p
WHERE c.customer_id <= 3
ORDER BY c.customer_id, p.payment_date DESC;
```

A normal join cannot do this, because `LIMIT` inside an ordinary subquery would limit the whole result, not each customer.

### LEFT JOIN LATERAL keeps rows with no match

`CROSS JOIN LATERAL` drops a left row when the subquery returns nothing. `LEFT JOIN LATERAL ... ON true` keeps it. Films with no copy still appear:

```sql run
SELECT f.film_id, f.title, first_copy.inventory_id
FROM film f
LEFT JOIN LATERAL (
  SELECT inventory_id FROM inventory WHERE film_id = f.film_id ORDER BY inventory_id LIMIT 1
) AS first_copy ON true
WHERE f.film_id BETWEEN 13 AND 16
ORDER BY f.film_id;
```

### A function that returns many rows, per row

`generate_series` and other set-returning functions are lateral by default. Here each film expands into one row per hour of running time:

```sql run
SELECT f.title, h AS hour_number
FROM film f, generate_series(1, ceil(f.length / 60.0)::int) AS h
WHERE f.film_id <= 2
ORDER BY f.film_id, h;
```

## Try it yourself

For each store, show its three most recent rentals (use `inventory` to reach the store, and `lower(rental_period)` for the time).

## Watch out

### Do not forget the ON true

`LEFT JOIN LATERAL (...)` needs an `ON` condition. `ON true` means "always match", and the subquery's own `WHERE` does the real linking.

### LATERAL runs once per left row

The subquery executes for every row on its left. With an index on the linking column (`payment(customer_id, payment_date)`) that is fast; without one it can be very slow on big tables.

### Order matters

The `LATERAL` subquery can only see tables that come **before** it in the `FROM` list, not after.

## Interview corner

**"What does `LATERAL` do?"**
It lets a subquery or function in the `FROM` clause refer to columns of tables listed earlier, so it is evaluated once per row of those tables.

**"How do you get the top N rows per group in PostgreSQL?"**
Either a window function with `ROW_NUMBER()` filtered in an outer query (Module 8), or a `LATERAL` subquery with `ORDER BY ... LIMIT N`. The lateral form can be much faster when an index matches the order and the groups are big.

**"What is the difference between `CROSS JOIN LATERAL` and `LEFT JOIN LATERAL ... ON true`?"**
The cross form drops left rows for which the subquery is empty; the left form keeps them, with `NULL`s.

## Practice

### Warm-up: the biggest payment of each customer

For customers 1 to 3, show `customer_id` and the `amount` of their single largest payment (ties by the lowest `payment_id`), as `biggest`. Use `CROSS JOIN LATERAL` with `LIMIT 1`. Order by `customer_id`.

```sql practice
-- hint: Inside the lateral subquery, `ORDER BY amount DESC, payment_id LIMIT 1`.
SELECT c.customer_id, p.amount AS biggest
FROM customer c
CROSS JOIN LATERAL (
  SELECT amount FROM payment WHERE customer_id = c.customer_id ORDER BY amount DESC, payment_id LIMIT 1
) p
WHERE c.customer_id <= 3
ORDER BY c.customer_id;
```

### Core: first copy of a film

For the films with `film_id` 13 to 16, show `film_id` and the lowest `inventory_id` of any copy (`first_copy`), or `NULL` when a film has no copy. Order by `film_id`.

```sql practice
-- hint: `LEFT JOIN LATERAL (...) ON true` keeps the film with no copy.
SELECT f.film_id, x.inventory_id AS first_copy
FROM film f
LEFT JOIN LATERAL (
  SELECT inventory_id FROM inventory WHERE film_id = f.film_id ORDER BY inventory_id LIMIT 1
) x ON true
WHERE f.film_id BETWEEN 13 AND 16
ORDER BY f.film_id;
```

### Stretch: two shortest films per rating

For each `rating`, show its two shortest films (`rating`, `title`, `length`), ties broken by title. Use `LATERAL` over the list of ratings. Order by rating, then length, then title.

```sql practice
-- hint: `FROM (SELECT DISTINCT rating FROM film) r CROSS JOIN LATERAL (... WHERE rating = r.rating ORDER BY length, title LIMIT 2)`.
SELECT r.rating, f.title, f.length
FROM (SELECT DISTINCT rating FROM film) r
CROSS JOIN LATERAL (
  SELECT title, length FROM film WHERE rating = r.rating ORDER BY length, title LIMIT 2
) f
ORDER BY r.rating, f.length, f.title;
```
