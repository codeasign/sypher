---
title: "Joining Three or More Tables"
order: 0
---

Real questions usually need more than two tables. You join them one after another, each `JOIN` adding one more table to the result.

## What you'll learn

- Chaining several joins
- Joining through a link table
- Keeping many-table queries readable

## Syntax

```sql show
SELECT columns
FROM table1
JOIN table2 ON table1.key = table2.key
JOIN table3 ON table2.key = table3.key;
```

Read it as a path: start at `table1`, hop to `table2`, then hop on to `table3`.

## Examples

### Films with their category

A film is linked to a category through the link table `film_category`, so this is a three-table join:

```sql run
SELECT f.title, c.name AS category
FROM film AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id
ORDER BY f.title;
```

### Films with their actors

Same idea, through `film_actor`:

```sql run
SELECT f.title, a.first_name, a.last_name
FROM film AS f
JOIN film_actor AS fa ON fa.film_id = f.film_id
JOIN actor AS a ON a.actor_id = fa.actor_id
ORDER BY f.title, a.last_name, a.first_name;
```

A film with 10 actors appears in 10 rows, one per actor. That is normal for a join through a link table.

### Where does each customer live?

Four tables, a chain of foreign keys:

```sql run
SELECT c.first_name, c.last_name, ci.city, co.country
FROM customer AS c
JOIN address AS a ON a.address_id = c.address_id
JOIN city AS ci ON ci.city_id = a.city_id
JOIN country AS co ON co.country_id = ci.country_id
ORDER BY c.customer_id;
```

### Which customer rented which film?

Four tables again, following the chain from the last chapter:

```sql run
SELECT r.rental_id, c.first_name, c.last_name, f.title
FROM rental AS r
JOIN customer AS c ON c.customer_id = r.customer_id
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film AS f ON f.film_id = i.film_id
ORDER BY r.rental_id;
```

### Join, then summarise

Combine joins with `GROUP BY`. The number of films in each category:

```sql run
SELECT c.name AS category, COUNT(*) AS films
FROM category AS c
JOIN film_category AS fc ON fc.category_id = c.category_id
GROUP BY c.name
ORDER BY films DESC, category;
```

## Try it yourself

List each actor with the categories of the films they appear in, then find the total payments per country.

## Watch out

### Joins through a link table multiply rows

A film with 10 actors and 1 category gives 10 rows. If you then `SUM` or `COUNT` something from the film, each film is counted 10 times. Always ask yourself how many rows one film produces in your join before you aggregate.

### Keep a consistent pattern

Write each `JOIN` on its own line, use short but meaningful aliases (`c` for customer, `r` for rental), and put the `ON` right under the `JOIN`. A query with five joins is easy to read if it is laid out well and impossible if it is not.

### One wrong ON gives plausible nonsense

If you join `film` to `inventory` on the wrong columns, MySQL still returns rows. Spot-check a few rows against what you know.

## Interview corner

**"How would you get each film's category and actors in one query?"**
Join `film` to `film_category` and `category`, and to `film_actor` and `actor`. Beware the row multiplication: if you then aggregate, use `COUNT(DISTINCT ...)`.

**"In what order does MySQL join the tables?"**
You write the joins in one order, but the optimiser is free to reorder inner joins to make the query cheaper. It chooses based on table sizes and indexes; `EXPLAIN` (Module 14) shows what it chose.

## Practice

### Warm-up: film and category

Show the `title` of every film in the `Horror` category, alphabetically.

```sql practice rows=5
-- hint: Join `film`, `film_category` and `category`, and filter on the category name.
SELECT f.title
FROM film AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id
WHERE c.name = 'Horror'
ORDER BY f.title;
```

### Core: customers by country

Show each `country` with the number of customers who live there (`customers`). Only countries with 30 or more customers, most first (ties alphabetical).

```sql practice
-- hint: Chain customer → address → city → country, group by country, then HAVING.
SELECT co.country, COUNT(*) AS customers
FROM customer AS c
JOIN address AS a ON a.address_id = c.address_id
JOIN city AS ci ON ci.city_id = a.city_id
JOIN country AS co ON co.country_id = ci.country_id
GROUP BY co.country
HAVING COUNT(*) >= 30
ORDER BY customers DESC, co.country;
```

### Stretch: revenue per category

Show each category `name` and the total `amount` of payments for films in that category (`revenue`), highest first. Follow the chain payment → rental → inventory → film → film_category → category.

```sql practice
-- hint: Six tables. `payment` links to `rental` by `rental_id`.
SELECT c.name, SUM(p.amount) AS revenue
FROM payment AS p
JOIN rental AS r ON r.rental_id = p.rental_id
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film_category AS fc ON fc.film_id = i.film_id
JOIN category AS c ON c.category_id = fc.category_id
GROUP BY c.name
ORDER BY revenue DESC;
```
