---
title: "Window Functions: OVER and PARTITION BY"
order: 0
---

A **window function** calculates something across a set of related rows **without collapsing them**. `GROUP BY` gives you one row per group. A window function keeps every row and adds the group's number next to it.

## What you'll learn

- Using an aggregate as a window function with `OVER`
- Splitting rows into groups with `PARTITION BY`
- How this differs from `GROUP BY`
- Why you cannot filter on a window function directly

## Syntax

```sql show
SELECT column1,
       aggregate_function(column2) OVER (PARTITION BY column3) AS alias
FROM table_name;
```

The `OVER (...)` part is what makes it a window function. `PARTITION BY` names the groups, and it is optional: without it, the whole table is one group.

## Examples

### GROUP BY vs a window

`GROUP BY` collapses each rating to one row:

```sql run
SELECT rating, round(AVG(length), 1) AS avg_length
FROM film
GROUP BY rating
ORDER BY rating;
```

The window version keeps **every film**, and shows its group's average beside it:

```sql run
SELECT title, rating, length,
       round(AVG(length) OVER (PARTITION BY rating), 1) AS rating_avg
FROM film
ORDER BY film_id
LIMIT 5;
```

Now each film can be compared with its group, in the same row.

### Compare each row with its group

How far is each film from its rating's average?

```sql run
SELECT title, rating, length,
       round(length - AVG(length) OVER (PARTITION BY rating), 1) AS diff_from_avg
FROM film
ORDER BY film_id
LIMIT 5;
```

### Share of the total

Each of customer 1's payments as a share of everything that customer has paid:

```sql run
SELECT payment_id, amount,
       round(100 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1) AS pct_of_customer
FROM payment
WHERE customer_id = 1
ORDER BY payment_id
LIMIT 5;
```

### One window for the whole table

Leave out `PARTITION BY` and the window is the entire result:

```sql run
SELECT title, length, COUNT(*) OVER () AS total_films
FROM film
ORDER BY film_id
LIMIT 3;
```

### A named window

When you repeat the same window several times, name it once with `WINDOW`:

```sql run
SELECT title, rating, length,
       MIN(length) OVER w AS shortest_in_rating,
       MAX(length) OVER w AS longest_in_rating
FROM film
WINDOW w AS (PARTITION BY rating)
ORDER BY film_id
LIMIT 3;
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
WITH x AS (
  SELECT title, rating, length, AVG(length) OVER (PARTITION BY rating) AS rating_avg
  FROM film
)
SELECT title, rating, length
FROM x
WHERE length > rating_avg
ORDER BY length DESC, title
LIMIT 3;
```

### A window only sees the rows that survive WHERE

`WHERE` runs first, so the window function works on the filtered rows only. The same film gets a different "average of its rating" depending on the filter:

```sql run
SELECT title, rating, length,
       round(AVG(length) OVER (PARTITION BY rating), 1) AS avg_of_short_films_only
FROM film
WHERE length < 60 AND film_id <= 60
ORDER BY film_id
LIMIT 3;
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
-- hint: `round(AVG(length) OVER (PARTITION BY rating), 1)`, and filter `film_id <= 6` in an outer query so the average uses all films.
WITH x AS (
  SELECT film_id, title, rating, length, round(AVG(length) OVER (PARTITION BY rating), 1) AS rating_avg
  FROM film
)
SELECT title, rating, length, rating_avg
FROM x
WHERE film_id <= 6
ORDER BY film_id;
```

### Core: payment share

For customer 2, show `payment_id`, `amount` and `pct_of_customer`, the percent (1 decimal) each payment is of that customer's total. Order by `payment_id`. Show the first rows.

```sql practice
-- hint: `round(100 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1)`, then `WHERE customer_id = 2`.
SELECT payment_id, amount,
       round(100 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1) AS pct_of_customer
FROM payment
WHERE customer_id = 2
ORDER BY payment_id;
```

### Stretch: above their rating's average

Show the `title`, `rating` and `length` of films that are longer than the average length of **their own rating**. Order by `rating`, then `title`, and show the first rows.

```sql practice
-- hint: Compute the window average in a CTE, then filter `length > rating_avg`.
WITH x AS (
  SELECT title, rating, length, AVG(length) OVER (PARTITION BY rating) AS rating_avg
  FROM film
)
SELECT title, rating, length
FROM x
WHERE length > rating_avg
ORDER BY rating, title;
```
