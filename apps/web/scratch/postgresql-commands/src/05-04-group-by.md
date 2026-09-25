---
title: "GROUP BY"
order: 0
---

`GROUP BY` splits the rows into groups and gives one result row per group. Combined with `COUNT`, `SUM`, `AVG` and friends, it answers questions like "how many films *per rating*?".

## What you'll learn

- Aggregating per group
- Grouping by more than one column, and by position
- Filtering and sorting grouped results
- `string_agg` and `array_agg`

## Syntax

```sql show
SELECT column1, aggregate_function(column2)
FROM table_name
WHERE condition
GROUP BY column1
ORDER BY column1;
```

## Examples

### Count per group

How many films does each rating have?

```sql run
SELECT rating, COUNT(*) AS films
FROM film
GROUP BY rating
ORDER BY rating;
```

### Totals per group

Total revenue for each customer:

```sql run
SELECT customer_id, SUM(amount) AS total_spent
FROM payment
GROUP BY customer_id
ORDER BY customer_id;
```

### Several aggregates at once

```sql run
SELECT rating, COUNT(*) AS films, round(AVG(length), 1) AS avg_length, MAX(length) AS longest
FROM film
GROUP BY rating
ORDER BY rating;
```

### More than one column

Group by two columns, and you get one row per *combination*:

```sql run
SELECT rating, rental_rate, COUNT(*) AS films
FROM film
GROUP BY rating, rental_rate
ORDER BY rating, rental_rate;
```

### Filter first, then group

`WHERE` removes rows **before** they are grouped. Payments per month, for 2007 only:

```sql run
SELECT to_char(payment_date, 'YYYY-MM') AS month, COUNT(*) AS payments, SUM(amount) AS revenue
FROM payment
WHERE payment_date >= '2007-01-01'
GROUP BY to_char(payment_date, 'YYYY-MM')
ORDER BY month;
```

### Listing the members of each group

`string_agg` joins the values of each group into one text, and `array_agg` collects them into an array:

```sql run
SELECT rating,
       string_agg(title, ', ' ORDER BY title) FILTER (WHERE film_id <= 30) AS first_films
FROM film
GROUP BY rating
ORDER BY rating;
```

### Grouping by position

You may write the position of a `SELECT` column instead of repeating the expression. Handy for long ones, but easy to get wrong when the list changes:

```sql run
SELECT to_char(payment_date, 'YYYY-MM') AS month, COUNT(*) AS payments
FROM payment
GROUP BY 1
ORDER BY 1
LIMIT 3;
```

## Try it yourself

Count the customers per store, and the total payments per staff member.

## Watch out

### Every plain column must be in GROUP BY

Once you group, each result row stands for a whole group. A column that is neither grouped nor aggregated has no single value:

```sql run error
SELECT rating, title, COUNT(*)
FROM film
GROUP BY rating;
```

Either add the column to `GROUP BY`, wrap it in an aggregate, or remove it from the `SELECT`. (PostgreSQL is stricter than old MySQL: it always enforces this. The one exception is a column that is functionally dependent on a grouped primary key.)

### NULL is its own group

All `NULL`s in the grouped column land together in one group:

```sql run
SELECT original_language_id, COUNT(*) AS films
FROM film
GROUP BY original_language_id;
```

### WHERE cannot filter on an aggregate

You cannot write `WHERE COUNT(*) > 5`, because `WHERE` runs before grouping. That is `HAVING`'s job, on the next page.

### The alias is allowed in GROUP BY, but not everywhere

PostgreSQL lets `GROUP BY` and `ORDER BY` use a `SELECT` alias, but not `WHERE` or `HAVING`. Repeat the expression there.

## Interview corner

**"What does `GROUP BY` do?"**
It groups rows that share the same values in the listed columns, so aggregate functions are calculated once per group.

**"Why does `SELECT name, COUNT(*) FROM t GROUP BY id` sometimes fail?"**
Because `name` is neither grouped nor aggregated. PostgreSQL requires every selected column to be in the `GROUP BY` or inside an aggregate, unless it is functionally dependent on a grouped primary key.

**"What is the order of `WHERE`, `GROUP BY` and `ORDER BY`?"**
`WHERE` filters rows, `GROUP BY` forms groups, then `ORDER BY` sorts the grouped result.

## Practice

### Warm-up: customers per store

Show each `store_id` and how many customers it has, as `customers`. Order by `store_id`.

```sql practice
-- hint: `GROUP BY store_id`.
SELECT store_id, COUNT(*) AS customers
FROM customer
GROUP BY store_id
ORDER BY store_id;
```

### Core: revenue per staff member

Show each `staff_id` with the number of payments they took (`payments`) and the total (`revenue`). Order by `staff_id`.

```sql practice
-- hint: `COUNT(*)` and `SUM(amount)` grouped by `staff_id`.
SELECT staff_id, COUNT(*) AS payments, SUM(amount) AS revenue
FROM payment
GROUP BY staff_id
ORDER BY staff_id;
```

### Stretch: busiest weekdays

Show each weekday name (`weekday`, `trim(to_char(lower(rental_period), 'Day'))`) and the number of rentals started on it (`rentals`), busiest first. (Break ties alphabetically by weekday.)

```sql practice
-- hint: Group by the weekday text; sort by `rentals DESC, weekday`.
SELECT trim(to_char(lower(rental_period), 'Day')) AS weekday, COUNT(*) AS rentals
FROM rental
GROUP BY 1
ORDER BY rentals DESC, weekday;
```
