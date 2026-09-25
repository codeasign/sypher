---
title: "DELETE and TRUNCATE"
order: 0
---

`DELETE` removes rows. `TRUNCATE` empties a whole table quickly. Both are permanent, so the habits from `UPDATE` apply again, even more strongly.

## What you'll learn

- Deleting selected rows with `DELETE ... WHERE`
- Emptying a table with `TRUNCATE`
- Why a delete can be refused
- `DELETE` vs `TRUNCATE` vs `DROP`

## Syntax

```sql show
DELETE FROM table_name
WHERE condition;

TRUNCATE TABLE table_name;
```

## Set up a copy

As before, we work on a copy so the real data is safe:

```sql run destructive
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

SELECT COUNT(*) AS rows_in_copy FROM film_copy;
```

## Examples

### Delete selected rows

First, look at what you would delete:

```sql run destructive
SELECT COUNT(*) AS about_to_delete
FROM film_copy
WHERE rating = 'NC-17' AND length > 170;
```

Then delete, and check:

```sql run destructive
DELETE FROM film_copy
WHERE rating = 'NC-17' AND length > 170;

SELECT COUNT(*) AS rows_left FROM film_copy;
```

### Delete a limited number of rows

`ORDER BY ... LIMIT` deletes only some of the matching rows, for example the 5 shortest films:

```sql run destructive
DELETE FROM film_copy
ORDER BY length, film_id
LIMIT 5;

SELECT COUNT(*) AS rows_left FROM film_copy;
```

### TRUNCATE: empty the table

`TRUNCATE` removes **all** rows at once, resets `AUTO_INCREMENT`, and is much faster than `DELETE` on a big table:

```sql run destructive
TRUNCATE TABLE film_copy;

SELECT COUNT(*) AS rows_after_truncate FROM film_copy;
```

## DELETE vs TRUNCATE vs DROP

| Command | Removes | Can use WHERE | Table still exists |
|---|---|---|---|
| `DELETE FROM t WHERE ...` | chosen rows | yes | yes |
| `TRUNCATE TABLE t` | every row | no | yes (empty) |
| `DROP TABLE t` | the table itself | no | no |

## Try it yourself

On the copy, delete every film whose title starts with `Z`, then delete the films that cost 4.99 and are shorter than 60 minutes.

## Watch out

### Forgetting the WHERE deletes everything

`DELETE FROM film_copy;` with no condition removes every row. Always write the `SELECT` with the same `WHERE` first.

### A delete can be refused by a foreign key

You cannot delete a parent row that other tables still point to. Customer 1 has rentals and payments, so MySQL protects them:

```sql run error destructive
DELETE FROM customer WHERE customer_id = 1;
```

The message names the foreign key that stopped the delete. You either delete the child rows first, or define the foreign key with `ON DELETE CASCADE` (Module 13).

### DELETE can be undone in a transaction, TRUNCATE cannot

`DELETE` inside a transaction can be rolled back. `TRUNCATE` is a table-level operation that commits at once (Module 12).

### Deleting does not reset AUTO_INCREMENT

After `DELETE`, the next inserted row still gets a fresh id. Only `TRUNCATE` starts the counter again.

## Interview corner

**"What is the difference between `DELETE`, `TRUNCATE` and `DROP`?"**
`DELETE` removes chosen rows, can use `WHERE`, fires triggers and can be rolled back. `TRUNCATE` removes all rows quickly and resets the auto-increment counter. `DROP` removes the table itself.

**"Which is faster for emptying a big table?"**
`TRUNCATE`, because it does not process rows one by one.

**"Why did my `DELETE` fail with a foreign key error?"**
Other tables still reference the row. Delete the children first, or use `ON DELETE CASCADE`.

## Practice

### Warm-up: delete a category

On a copy of `category`, delete the category named `Horror`, then return the number of categories left as `categories_left`.

```sql practice destructive
-- hint: `CREATE TABLE category_copy LIKE category`, fill it, `DELETE ... WHERE name = 'Horror'`, `COUNT(*)`.
DROP TABLE IF EXISTS category_copy;
CREATE TABLE category_copy LIKE category;
INSERT INTO category_copy SELECT * FROM category;

DELETE FROM category_copy WHERE name = 'Horror';

SELECT COUNT(*) AS categories_left FROM category_copy;
```

### Core: trim the films

On a copy of `film`, delete the films rated `G` that are **shorter than 60 minutes**, and return how many films are left as `films_left`.

```sql practice destructive
-- hint: `DELETE FROM film_copy WHERE rating = 'G' AND length < 60`.
DROP TABLE IF EXISTS film_copy;
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

DELETE FROM film_copy WHERE rating = 'G' AND length < 60;

SELECT COUNT(*) AS films_left FROM film_copy;
```

### Stretch: keep only the last five payments

On a copy of `payment`, delete every payment except those with the **five highest `payment_id` values**, then return how many rows are left as `rows_left`, and the smallest remaining `payment_id` as `smallest_id`.

```sql practice destructive
-- hint: `DELETE ... WHERE payment_id NOT IN (SELECT payment_id FROM (SELECT payment_id FROM payment_copy ORDER BY payment_id DESC LIMIT 5) AS keepers)`. The extra derived table works around a MySQL rule about reading and writing the same table.
DROP TABLE IF EXISTS payment_copy;
CREATE TABLE payment_copy LIKE payment;
INSERT INTO payment_copy SELECT * FROM payment;

DELETE FROM payment_copy
WHERE payment_id NOT IN (
  SELECT payment_id FROM (SELECT payment_id FROM payment_copy ORDER BY payment_id DESC LIMIT 5) AS keepers
);

SELECT COUNT(*) AS rows_left, MIN(payment_id) AS smallest_id FROM payment_copy;
```
