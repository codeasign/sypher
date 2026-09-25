---
title: "Joining Three or More Tables"
order: 0
---

Real questions usually need more than two tables. You join them one after another, each `JOIN` adding one more table to the result.

## What you'll learn

- Chaining several joins
- Joining through a link table
- Keeping many-table queries readable
- How row counts multiply

## Syntax

```sql show
SELECT ...
FROM table1
JOIN table2 ON table2.key = table1.key
JOIN table3 ON table3.key = table2.key;
```

Read it as a path: start at `table1`, hop to `table2`, then hop on to `table3`.

## Examples

### Films with their category

A film is linked to a category through the link table `film_category`, so this is a three-table join:

```sql run
SELECT f.title, c.name AS category
FROM film f
JOIN film_category fc ON fc.film_id = f.film_id
JOIN category c ON c.category_id = fc.category_id
ORDER BY f.film_id
LIMIT 5;
```

### Films with their actors

Same idea, through `film_actor`:

```sql run
SELECT f.title, a.first_name, a.last_name
FROM film f
JOIN film_actor fa ON fa.film_id = f.film_id
JOIN actor a ON a.actor_id = fa.actor_id
WHERE f.film_id = 1
ORDER BY a.last_name, a.first_name;
```

A film with 10 actors appears in 10 rows, one per actor. That is normal for a join through a link table.

### Where does each customer live?

Four tables, a chain of foreign keys:

```sql run
SELECT c.first_name, c.last_name, ci.city, co.country
FROM customer c
JOIN address a ON a.address_id = c.address_id
JOIN city ci ON ci.city_id = a.city_id
JOIN country co ON co.country_id = ci.country_id
ORDER BY c.customer_id
LIMIT 5;
```

### Which customer rented which film?

Four tables again, following the chain from the first page of this module:

```sql run
SELECT c.last_name, f.title
FROM rental r
JOIN customer c ON c.customer_id = r.customer_id
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film f ON f.film_id = i.film_id
WHERE r.rental_id <= 3
ORDER BY r.rental_id;
```

### Join, then summarise

Combine joins with `GROUP BY`. The number of films in each category:

```sql run
SELECT c.name AS category, COUNT(*) AS films
FROM category c
JOIN film_category fc ON fc.category_id = c.category_id
GROUP BY c.name
ORDER BY films DESC, c.name;
```

## Try it yourself

List each actor with the categories of the films they appear in, then find the total payments per country.

## Watch out

### Joins through a link table multiply rows

A film with 10 actors and 1 category gives 10 rows. If you then `SUM` or `COUNT` something from the film, each film is counted 10 times. Always ask yourself how many rows one film produces in your join before you aggregate.

```sql run
SELECT COUNT(*) AS rows_in_join, COUNT(DISTINCT f.film_id) AS distinct_films
FROM film f
JOIN film_actor fa ON fa.film_id = f.film_id;
```

### Keep a consistent pattern

Write each `JOIN` on its own line, use short but meaningful aliases (`c` for customer, `r` for rental), and put the `ON` right under the `JOIN`. A query with five joins is easy to read if it is laid out well and impossible if it is not.

### One wrong ON gives plausible nonsense

If you join `film` to `inventory` on the wrong columns, PostgreSQL still returns rows if the types match. Spot-check a few rows against what you know.

## Interview corner

**"How would you get each film's category and actors in one query?"**
Join `film` to `film_category` and `category`, and to `film_actor` and `actor`. Beware the row multiplication: if you then aggregate, use `COUNT(DISTINCT ...)`.

**"In what order does PostgreSQL join the tables?"**
You write the joins in one order, but the planner is free to reorder inner joins to make the query cheaper. It chooses based on table statistics and indexes; `EXPLAIN` (Module 14) shows what it chose.

## Practice

### Warm-up: film and category

Show the `title` of every film in the `Horror` category, alphabetically. Show the first rows.

```sql practice
-- hint: Join `film`, `film_category` and `category`; filter `c.name = 'Horror'`.
SELECT f.title
FROM film f
JOIN film_category fc ON fc.film_id = f.film_id
JOIN category c ON c.category_id = fc.category_id
WHERE c.name = 'Horror'
ORDER BY f.title;
```

### Core: customers by country

Show each `country` with the number of customers who live there (`customers`). Only countries with 30 or more customers, most first (ties alphabetical).

```sql practice
-- hint: customer -> address -> city -> country, then GROUP BY and HAVING.
SELECT co.country, COUNT(*) AS customers
FROM customer c
JOIN address a ON a.address_id = c.address_id
JOIN city ci ON ci.city_id = a.city_id
JOIN country co ON co.country_id = ci.country_id
GROUP BY co.country
HAVING COUNT(*) >= 30
ORDER BY customers DESC, co.country;
```

### Stretch: revenue per category

Show each category `name` and the total `amount` of payments for films in that category (`revenue`), highest first. Follow the chain payment → rental → inventory → film → film_category → category. Show the first rows.

```sql practice
-- hint: Six tables, one chain: payment.rental_id = rental.rental_id, and so on.
SELECT c.name, SUM(p.amount) AS revenue
FROM payment p
JOIN rental r ON r.rental_id = p.rental_id
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film_category fc ON fc.film_id = i.film_id
JOIN category c ON c.category_id = fc.category_id
GROUP BY c.name
ORDER BY revenue DESC, c.name;
```
