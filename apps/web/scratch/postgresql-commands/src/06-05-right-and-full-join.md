---
title: "RIGHT JOIN and FULL JOIN"
order: 0
---

`RIGHT JOIN` is the mirror image of `LEFT JOIN`. `FULL JOIN` keeps the unmatched rows of **both** sides, and, unlike MySQL, PostgreSQL supports it directly.

## What you'll learn

- What `RIGHT JOIN` returns, and why most people use `LEFT JOIN` instead
- What `FULL JOIN` returns
- Finding rows that are missing from either side

## Syntax

```sql show
SELECT ...
FROM table1
RIGHT JOIN table2 ON table2.key = table1.key;

SELECT ...
FROM table1
FULL JOIN table2 ON table2.key = table1.key;
```

## Examples

### RIGHT JOIN: keep every right row

This keeps every row of `film`, because `film` is on the right:

```sql run
SELECT f.film_id, i.inventory_id
FROM inventory i
RIGHT JOIN film f ON f.film_id = i.film_id
WHERE f.film_id IN (14, 15)
ORDER BY f.film_id, i.inventory_id;
```

Film 14 (which has no copies) appears with an empty `inventory_id`, the same result as the `LEFT JOIN` on the last page.

### It is the same as a swapped LEFT JOIN

`a RIGHT JOIN b` gives the same rows as `b LEFT JOIN a`. Both of these count the same thing:

```sql run
SELECT
  (SELECT COUNT(*) FROM inventory i RIGHT JOIN film f ON f.film_id = i.film_id) AS with_right,
  (SELECT COUNT(*) FROM film f LEFT JOIN inventory i ON f.film_id = i.film_id) AS with_left;
```

### FULL JOIN: keep both sides

Every language and every film, matched where possible. Languages with no film and films with no language would both appear:

```sql run
SELECT trim(l.name) AS language, COUNT(f.film_id) AS films
FROM language l
FULL JOIN film f ON f.language_id = l.language_id
GROUP BY l.name
ORDER BY films DESC, language;
```

Five of the six languages have no films at all. A `FULL JOIN` shows them (with `0`), where an `INNER JOIN` would hide them.

### Finding the mismatches

A `FULL JOIN` with a `WHERE` on both keys shows what is missing from either side:

```sql run
SELECT COUNT(*) FILTER (WHERE f.film_id IS NULL) AS in_inventory_only,
       COUNT(*) FILTER (WHERE i.inventory_id IS NULL) AS in_film_only
FROM inventory i
FULL JOIN film f ON f.film_id = i.film_id;
```

## Try it yourself

Rewrite the `RIGHT JOIN` query above as a `LEFT JOIN` by swapping the two tables.

## Watch out

### Most teams avoid RIGHT JOIN

Reading a query is easier when the "main" table comes first and everything else hangs off it with `LEFT JOIN`s. Mixing `LEFT` and `RIGHT` in one query makes people stop and think. You rarely need `RIGHT JOIN`: swap the table order and use `LEFT`.

### The same WHERE trap applies

A filter in `WHERE` on the **left** table's columns turns a `RIGHT JOIN` into an inner join, exactly like the mirror case for `LEFT JOIN`. The same is true for both sides of a `FULL JOIN`.

### FULL JOIN needs merge or hash join conditions

PostgreSQL can only run a `FULL JOIN` when the `ON` condition is an equality (or can be turned into one). An `ON` with `<` or `OR` gives the error "FULL JOIN is only supported with merge-joinable or hash-joinable join conditions".

## Interview corner

**"What is the difference between `LEFT JOIN` and `RIGHT JOIN`?"**
Which side is kept in full. `LEFT` keeps every row from the table written first, `RIGHT` keeps every row from the table written second.

**"Is `RIGHT JOIN` ever necessary?"**
No. Any `RIGHT JOIN` can be rewritten as a `LEFT JOIN` by swapping the tables, and most style guides prefer that.

**"Does PostgreSQL support `FULL OUTER JOIN`?"**
Yes (`FULL JOIN` is short for `FULL OUTER JOIN`). MySQL does not, and has to combine a `LEFT` and a `RIGHT` join with `UNION`.

## Practice

### Warm-up: rewrite it

Rewrite this as a `LEFT JOIN` that gives the same rows: `FROM inventory i RIGHT JOIN film f ON f.film_id = i.film_id`. Then return only the rows for films 14 and 15, showing `film_id` and `inventory_id`, ordered by `film_id` and `inventory_id`. Show the first rows.

```sql practice
-- hint: Put `film` first: `FROM film f LEFT JOIN inventory i ON ...`.
SELECT f.film_id, i.inventory_id
FROM film f
LEFT JOIN inventory i ON i.film_id = f.film_id
WHERE f.film_id IN (14, 15)
ORDER BY f.film_id, i.inventory_id;
```

### Core: languages with no films

Use a `RIGHT JOIN` from `film` to `language` to list the languages that have **no film** in them (`name`, trimmed), alphabetically.

```sql practice
-- hint: `film f RIGHT JOIN language l ON ...`, then keep rows where `f.film_id IS NULL`.
SELECT trim(l.name) AS name
FROM film f
RIGHT JOIN language l ON l.language_id = f.language_id
WHERE f.film_id IS NULL
ORDER BY name;
```

### Stretch: both sides

Using a `FULL JOIN` between `language` and `film`, return how many languages have no film (`empty_languages`) and how many films have no language (`orphan_films`).

```sql practice
-- hint: Count with FILTER on `f.film_id IS NULL` and `l.language_id IS NULL`, counting distinct languages.
SELECT COUNT(DISTINCT l.language_id) FILTER (WHERE f.film_id IS NULL) AS empty_languages,
       COUNT(*) FILTER (WHERE l.language_id IS NULL) AS orphan_films
FROM language l
FULL JOIN film f ON f.language_id = l.language_id;
```
