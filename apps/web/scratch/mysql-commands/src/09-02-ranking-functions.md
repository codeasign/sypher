---
title: "ROW_NUMBER, RANK and DENSE_RANK"
order: 0
---

Ranking functions number the rows in an order you choose. They answer "who is first?", "who is in the top 3?" and "what is each row's position within its group?". The three of them differ only in how they treat **ties**.

## What you'll learn

- `ROW_NUMBER()`, `RANK()` and `DENSE_RANK()`
- How each one handles ties
- Ranking inside groups

## Syntax

```sql show
SELECT column,
       RANK() OVER (PARTITION BY group_column ORDER BY sort_column DESC) AS position
FROM table_name;
```

`ORDER BY` inside the `OVER` says how to rank. `PARTITION BY` is optional and restarts the numbering for each group.

## Examples

### The three functions side by side

Rank films by length, longest first. Many films tie at the top:

```sql run rows=8
SELECT title, length,
       ROW_NUMBER() OVER (ORDER BY length DESC) AS row_number_,
       RANK() OVER (ORDER BY length DESC) AS rank_,
       DENSE_RANK() OVER (ORDER BY length DESC) AS dense_rank_
FROM film
ORDER BY length DESC, title;
```

| Function | Ties get | Next value after a tie |
|---|---|---|
| `ROW_NUMBER` | different numbers (arbitrary among ties) | continues 1, 2, 3, 4... |
| `RANK` | the same number | skips (1, 1, 1, 4) |
| `DENSE_RANK` | the same number | does not skip (1, 1, 1, 2) |

### Ranking within groups

Number the payments of each customer, newest first:

```sql run
SELECT customer_id, payment_id, amount, payment_date,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY payment_date DESC) AS newest_first
FROM payment
WHERE customer_id IN (1, 2)
ORDER BY customer_id, newest_first;
```

### The longest film in each rating

Compute the rank, then keep only rank 1 from a CTE (window functions cannot be filtered directly):

```sql run
WITH ranked AS (
  SELECT title, rating, length,
         RANK() OVER (PARTITION BY rating ORDER BY length DESC) AS rk
  FROM film
)
SELECT rating, title, length
FROM ranked
WHERE rk = 1
ORDER BY rating, title;
```

Using `RANK` keeps **every** film that ties for longest in its rating.

### Ranking totals

Rank customers by how much they have paid:

```sql run
SELECT customer_id, total_spent,
       DENSE_RANK() OVER (ORDER BY total_spent DESC) AS spending_rank
FROM (SELECT customer_id, SUM(amount) AS total_spent FROM payment GROUP BY customer_id) AS per_customer
ORDER BY spending_rank, customer_id;
```

## Try it yourself

Rank all films by `replacement_cost` and compare the three functions. Then number each customer's rentals from oldest to newest.

## Watch out

### ROW_NUMBER breaks ties arbitrarily

When two rows tie, `ROW_NUMBER` still gives them different numbers, and which gets which is not guaranteed. Add a unique tiebreaker to the `ORDER BY`, for example `ORDER BY length DESC, film_id`, if you need repeatable results.

### RANK leaves gaps

After three rows tied for first place, `RANK` jumps to 4. If you want "the top 3 distinct values", use `DENSE_RANK` and keep `rank <= 3`.

### The window's ORDER BY is not the query's ORDER BY

The `ORDER BY` inside `OVER` only controls the numbering. The rows may come back in any order, so add an outer `ORDER BY` as well if you want them sorted.

## Interview corner

**"What is the difference between `RANK`, `DENSE_RANK` and `ROW_NUMBER`?"**
All three number rows in order. For ties, `ROW_NUMBER` still gives unique numbers, `RANK` gives ties the same number and then skips ahead, and `DENSE_RANK` gives ties the same number without skipping.

**"How do you find the top N per group?"**
Compute `ROW_NUMBER()` (or `RANK`/`DENSE_RANK`) `OVER (PARTITION BY group ORDER BY value DESC)` in a CTE or subquery, then filter `rk <= N`.

**"Find the second-highest value."**
`DENSE_RANK() OVER (ORDER BY value DESC)` and keep rank 2: it handles ties correctly. Module 10 covers this in full.

## Practice

### Warm-up: number the categories

Show each category `name` with a running number `n` in alphabetical order, using `ROW_NUMBER`. Order by `n`, and show the first rows.

```sql practice rows=5
-- hint: `ROW_NUMBER() OVER (ORDER BY name)`.
SELECT name, ROW_NUMBER() OVER (ORDER BY name) AS n
FROM category
ORDER BY n;
```

### Core: the longest film per rating

Show, for each `rating`, the `title` and `length` of its longest film (all ties). Order by rating, then title.

```sql practice
-- hint: `RANK() OVER (PARTITION BY rating ORDER BY length DESC)` in a CTE, then `WHERE rk = 1`.
WITH ranked AS (
  SELECT title, rating, length,
         RANK() OVER (PARTITION BY rating ORDER BY length DESC) AS rk
  FROM film
)
SELECT rating, title, length
FROM ranked
WHERE rk = 1
ORDER BY rating, title;
```

### Stretch: top three spenders

Show the `customer_id` and `total_spent` of customers in the **top three spending ranks** (using `DENSE_RANK`), ordered by rank and customer.

```sql practice
-- hint: Rank the per-customer totals in a CTE, and keep `rk <= 3`.
WITH per_customer AS (
  SELECT customer_id, SUM(amount) AS total_spent
  FROM payment
  GROUP BY customer_id
),
ranked AS (
  SELECT customer_id, total_spent, DENSE_RANK() OVER (ORDER BY total_spent DESC) AS rk
  FROM per_customer
)
SELECT customer_id, total_spent
FROM ranked
WHERE rk <= 3
ORDER BY rk, customer_id;
```
