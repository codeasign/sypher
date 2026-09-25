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
SELECT columns
FROM table1 AS a
WHERE EXISTS (
  SELECT 1
  FROM table2 AS b
  WHERE b.key = a.key
);
```

The subquery is normally correlated: it looks for rows in `table2` that belong to the current row of `table1`. What it selects does not matter (`SELECT 1` is the habit), only whether a row exists.

## Examples

### Customers who have done something

Customers who have made at least one payment over 11 dollars:

```sql run
SELECT c.customer_id, c.first_name, c.last_name
FROM customer AS c
WHERE EXISTS (
  SELECT 1
  FROM payment AS p
  WHERE p.customer_id = c.customer_id
    AND p.amount > 11
)
ORDER BY c.customer_id;
```

### Things that have none

`NOT EXISTS` finds rows with **no** related rows: films with no copy in any store.

```sql run
SELECT f.film_id, f.title
FROM film AS f
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory AS i
  WHERE i.film_id = f.film_id
)
ORDER BY f.film_id;
```

This is the same set of films the `LEFT JOIN ... IS NULL` version found on page 7.4.

### EXISTS and IN give the same rows

These two count the same films:

```sql run
SELECT COUNT(*) AS with_exists
FROM film AS f
WHERE EXISTS (SELECT 1 FROM inventory AS i WHERE i.film_id = f.film_id);

SELECT COUNT(*) AS with_in
FROM film
WHERE film_id IN (SELECT film_id FROM inventory);
```

## Try it yourself

Find the actors who have appeared in at least one `Horror` film, and the customers who have never made a payment.

## Watch out

### NOT EXISTS survives NULLs, NOT IN does not

Ask: "which films have an id that never appears among the `original_language_id` values?" Every film qualifies, because that column is `NULL` for all of them. Compare the two ways of asking:

```sql run
SELECT COUNT(*) AS not_in_result
FROM film
WHERE film_id NOT IN (SELECT original_language_id FROM film);

SELECT COUNT(*) AS not_exists_result
FROM film AS f
WHERE NOT EXISTS (SELECT 1 FROM film AS o WHERE o.original_language_id = f.film_id);
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
It stops looking as soon as it finds the first match.

**"How would you find customers who have never rented anything?"**
`WHERE NOT EXISTS (SELECT 1 FROM rental r WHERE r.customer_id = c.customer_id)`, or `LEFT JOIN ... WHERE r.rental_id IS NULL`.

## Practice

### Warm-up: big spenders

Show the `customer_id` of customers who have at least one payment over 10 dollars, ordered by id. Use `EXISTS`.

```sql practice rows=5
-- hint: Correlate on `customer_id` inside the subquery.
SELECT c.customer_id
FROM customer AS c
WHERE EXISTS (SELECT 1 FROM payment AS p WHERE p.customer_id = c.customer_id AND p.amount > 10)
ORDER BY c.customer_id;
```

### Core: films with no copy in store 1

Show the `title` of every film that has **no copy in store 1**. Order by title and show only the first rows.

```sql practice rows=5
-- hint: `NOT EXISTS` with `i.film_id = f.film_id AND i.store_id = 1`.
SELECT f.title
FROM film AS f
WHERE NOT EXISTS (SELECT 1 FROM inventory AS i WHERE i.film_id = f.film_id AND i.store_id = 1)
ORDER BY f.title;
```

### Stretch: actors in no Horror film

Show the `first_name` and `last_name` of actors who have **not** appeared in any `Horror` film. Order by `last_name`, `first_name`, and show the first rows only.

```sql practice rows=5
-- hint: `NOT EXISTS` over `film_actor` joined to `film_category` and `category`.
SELECT a.first_name, a.last_name
FROM actor AS a
WHERE NOT EXISTS (
  SELECT 1
  FROM film_actor AS fa
  JOIN film_category AS fc ON fc.film_id = fa.film_id
  JOIN category AS c ON c.category_id = fc.category_id
  WHERE fa.actor_id = a.actor_id AND c.name = 'Horror'
)
ORDER BY a.last_name, a.first_name;
```
