---
title: "HAVING"
order: 0
---

`HAVING` filters **groups**. It is `WHERE` for the results of `GROUP BY`, and the only place where you can filter on an aggregate such as `COUNT(*)` or `SUM(...)`.

## What you'll learn

- Filtering groups with `HAVING`
- `WHERE` versus `HAVING`
- Using both in one query

## Syntax

```sql show
SELECT column1, aggregate_function(column2)
FROM table_name
WHERE row_condition
GROUP BY column1
HAVING group_condition;
```

## Examples

### Groups above a size

Ratings that have more than 200 films:

```sql run
SELECT rating, COUNT(*) AS films
FROM film
GROUP BY rating
HAVING COUNT(*) > 200
ORDER BY films DESC;
```

### Big spenders

Customers who have paid more than 190 dollars in total:

```sql run
SELECT customer_id, SUM(amount) AS total_spent
FROM payment
GROUP BY customer_id
HAVING SUM(amount) > 190
ORDER BY total_spent DESC, customer_id;
```

Unlike MySQL, PostgreSQL does **not** let `HAVING` use the alias `total_spent`. Repeat the aggregate.

### WHERE and HAVING together

`WHERE` removes rows **first**. `HAVING` removes groups **afterwards**. Customers who made at least 3 payments of over 5 dollars:

```sql run
SELECT customer_id, COUNT(*) AS big_payments
FROM payment
WHERE amount > 5
GROUP BY customer_id
HAVING COUNT(*) >= 3
ORDER BY big_payments DESC, customer_id
LIMIT 5;
```

## Try it yourself

Find the film lengths shared by more than 10 films, and the actors who appear in more than 40 films (`film_actor`).

## Watch out

### WHERE cannot use an aggregate

At the `WHERE` stage the groups do not exist yet, so there is nothing to count. Use `HAVING`:

```sql run error
SELECT rating, COUNT(*)
FROM film
WHERE COUNT(*) > 200
GROUP BY rating;
```

### HAVING cannot use an alias

```sql run error
SELECT customer_id, SUM(amount) AS total_spent
FROM payment
GROUP BY customer_id
HAVING total_spent > 190;
```

### Put row filters in WHERE, not HAVING

These two queries return the same rows, but the second one is better, because `WHERE` throws rows away *before* the work of grouping:

```sql run
SELECT rating, COUNT(*) AS films
FROM film
GROUP BY rating
HAVING rating <> 'G'
ORDER BY rating;
```

```sql run
SELECT rating, COUNT(*) AS films
FROM film
WHERE rating <> 'G'
GROUP BY rating
ORDER BY rating;
```

Use `HAVING` only for conditions on aggregates.

## Interview corner

**"What is the difference between `WHERE` and `HAVING`?"**
`WHERE` filters individual rows before grouping and cannot use aggregates. `HAVING` filters groups after `GROUP BY` and is where aggregate conditions go.

**"Can you use `HAVING` without `GROUP BY`?"**
Yes, the whole table is then treated as one group, but it is rarely useful.

**"Write a query for duplicate values."**
Group by the column and keep the groups with more than one row: `GROUP BY email HAVING COUNT(*) > 1`. You will do this on the DVD Rental data in Module 9.

## Practice

### Warm-up: popular film lengths

Show each film `length` shared by more than 15 films, with how many films there are (`films`). Order by `length`.

```sql practice
-- hint: `GROUP BY length HAVING COUNT(*) > 15`.
SELECT length, COUNT(*) AS films
FROM film
GROUP BY length
HAVING COUNT(*) > 15
ORDER BY length;
```

### Core: frequent renters

Show each `customer_id` who has made **more than 35 rentals**, with the number (`rentals`). Order by `rentals` descending, then `customer_id`.

```sql practice
-- hint: Group `rental` by `customer_id` and use `HAVING COUNT(*) > 35`.
SELECT customer_id, COUNT(*) AS rentals
FROM rental
GROUP BY customer_id
HAVING COUNT(*) > 35
ORDER BY rentals DESC, customer_id;
```

### Stretch: WHERE and HAVING together

Among payments made on or after `2007-03-01`, show each `customer_id` whose total is **over 60 dollars** (`total`). Order by `total` descending, then `customer_id`. Show the first rows.

```sql practice
-- hint: `WHERE payment_date >= '2007-03-01'`, then `HAVING SUM(amount) > 60`.
SELECT customer_id, SUM(amount) AS total
FROM payment
WHERE payment_date >= '2007-03-01'
GROUP BY customer_id
HAVING SUM(amount) > 60
ORDER BY total DESC, customer_id;
```
