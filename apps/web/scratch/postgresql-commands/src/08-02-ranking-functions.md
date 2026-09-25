---
title: "ROW_NUMBER, RANK and DENSE_RANK"
order: 0
---

Ranking functions number the rows in an order you choose. They answer "who is first?", "who is in the top 3?" and "what is each row's position within its group?". The three of them differ only in how they treat **ties**.

## What you'll learn

- `ROW_NUMBER()`, `RANK()` and `DENSE_RANK()`
- How each one handles ties
- Ranking inside groups
- `PERCENT_RANK` and `NTILE` in one line

## Syntax

```sql show
SELECT column1,
       ROW_NUMBER() OVER (PARTITION BY column2 ORDER BY column3 DESC) AS rn
FROM table_name;
```

`ORDER BY` inside the `OVER` says how to rank. `PARTITION BY` is optional and restarts the numbering for each group.

## Examples

### The three functions side by side

Rank films by length, longest first. Many films tie at the top:

```sql run
SELECT title, length,
       ROW_NUMBER() OVER (ORDER BY length DESC) AS row_number,
       RANK() OVER (ORDER BY length DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY length DESC) AS dense_rank
FROM film
ORDER BY length DESC, title
LIMIT 12;
```

### Ranking within groups

Number the payments of each customer, newest first:

```sql run
SELECT customer_id, payment_id, payment_date,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY payment_date DESC, payment_id DESC) AS newest_first
FROM payment
WHERE customer_id <= 2
ORDER BY customer_id, newest_first
LIMIT 6;
```

### The longest film in each rating

Compute the rank, then keep only rank 1 from a CTE (window functions cannot be filtered directly):

```sql run
WITH ranked AS (
  SELECT title, rating, length,
         RANK() OVER (PARTITION BY rating ORDER BY length DESC) AS rnk
  FROM film
)
SELECT rating, title, length
FROM ranked
WHERE rnk = 1
ORDER BY rating, title
LIMIT 6;
```

Using `RANK` keeps **every** film that ties for longest in its rating.

### Ranking totals

Rank customers by how much they have paid:

```sql run
SELECT customer_id, SUM(amount) AS total,
       DENSE_RANK() OVER (ORDER BY SUM(amount) DESC) AS spend_rank
FROM payment
GROUP BY customer_id
ORDER BY spend_rank, customer_id
LIMIT 5;
```

Note that the window function can use an aggregate: the grouping happens first, and the ranking then runs over the grouped rows.

### PERCENT_RANK and NTILE

`PERCENT_RANK` gives a relative position from 0 to 1. `NTILE(n)` splits the rows into `n` groups of nearly equal size:

```sql run
SELECT title, length,
       round(PERCENT_RANK() OVER (ORDER BY length)::numeric, 3) AS pct_rank,
       NTILE(4) OVER (ORDER BY length, film_id) AS quartile
FROM film
ORDER BY film_id
LIMIT 3;
```

## Try it yourself

Rank all films by `replacement_cost` and compare the three functions. Then number each customer's rentals from oldest to newest.

## Watch out

### ROW_NUMBER breaks ties arbitrarily

When two rows tie, `ROW_NUMBER` still gives them different numbers, and which gets which is not guaranteed. Add a unique tiebreaker to the `ORDER BY`, for example `ORDER BY length DESC, film_id`, if you need repeatable results.

### RANK leaves gaps

After several rows tied for first place, `RANK` jumps past them (1, 1, 1, 4). If you want "the top 3 distinct values", use `DENSE_RANK` and keep `rank <= 3`.

### The window's ORDER BY is not the query's ORDER BY

The `ORDER BY` inside `OVER` only controls the numbering. The rows may come back in any order, so add an outer `ORDER BY` as well if you want them sorted.

## Interview corner

**"What is the difference between `RANK`, `DENSE_RANK` and `ROW_NUMBER`?"**
All three number rows in order. For ties, `ROW_NUMBER` still gives unique numbers, `RANK` gives ties the same number and then skips ahead, and `DENSE_RANK` gives ties the same number without skipping.

**"How do you find the top N per group?"**
Compute `ROW_NUMBER()` (or `RANK`/`DENSE_RANK`) `OVER (PARTITION BY group ORDER BY value DESC)` in a CTE or subquery, then filter `rk <= N`.

**"Find the second-highest value."**
`DENSE_RANK() OVER (ORDER BY value DESC)` and keep rank 2: it handles ties correctly. Module 9 covers this in full.

## Practice

### Warm-up: number the categories

Show each category `name` with a running number `n` in alphabetical order, using `ROW_NUMBER`. Order by `n`, and show the first rows.

```sql practice
-- hint: `ROW_NUMBER() OVER (ORDER BY name)`.
SELECT name, ROW_NUMBER() OVER (ORDER BY name) AS n
FROM category
ORDER BY n;
```

### Core: the longest film per rating

Show, for each `rating`, the `title` and `length` of its longest film (all ties). Order by rating, then title.

```sql practice
-- hint: `RANK() OVER (PARTITION BY rating ORDER BY length DESC)`, then keep rank 1.
WITH ranked AS (
  SELECT rating, title, length, RANK() OVER (PARTITION BY rating ORDER BY length DESC) AS rnk
  FROM film
)
SELECT rating, title, length
FROM ranked
WHERE rnk = 1
ORDER BY rating, title;
```

### Stretch: top three spenders

Show the `customer_id` and `total_spent` of customers in the **top three spending ranks** (using `DENSE_RANK`), ordered by rank and customer.

```sql practice
-- hint: Group payments per customer, `DENSE_RANK() OVER (ORDER BY SUM(amount) DESC)` in a CTE, then `rnk <= 3`.
WITH totals AS (
  SELECT customer_id, SUM(amount) AS total_spent,
         DENSE_RANK() OVER (ORDER BY SUM(amount) DESC) AS rnk
  FROM payment
  GROUP BY customer_id
)
SELECT customer_id, total_spent
FROM totals
WHERE rnk <= 3
ORDER BY rnk, customer_id;
```
