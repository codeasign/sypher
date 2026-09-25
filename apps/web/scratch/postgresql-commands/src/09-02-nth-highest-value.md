---
title: "Interview Problem: The Nth Highest Value"
order: 0
---

"Find the second-highest salary" is the most-asked SQL interview question there is. It looks simple, and it tests ties, `NULL`s and whether you know several ways to solve it. Here it is on this database: the second-highest **replacement cost** of a film.

## What you'll learn

- Four ways to find the Nth highest value
- Why `DISTINCT` (or `DENSE_RANK`) matters when values tie
- What to return when there is no Nth value

## The problem

Find the second-highest `replacement_cost` among the films. Several films share the top price, and that is the whole point of the question.

## Why the obvious answer is wrong

The top of the list is full of ties:

```sql run
SELECT replacement_cost, COUNT(*) AS films
FROM film
GROUP BY replacement_cost
ORDER BY replacement_cost DESC
LIMIT 3;
```

If you just take the second row of `ORDER BY replacement_cost DESC`, you get the **same** top price again, because many films share it. You want the second **distinct** value.

## Way 1: DISTINCT with LIMIT and OFFSET

```sql run
SELECT DISTINCT replacement_cost
FROM film
ORDER BY replacement_cost DESC
LIMIT 1 OFFSET 1;
```

`OFFSET 1` skips the highest. For the Nth highest, use `OFFSET N-1`.

## Way 2: the maximum below the maximum

```sql run
SELECT MAX(replacement_cost) AS second_highest
FROM film
WHERE replacement_cost < (SELECT MAX(replacement_cost) FROM film);
```

This works for the second-highest only. Going deeper means nesting more subqueries.

## Way 3: DENSE_RANK (the general solution)

`DENSE_RANK` numbers the distinct values, so rank 2 is exactly the second-highest, and it works for any N:

```sql run
SELECT DISTINCT replacement_cost AS second_highest
FROM (
  SELECT replacement_cost, DENSE_RANK() OVER (ORDER BY replacement_cost DESC) AS rnk
  FROM film
) x
WHERE rnk = 2;
```

## Way 4: count how many are higher

A value is the Nth highest if exactly N-1 distinct values are above it. No window functions needed:

```sql run
SELECT DISTINCT f1.replacement_cost AS second_highest
FROM film f1
WHERE (SELECT COUNT(DISTINCT f2.replacement_cost) FROM film f2 WHERE f2.replacement_cost > f1.replacement_cost) = 1;
```

## Which rows have it?

Once you have the value, use it to fetch the actual films:

```sql run
SELECT title, replacement_cost
FROM film
WHERE replacement_cost = (
  SELECT DISTINCT replacement_cost FROM film ORDER BY replacement_cost DESC LIMIT 1 OFFSET 1
)
ORDER BY title
LIMIT 5;
```

## Try it yourself

Find the third-highest `length`, and the second-lowest `rental_rate`. Solve each with at least two of the methods above.

## Watch out

### Ties: RANK vs DENSE_RANK vs ROW_NUMBER

`ROW_NUMBER` would call the second row "2" even if it ties with the first, giving the wrong answer. `RANK` skips numbers after a tie, so rank 2 may not exist. **`DENSE_RANK` is the right one** for "Nth distinct value".

### When there is no Nth value, return NULL

`LIMIT ... OFFSET` on a table with too few distinct values returns **no row** at all, not a `NULL`. Interviewers often ask for `NULL`. Wrap the query in a scalar subquery:

```sql run
SELECT (SELECT DISTINCT replacement_cost FROM film ORDER BY replacement_cost DESC LIMIT 1 OFFSET 50) AS fiftieth_highest;
```

A subquery that returns no rows becomes `NULL` when used as a value.

### Forgetting DISTINCT

`ORDER BY replacement_cost DESC LIMIT 1 OFFSET 1` without `DISTINCT` returns the top value again, as shown at the start.

## Interview corner

**"Find the second-highest salary."**
Any of the four ways. The strongest answer uses `DENSE_RANK` and explains ties: "I use `DENSE_RANK` rather than `ROW_NUMBER` so employees with equal salaries share a rank."

**"What if there is no second-highest?"**
Return `NULL`: wrap the query in a scalar subquery, or use `MAX` over the filtered set (Way 2 returns `NULL` when nothing is lower).

**"How would you generalise it to the Nth?"**
`DENSE_RANK() ... WHERE rk = N`, or `LIMIT 1 OFFSET N-1` on `DISTINCT` values.

## Practice

### Warm-up: third-highest length

Return the third-highest distinct film `length` as `third_longest`.

```sql practice
-- hint: `SELECT DISTINCT length ... ORDER BY length DESC LIMIT 1 OFFSET 2`, wrapped so the column is named.
SELECT (SELECT DISTINCT length FROM film ORDER BY length DESC LIMIT 1 OFFSET 2) AS third_longest;
```

### Core: with DENSE_RANK

Return the `title` and `length` of every film with the **second-longest** length (all ties), ordered by title. Show the first rows.

```sql practice
-- hint: `DENSE_RANK() OVER (ORDER BY length DESC)` in a subquery, keep `rnk = 2`.
SELECT title, length
FROM (
  SELECT title, length, DENSE_RANK() OVER (ORDER BY length DESC) AS rnk
  FROM film
) x
WHERE rnk = 2
ORDER BY title;
```

### Stretch: the second-biggest spender

Return the `customer_id` and `total_spent` of the customer(s) with the **second-highest total spending**.

```sql practice
-- hint: Total per customer, `DENSE_RANK() OVER (ORDER BY total DESC)`, keep rank 2.
SELECT customer_id, total_spent
FROM (
  SELECT customer_id, SUM(amount) AS total_spent, DENSE_RANK() OVER (ORDER BY SUM(amount) DESC) AS rnk
  FROM payment
  GROUP BY customer_id
) x
WHERE rnk = 2
ORDER BY customer_id;
```
