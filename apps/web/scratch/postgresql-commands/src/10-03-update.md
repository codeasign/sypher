---
title: "UPDATE"
order: 0
---

`UPDATE` changes values in rows that already exist. It is powerful and dangerous: without a `WHERE`, it changes **every** row.

## What you'll learn

- Changing one row, and many rows
- Calculating new values from old ones
- Updating from another table with `UPDATE ... FROM`
- `RETURNING`, and the habit that prevents disasters

## Syntax

```sql show
UPDATE table_name
SET column1 = value1, column2 = value2
WHERE condition
RETURNING column1;

UPDATE table1 t
SET column1 = s.column2
FROM table2 s
WHERE t.key = s.key;
```

## The safe habit

Before you `UPDATE` a table, write the matching `SELECT` with the **same** `WHERE`, and check you are about to change exactly the rows you mean. All the examples below work on a copy of `film`, so the real table stays untouched:

```sql run destructive
CREATE TABLE film_copy AS SELECT film_id, title, rating, length, rental_rate, replacement_cost, description FROM film;
```

## Examples

### Change one row

```sql run destructive
UPDATE film_copy
SET rental_rate = 4.99
WHERE film_id = 1
RETURNING film_id, title, rental_rate;
```

### Change several columns at once

```sql run destructive
UPDATE film_copy
SET rental_rate = 0.99, replacement_cost = 9.99
WHERE film_id = 2
RETURNING film_id, rental_rate, replacement_cost;
```

### Calculate the new value from the old one

Raise the price of every G-rated film by 10%. First check what is about to change:

```sql run destructive
SELECT COUNT(*) AS about_to_change, round(AVG(rental_rate), 3) AS average_before
FROM film_copy
WHERE rating = 'G';

UPDATE film_copy
SET rental_rate = round(rental_rate * 1.10, 2)
WHERE rating = 'G';

SELECT round(AVG(rental_rate), 3) AS average_after
FROM film_copy
WHERE rating = 'G';
```

### Use a CASE to update rows differently

```sql run destructive
UPDATE film_copy
SET rental_rate = CASE WHEN length < 60 THEN 0.99 WHEN length < 120 THEN 2.99 ELSE 4.99 END
WHERE rating = 'PG-13';

SELECT MIN(rental_rate) AS lowest, MAX(rental_rate) AS highest FROM film_copy WHERE rating = 'PG-13';
```

### UPDATE ... FROM: use another table

Set the copy's description from a query that joins another table. Here every film in the `Horror` category gets a tag on its title:

```sql run destructive
UPDATE film_copy fc
SET title = fc.title || ' (Horror)'
FROM film_category fcat
JOIN category c ON c.category_id = fcat.category_id
WHERE fcat.film_id = fc.film_id AND c.name = 'Horror';

SELECT COUNT(*) AS tagged FROM film_copy WHERE title LIKE '% (Horror)';
```

### Update and see what you changed

`RETURNING` works with `UPDATE` as well, and can show old and new values with a self-join or, from PostgreSQL 18, the `OLD` and `NEW` aliases:

```sql run destructive
UPDATE film_copy
SET length = length + 10
WHERE film_id = 3
RETURNING film_id, old.length AS old_length, new.length AS new_length;
```

## Try it yourself

On the copy, change the `description` of one film, and increase the `replacement_cost` of films longer than 150 minutes by 2 dollars.

## Watch out

### Forgetting the WHERE changes every row

```sql run destructive
UPDATE film_copy SET rental_rate = 9.99;

SELECT COUNT(*) AS costing_9_99, (SELECT COUNT(*) FROM film_copy) AS all_films FROM film_copy WHERE rental_rate = 9.99;
```

All films now cost 9.99. On a real table this is a very bad day. Guard against it by working inside a transaction (`BEGIN`, check, then `COMMIT` or `ROLLBACK`: Module 11).

### The value is checked against the column's rules

Setting a `NOT NULL` column to `NULL`, or breaking a foreign key or a `CHECK`, is refused:

```sql run error
UPDATE film SET title = NULL WHERE film_id = 1;
```

### `=` means two different things

In `SET rental_rate = 5.99` the `=` **assigns**. In `WHERE film_id = 1` it **compares**. The `SET` and `WHERE` clauses look alike but do different jobs.

### UPDATE ... FROM with several matches

If the joined table has more than one match for a row, PostgreSQL updates that row **once**, with an arbitrary matching value, and does not warn you. Make sure the join gives one match per row you update.

### Every update writes a new row version

PostgreSQL never changes a row in place: `UPDATE` writes a new version and marks the old one dead. Updating a huge table leaves dead rows behind for `VACUUM` to clean (Module 11).

## Interview corner

**"What happens if you run `UPDATE` without a `WHERE`?"**
Every row in the table is changed. Guard against it with a `SELECT` first, and a transaction you can roll back (Module 11).

**"How would you update a column based on another table?"**
`UPDATE t1 SET col = t2.col FROM t2 WHERE t1.id = t2.id` (PostgreSQL), or `UPDATE ... WHERE id IN (SELECT ...)` / a correlated subquery in `SET`, which works everywhere.

**"How do you undo an accidental update?"**
Only if you were inside a transaction (`ROLLBACK`), or from a backup (or point-in-time recovery). Otherwise there is no undo, which is why you check first.

## Practice

### Warm-up: fix one price

On a copy of `film`, set the `rental_rate` of the film with `film_id = 10` to `1.49`, then return its `film_id`, `title` and `rental_rate` with `RETURNING`.

```sql practice destructive
-- hint: Create the copy with `CREATE TABLE film_copy2 AS SELECT * FROM film`, then `UPDATE ... RETURNING`.
CREATE TABLE film_copy2 AS SELECT * FROM film;

UPDATE film_copy2 SET rental_rate = 1.49 WHERE film_id = 10 RETURNING film_id, title, rental_rate;
```

### Core: a price rise

On a copy, raise the `replacement_cost` of every film **longer than 150 minutes** by 2. Then return the highest `replacement_cost` among films longer than 150 minutes as `highest_cost`.

```sql practice destructive
-- hint: `UPDATE ... SET replacement_cost = replacement_cost + 2 WHERE length > 150`, then `MAX`.
CREATE TABLE film_copy3 AS SELECT * FROM film;

UPDATE film_copy3 SET replacement_cost = replacement_cost + 2 WHERE length > 150;

SELECT MAX(replacement_cost) AS highest_cost FROM film_copy3 WHERE length > 150;
```

### Stretch: tier the rentals

On a copy, set `rental_rate` to `0.99` for films shorter than 90 minutes, `2.99` for films from 90 to 130 minutes inclusive, and `4.99` for longer films, using one `UPDATE` with `CASE`. Then return each distinct `rental_rate` with its number of films (`films`), ordered by rate.

```sql practice destructive
-- hint: One `UPDATE` with `CASE`, then GROUP BY rental_rate.
CREATE TABLE film_copy4 AS SELECT * FROM film;

UPDATE film_copy4
SET rental_rate = CASE WHEN length < 90 THEN 0.99 WHEN length <= 130 THEN 2.99 ELSE 4.99 END;

SELECT rental_rate, COUNT(*) AS films FROM film_copy4 GROUP BY rental_rate ORDER BY rental_rate;
```
