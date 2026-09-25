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
SELECT SUM(column1), AVG(column1)
FROM table_name
WHERE condition;
```

## Examples

### Total money taken

```sql run
SELECT SUM(amount) AS total_revenue
FROM payment;
```

### The average payment

Averages often have a long tail of decimals. Round them (the result of `AVG` on a `numeric` column is `numeric`, so `round(x, 2)` works):

```sql run
SELECT AVG(amount) AS raw_average, round(AVG(amount), 2) AS average
FROM payment;
```

### With a filter

Total revenue from payments over 5 dollars:

```sql run
SELECT SUM(amount) AS big_payments_total
FROM payment
WHERE amount > 5;
```

### Everything together

```sql run
SELECT COUNT(*) AS payments,
       SUM(amount) AS total,
       round(AVG(amount), 2) AS average,
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
SELECT AVG(original_language_id) AS ignoring_nulls, AVG(COALESCE(original_language_id, 0)) AS nulls_as_zero
FROM film;
```

### SUM over nothing is NULL, not 0

```sql run
SELECT SUM(amount) AS sum_of_nothing
FROM payment
WHERE amount > 1000;
```

Use `COALESCE(SUM(amount), 0)` when you want a `0` in a report.

### AVG of whole numbers

`AVG` of an integer column returns a `numeric` with many decimals, so it is safe. But `SUM(a) / COUNT(a)` on integers is whole-number division, so it truncates. Prefer `AVG`.

### SUM of integers grows the type

`SUM` of an `integer` column returns `bigint`, so it does not overflow. `SUM` of a `bigint` returns `numeric`.

## Interview corner

**"How do `SUM` and `AVG` treat `NULL`?"**
Both ignore `NULL` values. `SUM` of no values is `NULL`. `AVG` is the sum divided by the count of non-`NULL` values.

**"How would you calculate a weighted average?"**
`SUM(value * weight) / SUM(weight)`.

## Practice

### Warm-up: average film length

Return the average film `length`, rounded to 1 decimal place, as `average_length`. (`length` is an integer, so cast: `round(AVG(length), 1)` works because `AVG` returns `numeric`.)

```sql practice
-- hint: `round(AVG(length), 1)`.
SELECT round(AVG(length), 1) AS average_length
FROM film;
```

### Core: revenue in a period

Return the total of all payments made on or after `2007-04-01` as `april_and_later`.

```sql practice
-- hint: `SUM(amount)` with `WHERE payment_date >= '2007-04-01'`.
SELECT SUM(amount) AS april_and_later
FROM payment
WHERE payment_date >= '2007-04-01';
```

### Stretch: rounded report

In one row return `payments` (how many), `total` (sum), `average` (to 2 decimals), and `share_over_5`: the percentage (0 to 100, 1 decimal) of payments over 5 dollars.

```sql practice
-- hint: `100.0 * COUNT(*) FILTER (WHERE amount > 5) / COUNT(*)`, rounded.
SELECT COUNT(*) AS payments,
       SUM(amount) AS total,
       round(AVG(amount), 2) AS average,
       round(100.0 * COUNT(*) FILTER (WHERE amount > 5) / COUNT(*), 1) AS share_over_5
FROM payment;
```
