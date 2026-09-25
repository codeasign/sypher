---
title: "Interview Problem: Top N Per Group"
order: 0
---

"Show the top 3 in each category" is the second most-asked interview pattern. `LIMIT` cannot do it, because it applies to the whole result and not to each group. Window functions can.

## What you'll learn

- The rank-then-filter pattern
- Choosing `ROW_NUMBER` vs `DENSE_RANK` for ties
- Top N with an aggregate

## The problem

For each film **category**, list its three longest films.

## The pattern

1. Compute a rank **within each group** with a window function.
2. Put that in a CTE (window functions cannot be filtered directly).
3. Keep the rows with `rank <= N`.

## Solution with ROW_NUMBER

Exactly three films per category, ties broken by title:

```sql run rows=9
WITH ranked AS (
  SELECT c.name AS category, f.title, f.length,
         ROW_NUMBER() OVER (PARTITION BY c.category_id ORDER BY f.length DESC, f.title) AS rn
  FROM film AS f
  JOIN film_category AS fc ON fc.film_id = f.film_id
  JOIN category AS c ON c.category_id = fc.category_id
)
SELECT category, title, length, rn
FROM ranked
WHERE rn <= 3
ORDER BY category, rn;
```

The second `ORDER BY f.title` inside the window makes the tie-break repeatable. Without it, which tied film gets which number is arbitrary.

## Solution with DENSE_RANK

If several films tie, do you keep all of them? `DENSE_RANK` keeps every film whose **length** is among the top 3 distinct lengths, so a category can return more than 3 films:

```sql run rows=9
WITH ranked AS (
  SELECT c.name AS category, f.title, f.length,
         DENSE_RANK() OVER (PARTITION BY c.category_id ORDER BY f.length DESC) AS rk
  FROM film AS f
  JOIN film_category AS fc ON fc.film_id = f.film_id
  JOIN category AS c ON c.category_id = fc.category_id
)
SELECT category, title, length, rk
FROM ranked
WHERE rk <= 3
ORDER BY category, rk, title;
```

Compare how many rows each version returns:

```sql run
WITH r AS (
  SELECT ROW_NUMBER() OVER (PARTITION BY fc.category_id ORDER BY f.length DESC, f.title) AS rn,
         DENSE_RANK() OVER (PARTITION BY fc.category_id ORDER BY f.length DESC) AS rk
  FROM film AS f JOIN film_category AS fc ON fc.film_id = f.film_id
)
SELECT SUM(rn <= 3) AS rows_with_row_number, SUM(rk <= 3) AS rows_with_dense_rank
FROM r;
```

Ask the interviewer which one they mean: "exactly three rows per group" or "everyone in the top three values".

## Top N of an aggregate

Rank a calculated value by aggregating first. The two biggest-paying customers of each store:

```sql run
WITH totals AS (
  SELECT c.store_id, p.customer_id, SUM(p.amount) AS total_spent
  FROM payment AS p
  JOIN customer AS c ON c.customer_id = p.customer_id
  GROUP BY c.store_id, p.customer_id
),
ranked AS (
  SELECT store_id, customer_id, total_spent,
         ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_spent DESC, customer_id) AS rn
  FROM totals
)
SELECT store_id, customer_id, total_spent, rn
FROM ranked
WHERE rn <= 2
ORDER BY store_id, rn;
```

## Try it yourself

Find the 3 most-rented films in each category, and the 5 shortest films of each rating.

## Watch out

### You cannot use LIMIT for this

`LIMIT 3` gives 3 rows in total. There is no `LIMIT` per group in SQL, which is why this problem exists.

### Filter in an outer query

Window functions are calculated after `WHERE`, so `WHERE ROW_NUMBER() OVER (...) <= 3` is an error. Always compute the rank in a CTE or subquery first.

### Without a tiebreaker, results can change between runs

Add a unique column at the end of the window's `ORDER BY` (`title`, an id) whenever you use `ROW_NUMBER` to cut off a list.

## Interview corner

**"Return the top 3 salaries per department."**
`DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC)` in a CTE, then `WHERE rk <= 3`. Mention that `ROW_NUMBER` would cut ties arbitrarily and `RANK` would skip ranks.

**"What if you cannot use window functions?"**
A correlated subquery: keep each row where fewer than N rows in the same group have a higher value, `WHERE (SELECT COUNT(*) FROM t t2 WHERE t2.grp = t.grp AND t2.val > t.val) < N`.

## Practice

### Warm-up: the shortest per rating

Show each film's `rating`, `title` and `length` for the **single shortest film** of each rating (break ties by title, so exactly one row per rating). Order by rating.

```sql practice
-- hint: `ROW_NUMBER() OVER (PARTITION BY rating ORDER BY length, title)` and keep `rn = 1`.
WITH ranked AS (
  SELECT rating, title, length,
         ROW_NUMBER() OVER (PARTITION BY rating ORDER BY length, title) AS rn
  FROM film
)
SELECT rating, title, length
FROM ranked
WHERE rn = 1
ORDER BY rating;
```

### Core: most-rented films per category

For each category show its **two most rented films** (by number of rentals), as `category`, `title`, `rentals`. Break ties by title so there are exactly two per category. Order by category, then rank, and show the first rows.

```sql practice rows=6
-- hint: Count rentals per film in a CTE (rental → inventory → film → film_category → category), then rank.
WITH film_rentals AS (
  SELECT c.name AS category, f.film_id, f.title, COUNT(*) AS rentals
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  JOIN film AS f ON f.film_id = i.film_id
  JOIN film_category AS fc ON fc.film_id = f.film_id
  JOIN category AS c ON c.category_id = fc.category_id
  GROUP BY c.name, f.film_id, f.title
),
ranked AS (
  SELECT category, title, rentals,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY rentals DESC, title) AS rn
  FROM film_rentals
)
SELECT category, title, rentals
FROM ranked
WHERE rn <= 2
ORDER BY category, rn;
```

### Stretch: the top three payments per customer

For customers 1 and 2, show their **three biggest payments** (`payment_id`, `amount`) ordered by customer, then largest first (ties by `payment_id`). Return `customer_id`, `payment_id`, `amount`.

```sql practice
-- hint: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, payment_id)`, then `rn <= 3`.
WITH ranked AS (
  SELECT customer_id, payment_id, amount,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, payment_id) AS rn
  FROM payment
  WHERE customer_id IN (1, 2)
)
SELECT customer_id, payment_id, amount
FROM ranked
WHERE rn <= 3
ORDER BY customer_id, rn;
```
