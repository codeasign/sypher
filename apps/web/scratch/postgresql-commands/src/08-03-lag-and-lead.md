---
title: "LAG and LEAD"
order: 0
---

`LAG` looks at the **previous** row, and `LEAD` looks at the **next** row, without a self join. They answer questions like "how much did this differ from last time?" and "how long until the next one?".

## What you'll learn

- Reading the previous row with `LAG`
- Reading the next row with `LEAD`
- Calculating changes between consecutive rows
- Working with intervals between rows

## Syntax

```sql show
LAG(column, offset, default) OVER (PARTITION BY ... ORDER BY ...)
LEAD(column, offset, default) OVER (PARTITION BY ... ORDER BY ...)
```

`offset` is how many rows back or forward (default 1), and `default` is what to return when there is no such row (default `NULL`). The `ORDER BY` inside `OVER` is required: "previous" needs an order.

## Examples

### The previous payment

Customer 1's payments, each with the one before it:

```sql run
SELECT payment_id, payment_date, amount,
       LAG(amount) OVER (ORDER BY payment_date, payment_id) AS previous_amount
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id
LIMIT 4;
```

The first row has no previous row, so it shows `NULL`.

### The next payment

```sql run
SELECT payment_id, amount,
       LEAD(amount) OVER (ORDER BY payment_date, payment_id) AS next_amount
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id
LIMIT 4;
```

### Change from one row to the next

```sql run
SELECT payment_id, amount,
       amount - LAG(amount) OVER (ORDER BY payment_date, payment_id) AS change
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id
LIMIT 4;
```

### Time between events

How long passed between one rental and the next, for customer 1? Subtracting timestamps gives an interval:

```sql run
SELECT rental_id, lower(rental_period) AS rented_at,
       lower(rental_period) - LAG(lower(rental_period)) OVER (ORDER BY lower(rental_period), rental_id) AS since_previous
FROM rental
WHERE customer_id = 1
ORDER BY lower(rental_period), rental_id
LIMIT 4;
```

### For every customer at once

Add `PARTITION BY` and the "previous row" restarts for each customer:

```sql run
SELECT customer_id, payment_id, amount,
       LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY payment_date, payment_id) AS previous_amount
FROM payment
WHERE customer_id <= 2
ORDER BY customer_id, payment_date, payment_id
LIMIT 4;
```

Here the third argument `0` replaces the `NULL` at the start of each customer.

## Try it yourself

Show each film with the length of the film that comes before it in `title` order, and each rental with the *next* rental time for the same customer.

## Watch out

### The first (or last) row is NULL

`LAG` has nothing before the first row and `LEAD` has nothing after the last. Give them a third argument, or handle `NULL`, before you calculate with the result.

### Without PARTITION BY the rows all form one sequence

Over the whole `payment` table, the "previous" row for a customer's first payment would be another customer's last payment. Partition by the thing whose history you want.

### Order decides everything

`LAG` follows the `ORDER BY` **inside** `OVER`. If two rows tie on it, which is "previous" is arbitrary. Add a unique column as a tiebreaker.

### Subtracting two timestamps gives an interval

`lower(rental_period) - LAG(...)` is an `interval` like `1 day 03:00:00`, and the first row's value is `NULL`. To turn it into hours: `EXTRACT(epoch FROM x) / 3600`.

## Interview corner

**"What do `LAG` and `LEAD` do?"**
They return a value from a previous (`LAG`) or following (`LEAD`) row in the window's order, in the same row as the current one.

**"How would you calculate month-over-month growth?"**
Aggregate to one row per month, then use `LAG(total) OVER (ORDER BY month)` and compute `(total - previous) / previous`.

**"How do you find the gap between consecutive events per user?"**
`event_time - LAG(event_time) OVER (PARTITION BY user ORDER BY event_time)`.

## Practice

### Warm-up: previous film length

Show `title`, `length` and `previous_length` (the length of the film before it, in `film_id` order) for films with `film_id` up to 5. Order by `film_id`.

```sql practice
-- hint: `LAG(length) OVER (ORDER BY film_id)`, then filter in an outer query.
WITH x AS (
  SELECT film_id, title, length, LAG(length) OVER (ORDER BY film_id) AS previous_length
  FROM film
)
SELECT title, length, previous_length
FROM x
WHERE film_id <= 5
ORDER BY film_id;
```

### Core: gaps between rentals

For customer 2, show `rental_id`, the rental start `rented_at` and `hours_since_previous`, the number of whole hours since their previous rental (`floor(EXTRACT(epoch FROM gap) / 3600)`). Order by `rented_at`. Show the first rows.

```sql practice
-- hint: `lower(rental_period) - LAG(lower(rental_period)) OVER (ORDER BY lower(rental_period), rental_id)`.
SELECT rental_id, lower(rental_period) AS rented_at,
       floor(EXTRACT(epoch FROM lower(rental_period) - LAG(lower(rental_period)) OVER (ORDER BY lower(rental_period), rental_id)) / 3600) AS hours_since_previous
FROM rental
WHERE customer_id = 2
ORDER BY rented_at, rental_id;
```

### Stretch: the biggest jump

For customer 1, show the `payment_id`, `amount` and `change_from_previous` for every payment where the amount **went up** compared with the previous one. Order by `payment_date`, then `payment_id`.

```sql practice
-- hint: Compute the change in a CTE, then keep `change_from_previous > 0`.
WITH x AS (
  SELECT payment_id, payment_date, amount,
         amount - LAG(amount) OVER (ORDER BY payment_date, payment_id) AS change_from_previous
  FROM payment
  WHERE customer_id = 1
)
SELECT payment_id, amount, change_from_previous
FROM x
WHERE change_from_previous > 0
ORDER BY payment_date, payment_id;
```
