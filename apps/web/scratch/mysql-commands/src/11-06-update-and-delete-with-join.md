---
title: "UPDATE and DELETE with JOIN"
order: 0
---

Sometimes the rows you want to change are decided by **another table**: "raise the price of every Horror film", "delete films that have no copies". MySQL lets you `JOIN` right inside `UPDATE` and `DELETE`.

## What you'll learn

- `UPDATE ... JOIN ... SET`
- `DELETE ... JOIN` (with a `LEFT JOIN` to find what is missing)
- The subquery alternative

## Syntax

```sql show
UPDATE table1
JOIN table2 ON table1.key = table2.key
SET table1.column = value
WHERE condition;

DELETE table1
FROM table1
JOIN table2 ON table1.key = table2.key
WHERE condition;
```

`DELETE table1 FROM ...` names **which** table the rows are deleted from, because there is more than one in the statement.

## Set up a copy

```sql run destructive
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

SELECT COUNT(*) AS rows_in_copy FROM film_copy;
```

## Examples

### UPDATE with a JOIN

Raise the rental price of every Horror film by 1 dollar. The category name lives in another table, so join to reach it. First, the average price before and after:

```sql run destructive
SELECT ROUND(AVG(f.rental_rate), 3) AS horror_avg_before
FROM film_copy AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id
WHERE c.name = 'Horror';

UPDATE film_copy AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id
SET f.rental_rate = f.rental_rate + 1
WHERE c.name = 'Horror';

SELECT ROUND(AVG(f.rental_rate), 3) AS horror_avg_after
FROM film_copy AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id
WHERE c.name = 'Horror';
```

### DELETE with a JOIN

Delete the films that have **no copy in any store**. A `LEFT JOIN ... IS NULL` finds them, exactly like the anti-join of Module 7:

```sql run destructive
DELETE f
FROM film_copy AS f
LEFT JOIN inventory AS i ON i.film_id = f.film_id
WHERE i.inventory_id IS NULL;

SELECT COUNT(*) AS films_left FROM film_copy;
```

### The subquery alternative

The same kind of update can use `IN` or `EXISTS`, and it works in every database:

```sql run destructive
UPDATE film_copy
SET rental_rate = rental_rate + 1
WHERE film_id IN (
  SELECT fc.film_id
  FROM film_category AS fc
  JOIN category AS c ON c.category_id = fc.category_id
  WHERE c.name = 'Comedy'
);

SELECT COUNT(*) AS films_now_above_five FROM film_copy WHERE rental_rate > 5;
```

## Try it yourself

On a copy, set the `rental_duration` of all films in the `Sports` category to 3, and delete the films that were never rented.

## Watch out

### Preview with a SELECT

Turn the `UPDATE ... JOIN` into a `SELECT` with the same joins and `WHERE` first, and check that it returns the rows you expect. A wrong join changes the wrong rows.

### A join that multiplies rows can update a row more than once

If a film has several matching rows in the joined table, the update still applies to the film row, but the `SET` may use only one of the matching values. Make sure your join gives one match per row you update.

### You cannot read and write the same table in a subquery

MySQL refuses `DELETE FROM t WHERE id IN (SELECT id FROM t ...)` with an error about updating a table that is used in a subquery. Wrap the inner query in a derived table, or use a `JOIN`.

### The syntax is MySQL-specific

`UPDATE ... JOIN` and `DELETE ... JOIN` are MySQL extensions. Other databases use `UPDATE ... FROM` or subqueries.

## Interview corner

**"How do you update rows in one table based on a condition in another?"**
`UPDATE t1 JOIN t2 ON ... SET t1.col = ... WHERE t2.col = ...`, or an `IN`/`EXISTS` subquery.

**"How do you delete rows that have no match in another table?"**
`DELETE t1 FROM t1 LEFT JOIN t2 ON ... WHERE t2.key IS NULL`, or `DELETE FROM t1 WHERE NOT EXISTS (...)`.

**"Why can't I select from the table I'm deleting from in a subquery?"**
MySQL does not allow reading and modifying the same table in one statement that way. Use a derived table or a join.

## Practice

### Warm-up: a discount for one category

On a copy of `film`, set `rental_rate` to `0.99` for every film in the `Children` category. Return how many films in that category now cost `0.99`, as `now_cheap`.

```sql practice destructive
-- hint: `UPDATE film_copy f JOIN film_category fc ... JOIN category c ... SET f.rental_rate = 0.99 WHERE c.name = 'Children'`.
DROP TABLE IF EXISTS film_copy;
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

UPDATE film_copy AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id
SET f.rental_rate = 0.99
WHERE c.name = 'Children';

SELECT COUNT(*) AS now_cheap
FROM film_copy AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id
WHERE c.name = 'Children' AND f.rental_rate = 0.99;
```

### Core: remove films never rented

On a copy of `film`, delete the films that have **never been rented** (no rental on any copy of them), and return how many films are left as `films_left`. (A film with no inventory counts as never rented.)

```sql practice destructive
-- hint: A film has many copies, so a plain join would match it several times. Use `NOT EXISTS` with a subquery that joins `inventory` and `rental`.
DROP TABLE IF EXISTS film_copy;
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

DELETE FROM film_copy
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory AS i
  JOIN rental AS r ON r.inventory_id = i.inventory_id
  WHERE i.film_id = film_copy.film_id
);

SELECT COUNT(*) AS films_left FROM film_copy;
```

### Stretch: rate by demand

On a copy of `film`, set the `rental_rate` to `4.99` for the films that were rented **more than 30 times** (across all their copies), using an `UPDATE` with a derived-table `JOIN`. Return how many films now cost `4.99` because of it: count films with `rental_rate = 4.99` as `now_premium`.

```sql practice destructive
-- hint: Join `film_copy` to a derived table that counts rentals per film, and set the rate where the count is above 30. Note some films were already 4.99 before.
DROP TABLE IF EXISTS film_copy;
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

UPDATE film_copy AS f
JOIN (
  SELECT i.film_id, COUNT(*) AS rentals
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  GROUP BY i.film_id
) AS demand ON demand.film_id = f.film_id
SET f.rental_rate = 4.99
WHERE demand.rentals > 30;

SELECT COUNT(*) AS now_premium FROM film_copy WHERE rental_rate = 4.99;
```
