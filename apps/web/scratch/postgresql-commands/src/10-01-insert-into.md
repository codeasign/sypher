---
title: "INSERT INTO"
order: 0
---

`INSERT INTO` adds new rows to a table. This is the first page that **changes** data. Everything you insert here is undone when the lab is reset (see *Set Up Your Lab*), so experiment freely.

## What you'll learn

- Inserting a row, with a column list
- Inserting several rows at once
- Getting the generated id back with `RETURNING`
- The errors you will meet, and what they mean

## Syntax

```sql show
INSERT INTO table_name (column1, column2)
VALUES (value1, value2);

INSERT INTO table_name (column1, column2)
VALUES (value1, value2), (value3, value4)
RETURNING column1;
```

Always list the columns. Then the statement keeps working when someone adds a column to the table later.

## Examples

### Insert one row

The `category` table has a `name`, plus an id that PostgreSQL fills in from a sequence and a `last_update` column that a default fills in. So you only supply the name. `RETURNING` shows the row that was created, including the values you did not supply:

```sql run destructive
INSERT INTO category (name)
VALUES ('Western')
RETURNING category_id, name;
```

### Insert several rows at once

One statement with several value lists is much faster than several statements:

```sql run destructive
INSERT INTO category (name)
VALUES ('Anime'), ('Noir'), ('Silent')
RETURNING category_id, name;
```

### Inserting into a table with more columns

An actor needs a first and last name. The `actor_id` and `last_update` are automatic:

```sql run destructive
INSERT INTO actor (first_name, last_name)
VALUES ('ALEX', 'NORTH')
RETURNING actor_id, first_name, last_name;
```

### The current value of a sequence

Every auto-numbered column is fed by a **sequence**. `currval` and `lastval` give the number your session just received:

```sql run destructive
INSERT INTO language (name) VALUES ('Hindi');

SELECT lastval() AS last_id_given_to_me, currval('language_language_id_seq') AS language_id;
```

### DEFAULT VALUES and DEFAULT

Ask for a column's default explicitly with the keyword `DEFAULT`:

```sql run destructive
INSERT INTO category (category_id, name, last_update)
VALUES (DEFAULT, 'Musical', DEFAULT)
RETURNING category_id, name;
```

## Try it yourself

Insert two languages into `language`, and one more actor. Then look at the ids PostgreSQL assigned.

## Watch out

### A required column with no value

`last_name` is `NOT NULL` and has no default, so leaving it out is an error:

```sql run error
INSERT INTO actor (first_name) VALUES ('MADONNA');
```

### Columns and values must match

Two columns need two values:

```sql run error
INSERT INTO actor (first_name, last_name) VALUES ('ONLYONE');
```

Without a column list, you must give a value for **every** column in table order, which is why the list is worth writing.

### A foreign key must point at a real row

A rental for a customer that does not exist is rejected (see *Why Tables Are Split*). Insert the parent row first, and then the children.

### The sequence leaves gaps

If an insert fails or a row is later deleted, the used number is not handed out again. Ids are unique, not gap-free. Never rely on them being consecutive:

```sql run error destructive
INSERT INTO actor (first_name, last_name) VALUES ('GAP', NULL);
```

The insert failed, but the sequence still moved on, so the next actor will skip a number.

### Text is quoted with single quotes

`'O''Brien'` (two single quotes) is how to write an apostrophe inside text. Or use dollar quoting: `$$O'Brien$$`.

## Interview corner

**"How do you insert multiple rows in one statement?"**
List several value groups: `INSERT INTO t (a, b) VALUES (1, 2), (3, 4), (5, 6);`.

**"How do you get the id of the row you just inserted?"**
Add `RETURNING id` to the `INSERT`. It works for many rows at once, and is safe when other sessions insert at the same time. (`lastval()` is per session, too, but `RETURNING` is clearer.)

**"Why list the column names in an `INSERT`?"**
So the statement does not break, or silently put values in the wrong columns, when the table's columns change.

## Practice

### Warm-up: a new category

Insert a category called `Western`, and return its `name` with the `RETURNING` clause (only that one row).

```sql practice destructive
-- hint: `INSERT INTO category (name) VALUES ('Western') RETURNING name`.
INSERT INTO category (name) VALUES ('Western') RETURNING name;
```

### Core: two actors

Insert two actors, `ALEX` `NORTH` and `SAM` `SOUTH`, in one statement, and return their `first_name` and `last_name` with `RETURNING`.

```sql practice destructive
-- hint: Two value groups, then `RETURNING first_name, last_name`.
INSERT INTO actor (first_name, last_name)
VALUES ('ALEX', 'NORTH'), ('SAM', 'SOUTH')
RETURNING first_name, last_name;
```

### Stretch: count and confirm

Insert the languages `Hindi` and `Spanish` in one statement, then return the total number of languages as `languages_now`.

```sql practice destructive
-- hint: Insert first, then `SELECT COUNT(*) AS languages_now FROM language`.
INSERT INTO language (name) VALUES ('Hindi'), ('Spanish');

SELECT COUNT(*) AS languages_now FROM language;
```
