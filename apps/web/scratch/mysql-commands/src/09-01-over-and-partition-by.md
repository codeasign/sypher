---
title: "Window Functions: OVER and PARTITION BY"
order: 0
---

A **window function** calculates something across a set of related rows **without collapsing them**. `GROUP BY` gives you one row per group. A window function keeps every row and adds the group's number next to it.

## What you'll learn

- Using an aggregate as a window function with `OVER`
- Splitting rows into groups with `PARTITION BY`
- How this differs from `GROUP BY`

## Syntax

```sql show
SELECT column,
       AGGREGATE_FUNCTION(other_column) OVER (PARTITION BY group_column)
FROM table_name;
```

The `OVER (...)` part is what makes it a window function. `PARTITION BY` names the groups, and it is optional: without it, the whole table is one group.

## Examples

### GROUP BY vs a window

`GROUP BY` collapses each rating to one row:

```sql run
SELECT rating, ROUND(AVG(length), 1) AS avg_length
FROM film
GROUP BY rating
ORDER BY rating;
```

The window version keeps **every film**, and shows its group's average beside it:

```sql run
SELECT title, rating, length,
       ROUND(AVG(length) OVER (PARTITION BY rating), 1) AS avg_length_of_rating
FROM film
ORDER BY film_id;
```

Now each film can be compared with its group, in the same row.

### Compare each row with its group

How far is each film from its rating's average?

```sql run
SELECT title, rating, length,
       ROUND(length - AVG(length) OVER (PARTITION BY rating), 1) AS minutes_from_average
FROM film
ORDER BY film_id;
```

### Share of the total

Each of customer 1's payments as a share of everything that customer has paid:

```sql run
SELECT payment_id, amount,
       SUM(amount) OVER (PARTITION BY customer_id) AS customer_total,
       ROUND(100 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1) AS percent_of_total
FROM payment
WHERE customer_id = 1
ORDER BY payment_id;
```

### One window for the whole table

Leave out `PARTITION BY` and the window is the entire result:

```sql run
SELECT title, length,
       MAX(length) OVER () AS longest_film,
       COUNT(*) OVER () AS total_films
FROM film
ORDER BY film_id;
```

## Try it yourself

Show each payment with the average payment of *its customer*, and each film with the number of films in its rating.

## Watch out

### You cannot filter on a window function in WHERE

Window functions are calculated **after** `WHERE`, so this fails:

```sql run error
SELECT title, length
FROM film
WHERE length > AVG(length) OVER (PARTITION BY rating);
```

Compute it in a derived table or a CTE first, then filter in the outer query:

```sql run
WITH with_avg AS (
  SELECT title, rating, length,
         AVG(length) OVER (PARTITION BY rating) AS avg_length
  FROM film
)
SELECT title, rating, length
FROM with_avg
WHERE length > avg_length
ORDER BY rating, title;
```

### A window only sees the rows that survive WHERE

`WHERE` runs first, so the window function works on the filtered rows only. The same film gets a different "average of its rating" depending on the filter:

```sql run
SELECT (SELECT ROUND(AVG(length), 1) FROM film WHERE rating = 'PG') AS avg_of_all_pg_films,
       (SELECT ROUND(AVG(length), 1) FROM film WHERE rating = 'PG' AND film_id <= 100) AS avg_of_the_first_100_pg_films;
```

If you need the average over everything but want to show only some rows, compute it in a CTE first (as above) and filter in the outer query.

### It is not a replacement for GROUP BY

If you only need one row per group, use `GROUP BY`. Reach for a window function when you need the group's number **next to the individual rows**.

### `OVER` is required

`AVG(length)` on its own is an ordinary aggregate. Only `AVG(length) OVER (...)` is a window function.

## Interview corner

**"What is the difference between a window function and `GROUP BY`?"**
`GROUP BY` collapses rows into one row per group. A window function keeps every row and adds a calculated value computed over a "window" of related rows.

**"What does `PARTITION BY` do?"**
It splits the rows into groups (partitions) for the window function, like `GROUP BY` does for an ordinary aggregate, but without collapsing them.

**"Can you use a window function in `WHERE`?"**
No, because `WHERE` runs before window functions are computed. Wrap the query in a CTE or subquery and filter outside.

## Practice

### Warm-up: average per rating

Show each film's `title`, `rating`, `length` and the average length of its rating as `rating_avg`, rounded to 1 decimal, for films with `film_id` up to 6. Order by `film_id`.

```sql practice
-- hint: `ROUND(AVG(length) OVER (PARTITION BY rating), 1)`. Careful: `WHERE` runs first, so the average is taken over only the films that survive the filter.
SELECT title, rating, length,
       ROUND(AVG(length) OVER (PARTITION BY rating), 1) AS rating_avg
FROM film
WHERE film_id <= 6
ORDER BY film_id;
```

### Core: payment share

For customer 2, show `payment_id`, `amount` and `pct_of_customer`, the percent (1 decimal) each payment is of that customer's total. Order by `payment_id`.

```sql practice
-- hint: `ROUND(100 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1)`.
SELECT payment_id, amount,
       ROUND(100 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1) AS pct_of_customer
FROM payment
WHERE customer_id = 2
ORDER BY payment_id;
```

### Stretch: above their rating's average

Show the `title`, `rating` and `length` of films that are longer than the average length of **their own rating**. Order by `rating`, then `title`, and show the first rows.

```sql practice rows=5
-- hint: Compute the window average in a CTE, and filter in the outer query.
WITH with_avg AS (
  SELECT title, rating, length, AVG(length) OVER (PARTITION BY rating) AS avg_length
  FROM film
)
SELECT title, rating, length
FROM with_avg
WHERE length > avg_length
ORDER BY rating, title;
```
