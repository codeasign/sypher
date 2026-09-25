---
title: "EXISTS and NOT EXISTS"
order: 0
---

`EXISTS` asks a yes/no question: "does the subquery return at least one row?" It is the safest way to say "has some" or "has none".

## What you'll learn

- Testing for the presence of related rows with `EXISTS`
- Testing for absence with `NOT EXISTS`
- Why `NOT EXISTS` is safer than `NOT IN`

## Syntax

```sql show
SELECT column1
FROM table1 t1
WHERE EXISTS (SELECT 1 FROM table2 t2 WHERE t2.key = t1.key);
```

The subquery is normally correlated: it looks for rows in `table2` that belong to the current row of `table1`. What it selects does not matter (`SELECT 1` is the habit), only whether a row exists.

## Examples

### Customers who have done something

Customers who have made at least one payment over 11 dollars:

```sql run
SELECT c.customer_id, c.first_name, c.last_name
FROM customer c
WHERE EXISTS (
  SELECT 1 FROM payment p WHERE p.customer_id = c.customer_id AND p.amount > 11
)
ORDER BY c.customer_id;
```

### Things that have none

`NOT EXISTS` finds rows with **no** related rows: films with no copy in any store.

```sql run
SELECT f.film_id, f.title
FROM film f
WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.film_id = f.film_id)
ORDER BY f.film_id
LIMIT 5;
```

This is the same set of films the `LEFT JOIN ... IS NULL` version found on page 6.4.

### EXISTS and IN give the same rows

These two count the same films:

```sql run
SELECT
  (SELECT COUNT(*) FROM film f WHERE EXISTS (SELECT 1 FROM inventory i WHERE i.film_id = f.film_id)) AS with_exists,
  (SELECT COUNT(*) FROM film f WHERE f.film_id IN (SELECT film_id FROM inventory)) AS with_in;
```

## Try it yourself

Find the actors who have appeared in at least one `Horror` film, and the customers who have never made a payment.

## Watch out

### NOT EXISTS survives NULLs, NOT IN does not

Ask: "which films have a language that never appears among the `original_language_id` values?" Every film qualifies, because that column is `NULL` for all of them. Compare the two ways of asking:

```sql run
SELECT
  (SELECT COUNT(*) FROM film f WHERE f.language_id NOT IN (SELECT original_language_id FROM film)) AS not_in,
  (SELECT COUNT(*) FROM film f WHERE NOT EXISTS (SELECT 1 FROM film o WHERE o.original_language_id = f.language_id)) AS not_exists;
```

`NOT IN` returns 0 because the list contains `NULL`. `NOT EXISTS` returns the expected answer, every film, since none of them matches.

### It must be correlated to be useful

`EXISTS (SELECT 1 FROM inventory)` with no link to the outer row is simply "is the table non-empty?", which is true for every outer row.

### What you SELECT inside is irrelevant

`SELECT 1`, `SELECT *` and `SELECT i.film_id` all behave the same inside `EXISTS`.

## Interview corner

**"What is the difference between `EXISTS` and `IN`?"**
`IN` compares a value against a list the subquery produces. `EXISTS` checks whether the correlated subquery returns any row. For "positive" tests they usually perform alike. For negations, `NOT EXISTS` is the safe one because `NOT IN` breaks when the list contains `NULL`.

**"Why does `EXISTS` often perform well?"**
It stops looking as soon as it finds the first match. PostgreSQL also turns it into a "semi join" that can use an index or a hash.

**"How would you find customers who have never rented anything?"**
`WHERE NOT EXISTS (SELECT 1 FROM rental r WHERE r.customer_id = c.customer_id)`, or `LEFT JOIN ... WHERE r.rental_id IS NULL`.

## Practice

### Warm-up: big spenders

Show the `customer_id` of customers who have at least one payment over 10 dollars, ordered by id. Use `EXISTS`. Show the first rows.

```sql practice
-- hint: Correlate on `p.customer_id = c.customer_id` and add `p.amount > 10`.
SELECT c.customer_id
FROM customer c
WHERE EXISTS (SELECT 1 FROM payment p WHERE p.customer_id = c.customer_id AND p.amount > 10)
ORDER BY c.customer_id;
```

### Core: films with no copy in store 1

Show the `title` of every film that has **no copy in store 1**. Order by title and show the first rows.

```sql practice
-- hint: `NOT EXISTS (SELECT 1 FROM inventory i WHERE i.film_id = f.film_id AND i.store_id = 1)`.
SELECT f.title
FROM film f
WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.film_id = f.film_id AND i.store_id = 1)
ORDER BY f.title;
```

### Stretch: actors in no Horror film

Show the `first_name` and `last_name` of actors who have **not** appeared in any `Horror` film. Order by `last_name`, `first_name`, and show the first rows.

```sql practice
-- hint: NOT EXISTS over film_actor -> film_category -> category.
SELECT a.first_name, a.last_name
FROM actor a
WHERE NOT EXISTS (
  SELECT 1
  FROM film_actor fa
  JOIN film_category fc ON fc.film_id = fa.film_id
  JOIN category c ON c.category_id = fc.category_id
  WHERE fa.actor_id = a.actor_id AND c.name = 'Horror'
)
ORDER BY a.last_name, a.first_name;
```
