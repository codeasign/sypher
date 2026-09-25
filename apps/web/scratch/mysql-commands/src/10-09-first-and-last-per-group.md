---
title: "Interview Problem: First and Last Per Group"
order: 0
---

"Show each customer's most recent order" (or first, or biggest) is the **greatest-per-group** problem. It appears in almost every SQL interview, in several disguises, and it has a classic wrong answer.

## What you'll learn

- Why `GROUP BY` with `MAX` cannot return the whole row
- Three correct ways: window functions, a join, and a correlated subquery
- How each handles ties

## The problem

For each customer, show their **latest rental**: the date and the rental id.

## The classic wrong answer

You cannot select `rental_id` next to `MAX(rental_date)`, because the group has many rental ids:

```sql run error
SELECT customer_id, rental_id, MAX(rental_date)
FROM rental
GROUP BY customer_id;
```

MySQL refuses, and in older or looser settings it would silently return a `rental_id` that does **not** belong to the latest date.

## Way 1: ROW_NUMBER

Number each customer's rentals from newest to oldest, and keep number 1:

```sql run rows=6
WITH ranked AS (
  SELECT customer_id, rental_id, rental_date,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY rental_date DESC, rental_id DESC) AS rn
  FROM rental
)
SELECT customer_id, rental_id, rental_date
FROM ranked
WHERE rn = 1
ORDER BY customer_id;
```

The `rental_id DESC` is a tiebreaker in case two rentals share the exact same time.

## Way 2: join to the maximum

Find each customer's latest date, then join back to fetch the full row:

```sql run rows=6
SELECT r.customer_id, r.rental_id, r.rental_date
FROM rental AS r
JOIN (
  SELECT customer_id, MAX(rental_date) AS latest
  FROM rental
  GROUP BY customer_id
) AS m ON m.customer_id = r.customer_id AND m.latest = r.rental_date
ORDER BY r.customer_id, r.rental_id;
```

If a customer has two rentals at exactly the same latest time, **both** are returned.

## Way 3: correlated subquery

Keep a row when no newer row exists for the same customer:

```sql run rows=6
SELECT r.customer_id, r.rental_id, r.rental_date
FROM rental AS r
WHERE NOT EXISTS (
  SELECT 1
  FROM rental AS newer
  WHERE newer.customer_id = r.customer_id
    AND newer.rental_date > r.rental_date
)
ORDER BY r.customer_id, r.rental_id;
```

## First **and** last together

`FIRST_VALUE` and `LAST_VALUE` put both on the same row:

```sql run rows=6
SELECT DISTINCT customer_id,
       FIRST_VALUE(rental_date) OVER w AS first_rental,
       LAST_VALUE(rental_date) OVER w AS last_rental
FROM rental
WINDOW w AS (PARTITION BY customer_id ORDER BY rental_date
             ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
ORDER BY customer_id;
```

A named window (`WINDOW w AS ...`) lets you reuse one definition. A plain `GROUP BY` also works when you only need the dates and not the full rows:

```sql run rows=6
SELECT customer_id, MIN(rental_date) AS first_rental, MAX(rental_date) AS last_rental
FROM rental
GROUP BY customer_id
ORDER BY customer_id;
```

## Try it yourself

Show each customer's biggest payment (the whole row), and the first film each customer ever rented.

## Watch out

### Ties: one row or all of them?

Way 1 returns exactly **one** row per customer (the tiebreaker decides which). Ways 2 and 3 return **all** rows tied for the latest date. Ask the interviewer which is wanted.

### ROW_NUMBER without a tiebreaker

If two rows tie on `rental_date`, `ROW_NUMBER` picks between them arbitrarily, and the answer can change between runs. Always end the `ORDER BY` with a unique column.

### LAST_VALUE needs the full frame

With the default frame, `LAST_VALUE` returns the **current** row. Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, as above.

## Interview corner

**"Return each customer's latest order."**
Give the `ROW_NUMBER` solution, mention the join-to-MAX alternative, and explain the tie behaviour of each.

**"Why doesn't `SELECT id, MAX(date) ... GROUP BY user` work?"**
`id` is not aggregated, so which `id` belongs to the maximum date is undefined. With `ONLY_FULL_GROUP_BY`, MySQL rejects it.

**"Which is fastest?"**
Usually the window function or the join to the pre-aggregated maximum, with an index on `(customer_id, rental_date)`. A correlated subquery can be slow on large tables. Check with `EXPLAIN`.

## Practice

### Warm-up: each customer's largest payment

Show `customer_id`, `payment_id` and `amount` for each customer's **largest single payment** (exactly one row per customer, ties broken by the lowest `payment_id`), for customers 1 to 5. Order by customer.

```sql practice
-- hint: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, payment_id)`, keep `rn = 1`.
WITH ranked AS (
  SELECT customer_id, payment_id, amount,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, payment_id) AS rn
  FROM payment
  WHERE customer_id <= 5
)
SELECT customer_id, payment_id, amount
FROM ranked
WHERE rn = 1
ORDER BY customer_id;
```

### Core: the first film each customer rented

For customers 1 to 5, show `customer_id` and the `title` of the film in their **first rental** (earliest `rental_date`, ties by `rental_id`). Order by customer.

```sql practice
-- hint: Rank each customer's rentals oldest-first, join inventory and film for the title.
WITH ranked AS (
  SELECT r.customer_id, i.film_id,
         ROW_NUMBER() OVER (PARTITION BY r.customer_id ORDER BY r.rental_date, r.rental_id) AS rn
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  WHERE r.customer_id <= 5
)
SELECT ranked.customer_id, f.title
FROM ranked
JOIN film AS f ON f.film_id = ranked.film_id
WHERE ranked.rn = 1
ORDER BY ranked.customer_id;
```

### Stretch: days between first and last

For customers 1 to 5, show `customer_id`, `first_rental`, `last_rental` and `days_active` (the whole days between them). Order by customer.

```sql practice
-- hint: `MIN`, `MAX` and `DATEDIFF(MAX(...), MIN(...))` with a GROUP BY.
SELECT customer_id,
       MIN(rental_date) AS first_rental,
       MAX(rental_date) AS last_rental,
       DATEDIFF(MAX(rental_date), MIN(rental_date)) AS days_active
FROM rental
WHERE customer_id <= 5
GROUP BY customer_id
ORDER BY customer_id;
```
