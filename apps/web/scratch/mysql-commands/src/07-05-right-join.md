---
title: "RIGHT JOIN"
order: 0
---

`RIGHT JOIN` is the mirror image of `LEFT JOIN`: it keeps **every row of the right table**, and fills `NULL` on the left where there is no match.

## What you'll learn

- What `RIGHT JOIN` returns
- Why most people use `LEFT JOIN` instead

## Syntax

```sql show
SELECT columns
FROM left_table
RIGHT JOIN right_table
  ON left_table.column = right_table.column;
```

## Examples

### Keep every film again

This keeps every row of `film`, because `film` is on the right:

```sql run
SELECT i.inventory_id, f.film_id, f.title
FROM inventory AS i
RIGHT JOIN film AS f ON f.film_id = i.film_id
WHERE f.film_id IN (14, 15)
ORDER BY f.film_id, i.inventory_id;
```

Film 14 (which has no copies) appears with an empty `inventory_id`, the same result as the `LEFT JOIN` on the last page.

### It is the same as a swapped LEFT JOIN

`a RIGHT JOIN b` gives the same rows as `b LEFT JOIN a`. Both of these count the same thing:

```sql run
SELECT COUNT(*) AS with_right_join
FROM inventory AS i
RIGHT JOIN film AS f ON f.film_id = i.film_id;

SELECT COUNT(*) AS with_left_join
FROM film AS f
LEFT JOIN inventory AS i ON i.film_id = f.film_id;
```

## Try it yourself

Rewrite the `RIGHT JOIN` query above as a `LEFT JOIN` by swapping the two tables.

## Watch out

### Most teams avoid RIGHT JOIN

Reading a query is easier when the "main" table comes first and everything else hangs off it with `LEFT JOIN`s. Mixing `LEFT` and `RIGHT` in one query makes people stop and think. You rarely need `RIGHT JOIN`: swap the table order and use `LEFT`.

### The same WHERE trap applies

A filter in `WHERE` on the **left** table's columns turns a `RIGHT JOIN` into an inner join, exactly like the mirror case for `LEFT JOIN`.

## Interview corner

**"What is the difference between `LEFT JOIN` and `RIGHT JOIN`?"**
Which side is kept in full. `LEFT` keeps every row from the table written first, `RIGHT` keeps every row from the table written second.

**"Is `RIGHT JOIN` ever necessary?"**
No. Any `RIGHT JOIN` can be rewritten as a `LEFT JOIN` by swapping the tables, and most style guides prefer that.

**"Does MySQL support `FULL OUTER JOIN`?"**
No. You emulate it with a `LEFT JOIN` and a `RIGHT JOIN` combined with `UNION` (next module).

## Practice

### Warm-up: rewrite it

Rewrite this as a `LEFT JOIN` that gives the same rows: `FROM inventory i RIGHT JOIN film f ON f.film_id = i.film_id`. Then return only the rows for films 14 and 15, showing `film_id` and `inventory_id`, ordered by `film_id`.

```sql practice
-- hint: Put `film` first, then `LEFT JOIN inventory`.
SELECT f.film_id, i.inventory_id
FROM film AS f
LEFT JOIN inventory AS i ON i.film_id = f.film_id
WHERE f.film_id IN (14, 15)
ORDER BY f.film_id;
```

### Core: languages with no films

Use a `RIGHT JOIN` from `film` to `language` to list the languages that have **no film** in them (`name`), alphabetically.

```sql practice
-- hint: Keep all rows of `language` (the right table) and look for films that are NULL.
SELECT l.name
FROM film AS f
RIGHT JOIN language AS l ON l.language_id = f.language_id
WHERE f.film_id IS NULL
ORDER BY l.name;
```
