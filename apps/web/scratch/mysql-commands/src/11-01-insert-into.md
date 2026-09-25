---
title: "INSERT INTO"
order: 0
---

`INSERT INTO` adds new rows to a table. This is the first page that **changes** data. Everything you insert here is undone when the lab is reset (see *Set Up Your Lab*), so experiment freely.

## What you'll learn

- Inserting a row, with a column list
- Inserting several rows at once
- Getting the id MySQL generated
- The errors you will meet, and what they mean

## Syntax

```sql show
INSERT INTO table_name (column1, column2)
VALUES (value1, value2);

INSERT INTO table_name (column1, column2)
VALUES (value1, value2), (value3, value4);
```

Always list the columns. Then the statement keeps working when someone adds a column to the table later.

## Examples

### Insert one row

The `category` table has a `name`, plus an `AUTO_INCREMENT` id and a `last_update` column that MySQL fills in for you (with the current time, which is why we do not print it here). So you only supply the name:

```sql run destructive
INSERT INTO category (name) VALUES ('Anime');

SELECT category_id, name
FROM category
WHERE name = 'Anime';
```

### The generated id

`LAST_INSERT_ID()` returns the id created by your most recent insert in this connection:

```sql run destructive
INSERT INTO category (name) VALUES ('Documentary Shorts');

SELECT LAST_INSERT_ID() AS new_category_id;
```

### Insert several rows at once

One statement with several value lists is much faster than several statements:

```sql run destructive
INSERT INTO category (name)
VALUES ('Musical'), ('Noir'), ('Silent');

SELECT COUNT(*) AS categories_now FROM category;

SELECT name FROM category WHERE category_id > 16 ORDER BY category_id;
```

### Inserting into a table with more columns

An actor needs a first and last name. The `actor_id` and `last_update` are automatic:

```sql run destructive
INSERT INTO actor (first_name, last_name) VALUES ('JORDAN', 'SYPHER');

SELECT actor_id, first_name, last_name FROM actor WHERE last_name = 'SYPHER';
```

## Try it yourself

Insert two languages into `language`, and one more actor. Then look at the ids MySQL assigned.

## Watch out

### A required column with no value

`last_name` is `NOT NULL` and has no default, so leaving it out is an error:

```sql run error destructive
INSERT INTO actor (first_name) VALUES ('CHER');
```

### Columns and values must match

Two columns need two values. Without a column list, you must give a value for **every** column in table order, which is why the list is worth writing:

```sql run error destructive
INSERT INTO category (name, last_update) VALUES ('Anime');
```

### A foreign key must point at a real row

A rental for a customer that does not exist is rejected (see *Why Tables Are Split*). Insert the parent row first, and then the children.

### AUTO_INCREMENT leaves gaps

If an insert fails or a row is later deleted, the used id is not handed out again. Ids are unique, not gap-free. Never rely on them being consecutive.

## Interview corner

**"How do you insert multiple rows in one statement?"**
List several value groups: `INSERT INTO t (a, b) VALUES (1, 2), (3, 4), (5, 6);`.

**"How do you get the id of the row you just inserted?"**
`LAST_INSERT_ID()`, which is per connection, so it is safe even when other sessions insert at the same time.

**"Why list the column names in an `INSERT`?"**
So the statement does not break, or silently put values in the wrong columns, when the table's columns change.

## Practice

### Warm-up: a new category

Insert a category called `Western`, then return its `name` (only that one row).

```sql practice destructive
-- hint: `INSERT INTO category (name) VALUES ('Western');` then a `SELECT ... WHERE name = 'Western'`.
INSERT INTO category (name) VALUES ('Western');

SELECT name FROM category WHERE name = 'Western';
```

### Core: two actors

Insert two actors, `ALEX` `NORTH` and `SAM` `SOUTH`, in one statement. Then show those two actors (`first_name`, `last_name`), in id order.

```sql practice destructive
-- hint: One INSERT with two value groups. Find them again by last name.
INSERT INTO actor (first_name, last_name)
VALUES ('ALEX', 'NORTH'), ('SAM', 'SOUTH');

SELECT first_name, last_name
FROM actor
WHERE last_name IN ('NORTH', 'SOUTH')
ORDER BY actor_id;
```

### Stretch: count and confirm

Insert the languages `Hindi` and `Spanish` in one statement, then return the total number of languages as `languages_now`.

```sql practice destructive
-- hint: `INSERT INTO language (name) VALUES (...), (...)`, then `SELECT COUNT(*) AS languages_now FROM language`.
INSERT INTO language (name) VALUES ('Hindi'), ('Spanish');

SELECT COUNT(*) AS languages_now FROM language;
```
