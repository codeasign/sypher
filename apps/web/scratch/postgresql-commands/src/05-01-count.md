---
title: "COUNT"
order: 0
---

Until now every query returned rows from the table. An **aggregate function** instead takes many rows and returns **one** value that sums them up. `COUNT` is the most common: how many?

## What you'll learn

- What an aggregate function is
- `COUNT(*)`, `COUNT(column)` and `COUNT(DISTINCT column)`
- Counting only some rows with `WHERE` or `FILTER`

## Syntax

```sql show
SELECT COUNT(*) FROM table_name;
SELECT COUNT(column) FROM table_name;
SELECT COUNT(DISTINCT column) FROM table_name;
```

## Examples

### How many rows?

`COUNT(*)` counts rows, whatever they contain.

```sql run
SELECT COUNT(*) AS films FROM film;
```

### Counting some of the rows

`WHERE` runs first, and `COUNT` counts what is left:

```sql run
SELECT COUNT(*) AS long_films
FROM film
WHERE length > 150;
```

### COUNT(column) skips NULLs

`COUNT(column)` counts only the rows where that column has a value:

```sql run
SELECT COUNT(*) AS all_films, COUNT(original_language_id) AS with_original_language
FROM film;
```

### COUNT(DISTINCT column)

How many *different* values are there?

```sql run
SELECT COUNT(DISTINCT customer_id) AS paying_customers, COUNT(*) AS payments
FROM payment;
```

### Several counts in one row: FILTER

PostgreSQL's `FILTER` clause counts only the rows that pass a condition, so one scan gives many counts:

```sql run
SELECT COUNT(*) AS all_films,
       COUNT(*) FILTER (WHERE rating = 'R') AS rated_r,
       COUNT(*) FILTER (WHERE length > 150) AS long_films
FROM film;
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

PostgreSQL refuses, because it would not know which title to show next to the count. `GROUP BY` (page 5.4) is the solution.

### COUNT(*) vs COUNT(column) can differ

If a column can be `NULL`, `COUNT(column)` is smaller than `COUNT(*)`. Pick the one that matches your question.

### COUNT returns bigint, and 0 not NULL

The result type is `bigint`. A count over no rows gives `0`, never `NULL`:

```sql run
SELECT COUNT(*) AS none FROM film WHERE length > 1000;
```

### Counting a big table is not instant

PostgreSQL has to visit the rows to count them (there is no stored row count). On millions of rows, `COUNT(*)` can take seconds. Module 14 shows why.

## Interview corner

**"What is the difference between `COUNT(*)`, `COUNT(1)` and `COUNT(column)`?"**
`COUNT(*)` and `COUNT(1)` both count all rows and perform the same. `COUNT(column)` counts only the rows where the column is not `NULL`.

**"How do you count the number of different values?"**
`COUNT(DISTINCT column)`.

**"How do you count several conditions in one query?"**
`COUNT(*) FILTER (WHERE condition)` once per condition, or `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`.

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
-- hint: `COUNT(*)` with `WHERE length > 150`.
SELECT COUNT(*) AS long_films
FROM film
WHERE length > 150;
```

### Stretch: customers and big payments

Return, in one row, the number of **different customers** who made a payment (`paying_customers`) and the number of payments over 8 dollars (`big_payments`).

```sql practice
-- hint: `COUNT(DISTINCT customer_id)` and `COUNT(*) FILTER (WHERE amount > 8)`.
SELECT COUNT(DISTINCT customer_id) AS paying_customers,
       COUNT(*) FILTER (WHERE amount > 8) AS big_payments
FROM payment;
```
