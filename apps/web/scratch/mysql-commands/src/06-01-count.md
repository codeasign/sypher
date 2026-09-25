---
title: "COUNT"
order: 0
---

Until now every query returned rows from the table. An **aggregate function** instead takes many rows and returns **one** value that sums them up. `COUNT` is the most common: how many?

## What you'll learn

- What an aggregate function is
- `COUNT(*)`, `COUNT(column)` and `COUNT(DISTINCT column)`
- Counting only some rows with `WHERE`

## Syntax

```sql show
SELECT COUNT(*)
FROM table_name
WHERE condition;
```

## Examples

### How many rows?

```sql run
SELECT COUNT(*) AS total_films
FROM film;
```

`COUNT(*)` counts rows, whatever they contain.

### Counting some of the rows

`WHERE` runs first, and `COUNT` counts what is left:

```sql run
SELECT COUNT(*) AS pg_films
FROM film
WHERE rating = 'PG';
```

### COUNT(column) skips NULLs

`COUNT(column)` counts only the rows where that column has a value:

```sql run
SELECT COUNT(*) AS all_rentals,
       COUNT(return_date) AS returned_rentals
FROM rental;
```

### COUNT(DISTINCT column)

How many *different* values are there?

```sql run
SELECT COUNT(rating) AS ratings_counted,
       COUNT(DISTINCT rating) AS different_ratings
FROM film;
```

Several aggregates can sit in the same `SELECT`. Here, how many customers have rented anything, and how many rentals there were:

```sql run
SELECT COUNT(DISTINCT customer_id) AS customers_who_rented,
       COUNT(*) AS rentals
FROM rental;
```

## Try it yourself

Count the actors, the addresses and the payments. Then count the payments over 5 dollars.

## Watch out

### Aggregates collapse the table

Once you use `COUNT` without `GROUP BY`, you get **one** row. You cannot also select an ordinary column next to it:

```sql run error
SELECT title, COUNT(*)
FROM film;
```

MySQL refuses, because it would not know which title to show next to the count. `GROUP BY` (page 6.4) is the solution.

### COUNT(*) vs COUNT(column) can differ

If a column can be `NULL`, `COUNT(column)` is smaller than `COUNT(*)`. Pick the one that matches your question.

### COUNT returns 0, never NULL

A count over no rows gives `0`:

```sql run
SELECT COUNT(*) AS none_found
FROM film
WHERE rating = 'XYZ';
```

## Interview corner

**"What is the difference between `COUNT(*)`, `COUNT(1)` and `COUNT(column)`?"**
`COUNT(*)` and `COUNT(1)` both count all rows and perform the same. `COUNT(column)` counts only the rows where the column is not `NULL`.

**"How do you count the number of different values?"**
`COUNT(DISTINCT column)`.

## Practice

### Warm-up: how many customers?

Count all customers. Return one number, `customer_count`.

```sql practice
-- hint: `COUNT(*)` on `customer`.
SELECT COUNT(*) AS customer_count
FROM customer;
```

### Core: long films

Count the films longer than 150 minutes. Return one number, `long_films`.

```sql practice
-- hint: `WHERE length > 150`.
SELECT COUNT(*) AS long_films
FROM film
WHERE length > 150;
```

### Stretch: customers and stores

Return, in one row, the number of **different customers** who made a payment (`paying_customers`) and the number of payments over 8 dollars (`big_payments`).

```sql practice
-- hint: These use two different conditions, so use a `CASE` inside `COUNT` or `SUM` for the second.
SELECT COUNT(DISTINCT customer_id) AS paying_customers,
       SUM(CASE WHEN amount > 8 THEN 1 ELSE 0 END) AS big_payments
FROM payment;
```
