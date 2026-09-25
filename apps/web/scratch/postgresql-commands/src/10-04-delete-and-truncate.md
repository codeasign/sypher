---
title: "DELETE and TRUNCATE"
order: 0
---

`DELETE` removes rows. `TRUNCATE` empties a whole table quickly. Both are permanent unless you are inside a transaction, so the habits from `UPDATE` apply again, even more strongly.

## What you'll learn

- Deleting selected rows with `DELETE ... WHERE`
- `DELETE ... USING` (delete based on another table) and `RETURNING`
- Emptying a table with `TRUNCATE`, and `RESTART IDENTITY`
- Why a delete can be refused

## Syntax

```sql show
DELETE FROM table_name
WHERE condition
RETURNING column1;

DELETE FROM table1 t
USING table2 s
WHERE t.key = s.key;

TRUNCATE TABLE table_name [RESTART IDENTITY] [CASCADE];
```

## Set up a copy

As before, we work on a copy so the real data is safe:

```sql run destructive
CREATE TABLE film_copy AS SELECT film_id, title, rating, length FROM film;
```

## Examples

### Delete selected rows

First, look at what you would delete:

```sql run destructive
SELECT film_id, title FROM film_copy WHERE title LIKE 'Z%' ORDER BY film_id;
```

Then delete, and see what went, with `RETURNING`:

```sql run destructive
DELETE FROM film_copy
WHERE title LIKE 'Z%'
RETURNING film_id, title;
```

### Delete a limited number of rows

`DELETE` has no `LIMIT`. To delete only some of the matching rows, pick them in a subquery:

```sql run destructive
DELETE FROM film_copy
WHERE film_id IN (SELECT film_id FROM film_copy ORDER BY length, film_id LIMIT 5)
RETURNING film_id, length;
```

### DELETE ... USING

Delete the copies of films that have **no** inventory, by joining to a list of films that do have copies:

```sql run destructive
DELETE FROM film_copy fc
USING (
  SELECT f.film_id FROM film f
  WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.film_id = f.film_id)
) missing
WHERE fc.film_id = missing.film_id;

SELECT COUNT(*) AS films_left FROM film_copy;
```

### TRUNCATE: empty the table

`TRUNCATE` removes **all** rows at once, can reset the sequences, and is much faster than `DELETE` on a big table:

```sql run destructive
CREATE TABLE ticket (id serial PRIMARY KEY, subject text);
INSERT INTO ticket (subject) VALUES ('a'), ('b'), ('c');

TRUNCATE TABLE ticket RESTART IDENTITY;

INSERT INTO ticket (subject) VALUES ('after truncate') RETURNING id;
```

`RESTART IDENTITY` starts the numbering again from 1. Without it the next id would continue where the counter left off.

## DELETE vs TRUNCATE vs DROP

| Command | Removes | Can use WHERE | Rollback in a transaction | Speed on a big table |
|---|---|---|---|---|
| `DELETE` | Chosen rows | Yes | Yes | Slow (row by row) |
| `TRUNCATE` | All rows | No | Yes (unlike MySQL) | Very fast |
| `DROP TABLE` | The table itself | No | Yes | Fast |

## Try it yourself

On the copy, delete every film whose title starts with `Z`, then delete the films that cost 4.99 and are shorter than 60 minutes.

## Watch out

### Forgetting the WHERE deletes everything

`DELETE FROM film_copy;` with no condition removes every row. Always write the `SELECT` with the same `WHERE` first.

### A delete can be refused by a foreign key

You cannot delete a parent row that other tables still point to. Customer 1 has rentals and payments, so PostgreSQL protects them:

```sql run error destructive
DELETE FROM customer WHERE customer_id = 1;
```

The message names the foreign key that stopped the delete. You either delete the child rows first, or define the foreign key with `ON DELETE CASCADE` (Module 12).

### TRUNCATE and foreign keys

`TRUNCATE` refuses to empty a table that other tables reference, unless you add `CASCADE`, which also empties those tables. Be very careful with it:

```sql run error destructive
TRUNCATE TABLE customer;
```

### Deleting does not reset the sequence

After `DELETE`, the next inserted row still gets a fresh id. Only `TRUNCATE ... RESTART IDENTITY` (or resetting the sequence by hand) starts the counter again.

### Deleted rows are not gone yet

PostgreSQL only marks them dead. The space is reused after `VACUUM` (Module 11), and the table file does not shrink by itself.

## Interview corner

**"What is the difference between `DELETE`, `TRUNCATE` and `DROP`?"**
`DELETE` removes chosen rows, can use `WHERE`, fires row triggers and can be rolled back. `TRUNCATE` removes all rows quickly and can restart the sequences; in PostgreSQL it is transactional too. `DROP` removes the table itself.

**"Which is faster for emptying a big table?"**
`TRUNCATE`, because it does not process rows one by one; it just throws the table's files away.

**"Why did my `DELETE` fail with a foreign key error?"**
Other tables still reference the row. Delete the children first, or use `ON DELETE CASCADE`.

## Practice

### Warm-up: delete a category

On a copy of `category`, delete the category named `Horror`, then return the number of categories left as `categories_left`.

```sql practice destructive
-- hint: `CREATE TABLE category_copy AS SELECT * FROM category`, then `DELETE ... WHERE name = 'Horror'`.
CREATE TABLE category_copy AS SELECT * FROM category;
DELETE FROM category_copy WHERE name = 'Horror';

SELECT COUNT(*) AS categories_left FROM category_copy;
```

### Core: trim the films

On a copy of `film` (columns `film_id`, `rating`, `length`), delete the films rated `G` that are **shorter than 60 minutes**, and return how many films are left as `films_left`.

```sql practice destructive
-- hint: `DELETE ... WHERE rating = 'G' AND length < 60`.
CREATE TABLE film_trim AS SELECT film_id, rating, length FROM film;
DELETE FROM film_trim WHERE rating = 'G' AND length < 60;

SELECT COUNT(*) AS films_left FROM film_trim;
```

### Stretch: keep only the last five payments

On a copy of `payment`, delete every payment except those with the **five highest `payment_id` values**, then return how many rows are left as `rows_left`, and the smallest remaining `payment_id` as `smallest_id`.

```sql practice destructive
-- hint: `DELETE ... WHERE payment_id NOT IN (SELECT payment_id ... ORDER BY payment_id DESC LIMIT 5)`.
CREATE TABLE payment_trim AS SELECT * FROM payment;
DELETE FROM payment_trim
WHERE payment_id NOT IN (SELECT payment_id FROM payment_trim ORDER BY payment_id DESC LIMIT 5);

SELECT COUNT(*) AS rows_left, MIN(payment_id) AS smallest_id FROM payment_trim;
```
