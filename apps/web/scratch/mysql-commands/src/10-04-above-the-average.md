---
title: "Interview Problem: Above the Average"
order: 0
---

"Who earns more than the average?" and "which products sell above average?" are interview staples. They test whether you can compare a row with an aggregate, and, in the harder version, with the aggregate of **its own group**.

## What you'll learn

- Comparing rows with the overall average
- Comparing rows with their own group's average
- Three ways to write it, and when to pick each

## The problem

Find the customers who spent more than the average customer. Then find those who spent more than the average of **their own store**.

## Above the overall average

Total per customer, compared with the average of those totals:

```sql run rows=6
SELECT customer_id, SUM(amount) AS total_spent
FROM payment
GROUP BY customer_id
HAVING SUM(amount) > (
  SELECT AVG(total) FROM (SELECT SUM(amount) AS total FROM payment GROUP BY customer_id) AS t
)
ORDER BY total_spent DESC, customer_id;
```

The same idea with a CTE, which is easier to read:

```sql run rows=6
WITH per_customer AS (
  SELECT customer_id, SUM(amount) AS total_spent
  FROM payment
  GROUP BY customer_id
)
SELECT customer_id, total_spent
FROM per_customer
WHERE total_spent > (SELECT AVG(total_spent) FROM per_customer)
ORDER BY total_spent DESC, customer_id;
```

## Above the average of their own group

Now each customer is compared with **their store's** average. Three approaches:

### 1. A window function

```sql run rows=6
WITH per_customer AS (
  SELECT c.store_id, c.customer_id, SUM(p.amount) AS total_spent
  FROM customer AS c
  JOIN payment AS p ON p.customer_id = c.customer_id
  GROUP BY c.store_id, c.customer_id
),
with_avg AS (
  SELECT store_id, customer_id, total_spent,
         AVG(total_spent) OVER (PARTITION BY store_id) AS store_avg
  FROM per_customer
)
SELECT store_id, customer_id, total_spent, ROUND(store_avg, 2) AS store_avg
FROM with_avg
WHERE total_spent > store_avg
ORDER BY store_id, total_spent DESC, customer_id;
```

### 2. A join to the group averages

```sql run rows=6
WITH per_customer AS (
  SELECT c.store_id, c.customer_id, SUM(p.amount) AS total_spent
  FROM customer AS c
  JOIN payment AS p ON p.customer_id = c.customer_id
  GROUP BY c.store_id, c.customer_id
),
store_avg AS (
  SELECT store_id, AVG(total_spent) AS avg_spent
  FROM per_customer
  GROUP BY store_id
)
SELECT pc.store_id, pc.customer_id, pc.total_spent
FROM per_customer AS pc
JOIN store_avg AS sa ON sa.store_id = pc.store_id
WHERE pc.total_spent > sa.avg_spent
ORDER BY pc.store_id, pc.total_spent DESC, pc.customer_id;
```

### 3. A correlated subquery

```sql run rows=6
WITH per_customer AS (
  SELECT c.store_id, c.customer_id, SUM(p.amount) AS total_spent
  FROM customer AS c
  JOIN payment AS p ON p.customer_id = c.customer_id
  GROUP BY c.store_id, c.customer_id
)
SELECT pc.store_id, pc.customer_id, pc.total_spent
FROM per_customer AS pc
WHERE pc.total_spent > (
  SELECT AVG(x.total_spent) FROM per_customer AS x WHERE x.store_id = pc.store_id
)
ORDER BY pc.store_id, pc.total_spent DESC, pc.customer_id;
```

All three return the same customers. The window function version is the shortest, and the join version is the most portable.

## Try it yourself

Find the films longer than the average of their own category, and the payments larger than the average payment of that customer's store.

## Watch out

### An average of averages is not the overall average

If groups have different sizes, averaging the group averages gives a different number than averaging every row. Decide which one the question wants.

### "Above average" excludes the average itself

`>` leaves out rows exactly equal to the average. If the question says "at least the average", use `>=`.

### NULLs are ignored by AVG

If some values are `NULL`, `AVG` skips them. That may be right or wrong for the question, so state what you assume.

## Interview corner

**"Find employees who earn more than the average salary."**
`WHERE salary > (SELECT AVG(salary) FROM employees)`.

**"Find employees who earn more than the average in their department."**
Use a window (`AVG(salary) OVER (PARTITION BY dept)`) in a CTE and filter outside, or join to a per-department average, or use a correlated subquery. Mention the trade-offs.

**"What is the difference between these approaches?"**
The window function and the join scan the data once and are usually fastest. A correlated subquery may re-run for every row, which can be slow on big tables.

## Practice

### Warm-up: longer than average

How many films are longer than the average film? Return one number, `above_average_length`.

```sql practice
-- hint: `WHERE length > (SELECT AVG(length) FROM film)` with `COUNT(*)`.
SELECT COUNT(*) AS above_average_length
FROM film
WHERE length > (SELECT AVG(length) FROM film);
```

### Core: above their category's average

Show the `category`, `title` and `length` of films longer than the average length of **their category**. Order by category, then title, and show the first rows.

```sql practice rows=5
-- hint: `AVG(length) OVER (PARTITION BY category)` in a CTE, then filter.
WITH with_avg AS (
  SELECT c.name AS category, f.title, f.length,
         AVG(f.length) OVER (PARTITION BY c.category_id) AS category_avg
  FROM film AS f
  JOIN film_category AS fc ON fc.film_id = f.film_id
  JOIN category AS c ON c.category_id = fc.category_id
)
SELECT category, title, length
FROM with_avg
WHERE length > category_avg
ORDER BY category, title;
```

### Stretch: payments above their customer's average

For customers 1 and 2, show `customer_id`, `payment_id` and `amount` of the payments that are **above that customer's own average payment**. Order by customer, then `payment_id`.

```sql practice
-- hint: A window average `AVG(amount) OVER (PARTITION BY customer_id)`, in a CTE.
WITH with_avg AS (
  SELECT customer_id, payment_id, amount,
         AVG(amount) OVER (PARTITION BY customer_id) AS customer_avg
  FROM payment
  WHERE customer_id IN (1, 2)
)
SELECT customer_id, payment_id, amount
FROM with_avg
WHERE amount > customer_avg
ORDER BY customer_id, payment_id;
```
