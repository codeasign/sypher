---
title: "ON DUPLICATE KEY UPDATE, REPLACE and INSERT IGNORE"
order: 0
---

What should happen when you insert a row whose key **already exists**? By default MySQL refuses. Three tools let you choose: update the existing row (an *upsert*), replace it, or quietly skip it.

## What you'll learn

- `INSERT ... ON DUPLICATE KEY UPDATE` (the upsert)
- `REPLACE INTO`
- `INSERT IGNORE`
- Which one to use when

## Syntax

```sql show
INSERT INTO table_name (key_column, other_column)
VALUES (1, 5) AS new
ON DUPLICATE KEY UPDATE other_column = table_name.other_column + new.other_column;

REPLACE INTO table_name (key_column, other_column) VALUES (1, 5);

INSERT IGNORE INTO table_name (key_column, other_column) VALUES (1, 5);
```

All three depend on a **primary key or unique key** to decide what "already exists" means.

## Set up a small table

A stock table with one row per film, holding the number of copies:

```sql run destructive
CREATE TABLE stock (
  film_id SMALLINT UNSIGNED PRIMARY KEY,
  copies INT NOT NULL,
  note VARCHAR(20) NOT NULL DEFAULT 'new'
);

INSERT INTO stock (film_id, copies) VALUES (1, 5), (2, 4);

SELECT film_id, copies, note FROM stock ORDER BY film_id;
```

## Examples

### The plain insert refuses a duplicate

```sql run error destructive
INSERT INTO stock (film_id, copies) VALUES (1, 3);
```

The primary key `film_id` already has a row for film 1, so MySQL refuses (error 1062, duplicate entry) and stores nothing. The next sections show three ways to handle a clash instead of failing.

### ON DUPLICATE KEY UPDATE: insert or update

If the key is new, the row is inserted. If it exists, the `UPDATE` part runs instead. Film 1 exists and film 3 is new:

```sql run destructive
INSERT INTO stock (film_id, copies) VALUES (1, 3), (3, 6) AS new
ON DUPLICATE KEY UPDATE copies = stock.copies + new.copies;

SELECT film_id, copies, note FROM stock ORDER BY film_id;
```

Film 1 went from 5 to 8 (the existing 5 plus the new 3). Film 3 was inserted with 6. `new` is an alias for the row you tried to insert.

### REPLACE INTO: delete, then insert

`REPLACE` removes the old row completely and inserts the new one. Columns you do not mention go back to their defaults:

```sql run destructive
UPDATE stock SET note = 'checked' WHERE film_id = 2;

REPLACE INTO stock (film_id, copies) VALUES (2, 100);

SELECT film_id, copies, note FROM stock ORDER BY film_id;
```

The `note` for film 2 was `checked`, but after `REPLACE` it is back to the default `new`, because the whole row was deleted and re-created.

### INSERT IGNORE: skip the duplicates

Rows that would clash are skipped, the others are inserted, and no error is raised:

```sql run destructive
INSERT IGNORE INTO stock (film_id, copies) VALUES (1, 999), (4, 7);

SELECT film_id, copies, note FROM stock ORDER BY film_id;
```

Film 1 kept its old count, and film 4 was added.

## Which one?

| You want to | Use |
|---|---|
| Insert, or update the existing row | `ON DUPLICATE KEY UPDATE` |
| Overwrite the whole row | `REPLACE INTO` |
| Insert only what is new, ignore the rest | `INSERT IGNORE` |

## Try it yourself

Use an upsert to add stock for films 5 and 6, and then run the same statement again to see the counts add up.

## Watch out

### REPLACE deletes first

Because it deletes and re-inserts, `REPLACE` fires delete triggers, resets columns you did not list, and can fail or cascade if other tables have foreign keys pointing at the row. For "update if it exists", `ON DUPLICATE KEY UPDATE` is the safer choice.

### INSERT IGNORE hides other problems too

It also turns other errors (such as data that is too long for a column) into warnings and truncates the data silently. Use it carefully.

### It needs a key

Without a primary or unique key on the columns, there is no "duplicate" to detect, and the row is simply inserted again.

### The VALUES() function is deprecated

Older code writes `copies = copies + VALUES(copies)`. Modern MySQL prefers the row alias (`AS new`) shown above.

## Interview corner

**"How do you insert a row, or update it if it already exists?"**
`INSERT ... ON DUPLICATE KEY UPDATE`, which relies on a primary or unique key.

**"What is the difference between `REPLACE` and `INSERT ... ON DUPLICATE KEY UPDATE`?"**
`REPLACE` deletes the old row and inserts a new one (resetting unspecified columns, firing delete triggers). `ON DUPLICATE KEY UPDATE` modifies the existing row in place.

**"What does `INSERT IGNORE` do?"**
It skips rows that would violate a unique key, with no error, and inserts the rest.

## Practice

### Warm-up: add stock with an upsert

Create the `stock` table as on this page, insert films 1 and 2 with 5 copies each, then upsert film 1 with 10 more copies and film 9 with 2. Return `film_id` and `copies` ordered by film.

```sql practice destructive
-- hint: `INSERT ... VALUES (1, 10), (9, 2) AS new ON DUPLICATE KEY UPDATE copies = stock.copies + new.copies`.
DROP TABLE IF EXISTS stock;
CREATE TABLE stock (
  film_id SMALLINT UNSIGNED PRIMARY KEY,
  copies INT NOT NULL
);

INSERT INTO stock (film_id, copies) VALUES (1, 5), (2, 5);

INSERT INTO stock (film_id, copies) VALUES (1, 10), (9, 2) AS new
ON DUPLICATE KEY UPDATE copies = stock.copies + new.copies;

SELECT film_id, copies FROM stock ORDER BY film_id;
```

### Core: ignore the duplicates

On a new table `tag (name VARCHAR(20) PRIMARY KEY)`, insert the names `action`, `comedy`, `drama`, then insert `comedy`, `horror`, `drama` with `INSERT IGNORE`. Return the number of tags as `tags`.

```sql practice destructive
-- hint: The second insert would clash on `comedy` and `drama`; IGNORE skips them and adds `horror`.
DROP TABLE IF EXISTS tag;
CREATE TABLE tag (name VARCHAR(20) PRIMARY KEY);

INSERT INTO tag (name) VALUES ('action'), ('comedy'), ('drama');

INSERT IGNORE INTO tag (name) VALUES ('comedy'), ('horror'), ('drama');

SELECT COUNT(*) AS tags FROM tag;
```

### Stretch: replace resets a column

Create `stock2 (film_id PRIMARY KEY, copies INT NOT NULL, note VARCHAR(20) NOT NULL DEFAULT 'new')`, insert film 1 with 5 copies, set its note to `audited`, then `REPLACE` it with 7 copies. Return `copies` and `note` for film 1.

```sql practice destructive
-- hint: After REPLACE the note is back to its default, `new`.
DROP TABLE IF EXISTS stock2;
CREATE TABLE stock2 (
  film_id SMALLINT UNSIGNED PRIMARY KEY,
  copies INT NOT NULL,
  note VARCHAR(20) NOT NULL DEFAULT 'new'
);

INSERT INTO stock2 (film_id, copies) VALUES (1, 5);
UPDATE stock2 SET note = 'audited' WHERE film_id = 1;

REPLACE INTO stock2 (film_id, copies) VALUES (1, 7);

SELECT copies, note FROM stock2 WHERE film_id = 1;
```
