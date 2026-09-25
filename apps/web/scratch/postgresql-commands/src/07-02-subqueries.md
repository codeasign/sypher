---
title: "Subqueries"
order: 0
---

A **subquery** is a query inside another query. The inner query runs first, and its result is used by the outer query. It lets you answer questions in two steps without saving anything in between.

## What you'll learn

- A subquery that returns one value (scalar)
- A subquery that returns a list (with `IN`)
- A subquery in `FROM` (a derived table)
- A correlated subquery

## Syntax

```sql show
SELECT column1
FROM table1
WHERE column2 > (SELECT AVG(column2) FROM table1);
```

The subquery goes in brackets.

## Examples

### A single value

"Which films are longer than the average film?" First the average, then the comparison:

```sql run
SELECT title, length
FROM film
WHERE length > (SELECT AVG(length) FROM film)
ORDER BY length DESC, title
LIMIT 5;
```

The inner query `SELECT AVG(length) FROM film` produces one number (about {{= SELECT round(AVG(length), 2) FROM film }}), and the outer query compares each film's length with it.

### A list of values with IN

Films in the Horror category. The inner query returns a list of film ids:

```sql run
SELECT title
FROM film
WHERE film_id IN (
  SELECT fc.film_id
  FROM film_category fc
  JOIN category c ON c.category_id = fc.category_id
  WHERE c.name = 'Horror'
)
ORDER BY title
LIMIT 5;
```

### A subquery as a column

```sql run
SELECT c.customer_id, c.last_name,
       (SELECT COUNT(*) FROM rental r WHERE r.customer_id = c.customer_id) AS rentals
FROM customer c
ORDER BY c.customer_id
LIMIT 5;
```

### A derived table

A subquery in `FROM` acts as a temporary table. It **must have an alias**. What is the average of the customers' total spending?

```sql run
SELECT round(AVG(total), 2) AS average_customer_total
FROM (SELECT customer_id, SUM(amount) AS total FROM payment GROUP BY customer_id) AS per_customer;
```

You cannot write `AVG(SUM(amount))` directly, so the inner query does the first step and the outer query does the second.

### A correlated subquery

A correlated subquery uses a column from the outer query, so it re-runs for every outer row. Films longer than the average **for their own rating**:

```sql run
SELECT f.title, f.rating, f.length
FROM film f
WHERE f.length > (SELECT AVG(f2.length) FROM film f2 WHERE f2.rating = f.rating)
ORDER BY f.length DESC, f.title
LIMIT 5;
```

## Try it yourself

Find the customers whose total spending is above the average customer's total, using a derived table, and the films whose `replacement_cost` equals the most expensive one.

## Watch out

### A single-value comparison needs a single value

If the subquery returns more than one row, `=` and `>` cannot pick one:

```sql run error
SELECT title
FROM film
WHERE length = (SELECT length FROM film WHERE rating = 'G');
```

Use `IN` for a list, or make the subquery return one row.

### A derived table must have an alias

Add `AS something` after the closing bracket. (PostgreSQL 16 and later relaxed this, but older versions and other databases still insist.)

### NOT IN and NULL, again

If the list of a `NOT IN` subquery contains a `NULL`, the whole test never returns rows (see page 3.9). Prefer `NOT EXISTS` (next page), or filter the `NULL`s out.

### Correlated subqueries can be slow

They run once for each outer row. Often the same result can be written with a join or a window function (Module 8), which the planner can optimise better.

## Interview corner

**"What is a subquery?"**
A `SELECT` nested inside another statement. It can appear in `WHERE`, `FROM` or the column list.

**"What is a correlated subquery?"**
One that refers to columns of the outer query, so it is evaluated for each outer row. A normal subquery is evaluated once.

**"Subquery or join: which is better?"**
They often give the same answer. Joins are usually easier for the planner, and subqueries can be clearer when you only need a yes/no or a single value. PostgreSQL can often rewrite one into the other. Measure with `EXPLAIN` when it matters.

## Practice

### Warm-up: the priciest to replace

Show the `title` and `replacement_cost` of every film whose replacement cost equals the highest one. Order by title, and show the first rows.

```sql practice
-- hint: `WHERE replacement_cost = (SELECT MAX(replacement_cost) FROM film)`.
SELECT title, replacement_cost
FROM film
WHERE replacement_cost = (SELECT MAX(replacement_cost) FROM film)
ORDER BY title;
```

### Core: above-average customers

Show the `customer_id` and total spent (`total_spent`) for customers who spent **more than the average customer**. Order by `total_spent` descending, then `customer_id`. Show the first rows.

```sql practice
-- hint: Group payments per customer; compare each total with the average of those totals from a subquery.
SELECT customer_id, SUM(amount) AS total_spent
FROM payment
GROUP BY customer_id
HAVING SUM(amount) > (SELECT AVG(total) FROM (SELECT SUM(amount) AS total FROM payment GROUP BY customer_id) t)
ORDER BY total_spent DESC, customer_id;
```

### Stretch: longest in each rating

Show each film's `title`, `rating` and `length` **only when it is the longest film of its rating** (ties included). Order by `rating`, then `title`.

```sql practice
-- hint: Correlated subquery: `f.length = (SELECT MAX(length) FROM film WHERE rating = f.rating)`.
SELECT f.title, f.rating, f.length
FROM film f
WHERE f.length = (SELECT MAX(f2.length) FROM film f2 WHERE f2.rating = f.rating)
ORDER BY f.rating, f.title;
```
