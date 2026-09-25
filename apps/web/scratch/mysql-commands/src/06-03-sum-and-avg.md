---
title: "SUM and AVG"
order: 0
---

`SUM` adds a column up, and `AVG` finds its average. They work on numbers only, and they are how every revenue, cost and average report is built.

## What you'll learn

- `SUM` and `AVG`
- Rounding averages
- How `NULL` and empty results behave

## Syntax

```sql show
SELECT SUM(column), AVG(column)
FROM table_name;
```

## Examples

### Total money taken

```sql run
SELECT SUM(amount) AS total_revenue
FROM payment;
```

### The average payment

```sql run
SELECT AVG(amount) AS average_payment
FROM payment;
```

Averages often have a long tail of decimals. Round them:

```sql run
SELECT ROUND(AVG(amount), 2) AS average_payment
FROM payment;
```

### With a filter

Total revenue from payments over 5 dollars:

```sql run
SELECT SUM(amount) AS big_payment_revenue
FROM payment
WHERE amount > 5;
```

### Everything together

```sql run
SELECT COUNT(*) AS payments,
       SUM(amount) AS total,
       ROUND(AVG(amount), 2) AS average,
       MIN(amount) AS smallest,
       MAX(amount) AS largest
FROM payment;
```

## Try it yourself

Find the average `length` of films, and the total `replacement_cost` of all films.

## Watch out

### AVG ignores NULLs

`AVG(column)` divides by the number of **non-`NULL`** values, not by all rows. If missing values should count as 0, say so:

```sql run
SELECT AVG(DATEDIFF(return_date, rental_date)) AS avg_days_returned_only,
       AVG(IFNULL(DATEDIFF(return_date, rental_date), 0)) AS avg_if_unreturned_counts_as_zero
FROM rental;
```

### SUM over nothing is NULL, not 0

```sql run
SELECT SUM(amount) AS sum_of_nothing
FROM payment
WHERE amount > 1000;
```

Use `IFNULL(SUM(amount), 0)` or `COALESCE` when you want a `0` in a report.

### Dividing whole numbers differs between databases

`AVG` of whole numbers returns a decimal, and so does `/` on two whole numbers in MySQL: `7 / 2` is `3.5` (use `DIV` if you want the whole number `3`). Some other databases, such as PostgreSQL and SQL Server, return `3` for `7 / 2` when both sides are integers, so a query moved between databases can quietly change its answers.

## Interview corner

**"How do `SUM` and `AVG` treat `NULL`?"**
Both ignore `NULL` values. `SUM` of no values is `NULL`. `AVG` is the sum divided by the count of non-`NULL` values.

**"How would you calculate a weighted average?"**
`SUM(value * weight) / SUM(weight)`.

## Practice

### Warm-up: average film length

Return the average film `length`, rounded to 1 decimal place, as `average_length`.

```sql practice
-- hint: `ROUND(AVG(length), 1)`.
SELECT ROUND(AVG(length), 1) AS average_length
FROM film;
```

### Core: revenue in a period

Return the total of all payments made on or after `2005-08-01` as `august_and_later`.

```sql practice
-- hint: `SUM(amount)` with a `WHERE payment_date >= '2005-08-01'`.
SELECT SUM(amount) AS august_and_later
FROM payment
WHERE payment_date >= '2005-08-01';
```

### Stretch: rounded report

In one row return `payments` (how many), `total` (sum), `average` (to 2 decimals), and `share_over_5` — the percentage (0 to 100, 1 decimal) of payments over 5 dollars.

```sql practice
-- hint: The percentage is `100 * SUM(CASE WHEN amount > 5 THEN 1 ELSE 0 END) / COUNT(*)`.
SELECT COUNT(*) AS payments,
       SUM(amount) AS total,
       ROUND(AVG(amount), 2) AS average,
       ROUND(100 * SUM(CASE WHEN amount > 5 THEN 1 ELSE 0 END) / COUNT(*), 1) AS share_over_5
FROM payment;
```
