---
title: "GROUP BY"
order: 0
---

`GROUP BY` splits the rows into groups and gives one result row per group. Combined with `COUNT`, `SUM`, `AVG` and friends, it answers questions like "how many films *per rating*?".

## What you'll learn

- Aggregating per group
- Grouping by more than one column
- Filtering and sorting grouped results
- `GROUP_CONCAT`

## Syntax

```sql show
SELECT column, AGGREGATE_FUNCTION(other_column)
FROM table_name
WHERE condition
GROUP BY column
ORDER BY column;
```

## Examples

### Count per group

How many films does each rating have?

```sql run
SELECT rating, COUNT(*) AS films
FROM film
GROUP BY rating
ORDER BY films DESC;
```

### Totals per group

Total revenue for each customer:

```sql run
SELECT customer_id, SUM(amount) AS total_spent
FROM payment
GROUP BY customer_id
ORDER BY total_spent DESC, customer_id;
```

### Several aggregates at once

```sql run
SELECT rating,
       COUNT(*) AS films,
       ROUND(AVG(length), 1) AS avg_length,
       MIN(rental_rate) AS cheapest,
       MAX(rental_rate) AS dearest
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

`WHERE` removes rows **before** they are grouped. Here, payments per day, for August only:

```sql run
SELECT DATE(payment_date) AS payment_day, COUNT(*) AS payments, SUM(amount) AS revenue
FROM payment
WHERE payment_date >= '2005-08-01' AND payment_date < '2005-09-01'
GROUP BY DATE(payment_date)
ORDER BY payment_day;
```

### Listing the members of each group

`GROUP_CONCAT` joins the values of each group into one text:

```sql run
SELECT rating, GROUP_CONCAT(DISTINCT rental_rate ORDER BY rental_rate SEPARATOR ' / ') AS prices
FROM film
GROUP BY rating
ORDER BY rating;
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

Either add the column to `GROUP BY`, wrap it in an aggregate, or remove it from the `SELECT`. (MySQL enforces this by default through a setting called `ONLY_FULL_GROUP_BY`.)

### NULL is its own group

All `NULL`s in the grouped column land together in one group:

```sql run
SELECT original_language_id, COUNT(*) AS films
FROM film
GROUP BY original_language_id;
```

### WHERE cannot filter on an aggregate

You cannot write `WHERE COUNT(*) > 5`, because `WHERE` runs before grouping. That is `HAVING`'s job, on the next page.

## Interview corner

**"What does `GROUP BY` do?"**
It groups rows that share the same values in the listed columns, so aggregate functions are calculated once per group.

**"Why does `SELECT name, COUNT(*) FROM t GROUP BY id` sometimes fail?"**
Because `name` is neither grouped nor aggregated. With `ONLY_FULL_GROUP_BY` (the default), MySQL requires every selected column to be in the `GROUP BY` or inside an aggregate.

**"What is the order of `WHERE`, `GROUP BY` and `ORDER BY`?"**
`WHERE` filters rows, `GROUP BY` forms groups, then `ORDER BY` sorts the grouped result.

## Practice

### Warm-up: customers per store

Show each `store_id` and how many customers it has, as `customers`. Order by `store_id`.

```sql practice
-- hint: `GROUP BY store_id` and `COUNT(*)`.
SELECT store_id, COUNT(*) AS customers
FROM customer
GROUP BY store_id
ORDER BY store_id;
```

### Core: revenue per staff member

Show each `staff_id` with the number of payments they took (`payments`) and the total (`revenue`). Order by `staff_id`.

```sql practice
-- hint: Group `payment` by `staff_id`.
SELECT staff_id, COUNT(*) AS payments, SUM(amount) AS revenue
FROM payment
GROUP BY staff_id
ORDER BY staff_id;
```

### Stretch: busiest weekdays

Show each weekday name (`weekday`) and the number of rentals made on it (`rentals`), busiest first. (Break ties alphabetically by weekday.)

```sql practice
-- hint: Group by `DAYNAME(rental_date)`.
SELECT DAYNAME(rental_date) AS weekday, COUNT(*) AS rentals
FROM rental
GROUP BY DAYNAME(rental_date)
ORDER BY rentals DESC, weekday;
```
