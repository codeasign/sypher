---
title: "UPDATE"
order: 0
---

`UPDATE` changes values in rows that already exist. It is powerful and dangerous: without a `WHERE`, it changes **every** row.

## What you'll learn

- Changing one row, and many rows
- Calculating new values from old ones
- The habit that prevents disasters

## Syntax

```sql show
UPDATE table_name
SET column1 = value1, column2 = value2
WHERE condition;
```

## The safe habit

Before you `UPDATE` a table, write the matching `SELECT` with the **same** `WHERE`, and check you are about to change exactly the rows you mean. All the examples below work on a copy of `film`, so the real table stays untouched:

```sql run destructive
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

SELECT COUNT(*) AS rows_in_copy FROM film_copy;
```

## Examples

### Change one row

```sql run destructive
UPDATE film_copy
SET rental_rate = 5.99
WHERE film_id = 1;

SELECT film_id, title, rental_rate
FROM film_copy
WHERE film_id = 1;
```

### Change several columns at once

```sql run destructive
UPDATE film_copy
SET rental_rate = 0.99, rental_duration = 3
WHERE film_id = 2;

SELECT film_id, title, rental_rate, rental_duration
FROM film_copy
WHERE film_id = 2;
```

### Calculate the new value from the old one

Raise the price of every G-rated film by 10%. First check what is about to change:

```sql run destructive
SELECT COUNT(*) AS films_to_change, MIN(rental_rate) AS lowest, MAX(rental_rate) AS highest
FROM film_copy
WHERE rating = 'G';

UPDATE film_copy
SET rental_rate = ROUND(rental_rate * 1.10, 2)
WHERE rating = 'G';

SELECT MIN(rental_rate) AS lowest, MAX(rental_rate) AS highest
FROM film_copy
WHERE rating = 'G';
```

### Use a CASE to update rows differently

```sql run destructive
UPDATE film_copy
SET rental_duration = CASE
  WHEN length < 60 THEN 3
  WHEN length < 120 THEN 5
  ELSE 7
END;

SELECT rental_duration, COUNT(*) AS films
FROM film_copy
GROUP BY rental_duration
ORDER BY rental_duration;
```

### Limit the change

`ORDER BY ... LIMIT` restricts an update to a number of rows. Here, the three shortest films:

```sql run destructive
UPDATE film_copy
SET title = CONCAT('[SHORT] ', title)
ORDER BY length, film_id
LIMIT 3;

SELECT film_id, title, length
FROM film_copy
WHERE title LIKE '[SHORT]%'
ORDER BY length, film_id;
```

## Try it yourself

On the copy, change the `description` of one film, and increase the `replacement_cost` of films longer than 150 minutes by 2 dollars.

## Watch out

### Forgetting the WHERE changes every row

```sql run destructive
UPDATE film_copy SET rental_rate = 9.99;

SELECT DISTINCT rental_rate FROM film_copy;
```

All {{= SELECT COUNT(*) FROM film }} films now cost 9.99. On a real table this is a very bad day. (In the MySQL command line you can start with `--safe-updates`, which refuses an `UPDATE` or `DELETE` without a `WHERE` on a key.)

### The value is checked against the column's rules

Setting a `NOT NULL` column to `NULL`, or breaking a foreign key or a `CHECK`, is refused:

```sql run error destructive
UPDATE film_copy SET title = NULL WHERE film_id = 1;
```

### `=` means two different things

In `SET rental_rate = 5.99` the `=` **assigns**. In `WHERE film_id = 1` it **compares**. The `SET` and `WHERE` clauses look alike but do different jobs.

### Updating a column you also use in the WHERE

`UPDATE t SET a = a + 1 WHERE a > 5` is fine and each row is evaluated once. But be careful with unique columns: shifting `id = id + 1` can collide with a row that has not moved yet.

## Interview corner

**"What happens if you run `UPDATE` without a `WHERE`?"**
Every row in the table is changed. Guard against it with a `SELECT` first, a transaction you can roll back (Module 12), and `--safe-updates`.

**"How would you update a column based on another table?"**
`UPDATE ... JOIN` (page 11.6), or `UPDATE ... WHERE id IN (SELECT ...)`.

**"How do you undo an accidental update?"**
Only if you were inside a transaction (`ROLLBACK`), or from a backup. Otherwise there is no undo, which is why you check first.

## Practice

### Warm-up: fix one price

On a copy of `film`, set the `rental_rate` of the film with `film_id = 10` to `1.49`, then return its `film_id`, `title` and `rental_rate`.

```sql practice destructive
-- hint: Make the copy (CREATE TABLE ... LIKE, INSERT ... SELECT), `UPDATE ... WHERE film_id = 10`, then SELECT it.
DROP TABLE IF EXISTS film_copy;
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

UPDATE film_copy SET rental_rate = 1.49 WHERE film_id = 10;

SELECT film_id, title, rental_rate FROM film_copy WHERE film_id = 10;
```

### Core: a price rise

On a copy, raise the `replacement_cost` of every film **longer than 150 minutes** by 2. Then return the highest `replacement_cost` among films longer than 150 minutes as `highest_cost`.

```sql practice destructive
-- hint: `SET replacement_cost = replacement_cost + 2 WHERE length > 150`.
DROP TABLE IF EXISTS film_copy;
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

UPDATE film_copy SET replacement_cost = replacement_cost + 2 WHERE length > 150;

SELECT MAX(replacement_cost) AS highest_cost FROM film_copy WHERE length > 150;
```

### Stretch: tier the rentals

On a copy, set `rental_rate` to `0.99` for films shorter than 90 minutes, `2.99` for films from 90 to 130 minutes inclusive, and `4.99` for longer films, using one `UPDATE` with `CASE`. Then return each distinct `rental_rate` with its number of films (`films`), ordered by rate.

```sql practice destructive
-- hint: `SET rental_rate = CASE WHEN length < 90 THEN 0.99 WHEN length <= 130 THEN 2.99 ELSE 4.99 END`.
DROP TABLE IF EXISTS film_copy;
CREATE TABLE film_copy LIKE film;
INSERT INTO film_copy SELECT * FROM film;

UPDATE film_copy
SET rental_rate = CASE
  WHEN length < 90 THEN 0.99
  WHEN length <= 130 THEN 2.99
  ELSE 4.99
END;

SELECT rental_rate, COUNT(*) AS films
FROM film_copy
GROUP BY rental_rate
ORDER BY rental_rate;
```
