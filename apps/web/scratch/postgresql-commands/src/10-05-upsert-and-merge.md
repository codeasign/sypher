---
title: "Upsert: ON CONFLICT and MERGE"
order: 0
---

What should happen when you insert a row whose key **already exists**? By default PostgreSQL refuses. `ON CONFLICT` lets you choose: skip the row, or update the existing one (an *upsert*). `MERGE` is the standard-SQL way to do inserts, updates and deletes from one source in a single statement.

## What you'll learn

- `INSERT ... ON CONFLICT DO NOTHING`
- `INSERT ... ON CONFLICT DO UPDATE` (the upsert) and `EXCLUDED`
- `MERGE` and its `WHEN MATCHED` / `WHEN NOT MATCHED` branches
- Which one to use when

## Syntax

```sql show
INSERT INTO table_name (key_col, value_col)
VALUES (1, 'x')
ON CONFLICT (key_col) DO NOTHING;

INSERT INTO table_name (key_col, value_col)
VALUES (1, 'x')
ON CONFLICT (key_col) DO UPDATE SET value_col = EXCLUDED.value_col;

MERGE INTO target t
USING source s ON t.key = s.key
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT (...) VALUES (...);
```

Both `ON CONFLICT` and `MERGE` depend on a **primary key or unique key** to decide what "already exists" means (for `MERGE`, whatever you write in the `ON`).

## Set up a small table

A stock table with one row per film, holding the number of copies:

```sql run destructive
CREATE TABLE stock (
  film_id int PRIMARY KEY,
  copies int NOT NULL,
  note text NOT NULL DEFAULT 'new'
);

INSERT INTO stock (film_id, copies, note) VALUES (1, 5, 'checked'), (2, 5, 'checked');

SELECT * FROM stock ORDER BY film_id;
```

## Examples

### The plain insert refuses a duplicate

```sql run error destructive
INSERT INTO stock (film_id, copies) VALUES (1, 3);
```

The primary key `film_id` already has a row for film 1, so PostgreSQL refuses (error `23505`, unique violation) and stores nothing.

### ON CONFLICT DO NOTHING: skip the duplicates

Rows that would clash are skipped, the others are inserted, and no error is raised:

```sql run destructive
INSERT INTO stock (film_id, copies) VALUES (1, 99), (4, 2)
ON CONFLICT (film_id) DO NOTHING
RETURNING film_id;

SELECT * FROM stock ORDER BY film_id;
```

`RETURNING` lists only the row that was really inserted (film 4). Film 1 kept its old count.

### ON CONFLICT DO UPDATE: insert or update

If the key is new, the row is inserted. If it exists, the `UPDATE` part runs instead. `EXCLUDED` is the row you tried to insert:

```sql run destructive
INSERT INTO stock (film_id, copies) VALUES (1, 3), (3, 6)
ON CONFLICT (film_id) DO UPDATE SET copies = stock.copies + EXCLUDED.copies
RETURNING film_id, copies, (xmax = 0) AS was_inserted;
```

Film 1 went from 5 to 8 (the existing 5 plus the new 3). Film 3 was inserted with 6. (`xmax = 0` is a well-known trick to tell an inserted row from an updated one.)

### MERGE: one statement, several actions

`MERGE` compares a source of rows with the target and can update, insert and delete in one go. Here the source is a small list of shipments:

```sql run destructive
MERGE INTO stock t
USING (VALUES (1, 10), (2, 0), (7, 4)) AS s(film_id, delta)
ON t.film_id = s.film_id
WHEN MATCHED AND s.delta = 0 THEN DELETE
WHEN MATCHED THEN UPDATE SET copies = t.copies + s.delta
WHEN NOT MATCHED THEN INSERT (film_id, copies) VALUES (s.film_id, s.delta);

SELECT * FROM stock ORDER BY film_id;
```

Film 1 got 10 more copies, film 2 (delta 0) was deleted, and film 7 was inserted.

## Try it yourself

Use an upsert to add stock for films 5 and 6, and then run the same statement again to see the counts add up.

## Watch out

### ON CONFLICT needs a matching unique index

`ON CONFLICT (film_id)` must name columns that have a unique constraint or unique index. Otherwise PostgreSQL says there is "no unique or exclusion constraint matching the ON CONFLICT specification".

### A row cannot be updated twice in one statement

If two of the rows you insert clash with the *same* existing row, `DO UPDATE` refuses ("cannot affect row a second time"). Remove duplicates from the input first.

### DO UPDATE without a WHERE always writes

Even if nothing changes, `DO UPDATE` writes a new row version. Add `WHERE stock.copies IS DISTINCT FROM EXCLUDED.copies` to skip no-op updates.

### ON CONFLICT is not fully concurrency-proof for MERGE

`INSERT ... ON CONFLICT` is designed to be atomic under concurrency. `MERGE` can still raise a unique violation if another session inserts the same key at the same moment, so keep a retry ready.

## Interview corner

**"How do you insert a row, or update it if it already exists?"**
`INSERT ... ON CONFLICT (key) DO UPDATE SET ...`, which relies on a primary or unique key. (MySQL has `ON DUPLICATE KEY UPDATE`.)

**"What is `EXCLUDED`?"**
The row that was proposed for insertion, available inside `DO UPDATE` so you can copy or combine its values.

**"When would you use `MERGE` instead?"**
When the source is a table or query and you need different actions for matching and non-matching rows, or `DELETE` as well. It is standard SQL (PostgreSQL 15 and later).

## Practice

### Warm-up: add stock with an upsert

Create the `stock` table (as above, without the `note` column: `film_id int PRIMARY KEY, copies int NOT NULL`), insert films 1 and 2 with 5 copies each, then upsert film 1 with 10 more copies and film 9 with 2. Return `film_id` and `copies` ordered by film.

```sql practice destructive
-- hint: `ON CONFLICT (film_id) DO UPDATE SET copies = stock2.copies + EXCLUDED.copies`.
CREATE TABLE stock2 (film_id int PRIMARY KEY, copies int NOT NULL);
INSERT INTO stock2 VALUES (1, 5), (2, 5);

INSERT INTO stock2 VALUES (1, 10), (9, 2)
ON CONFLICT (film_id) DO UPDATE SET copies = stock2.copies + EXCLUDED.copies;

SELECT film_id, copies FROM stock2 ORDER BY film_id;
```

### Core: ignore the duplicates

On a new table `tag (name text PRIMARY KEY)`, insert the names `action`, `comedy`, `drama`, then insert `comedy`, `horror`, `drama` with `ON CONFLICT DO NOTHING`. Return the number of tags as `tags`.

```sql practice destructive
-- hint: `ON CONFLICT DO NOTHING` needs no column list when there is one unique key.
CREATE TABLE tag (name text PRIMARY KEY);
INSERT INTO tag VALUES ('action'), ('comedy'), ('drama');
INSERT INTO tag VALUES ('comedy'), ('horror'), ('drama') ON CONFLICT DO NOTHING;

SELECT COUNT(*) AS tags FROM tag;
```

### Stretch: MERGE

Create `stock3 (film_id int PRIMARY KEY, copies int NOT NULL)` with films 1 and 2 (5 copies each). `MERGE` in the rows `(1, 5)` and `(3, 7)` so that existing films **add** the copies and new films are inserted. Return `film_id` and `copies`, ordered by film.

```sql practice destructive
-- hint: `MERGE INTO stock3 t USING (VALUES (1, 5), (3, 7)) AS s(film_id, copies) ON ... WHEN MATCHED ... WHEN NOT MATCHED ...`.
CREATE TABLE stock3 (film_id int PRIMARY KEY, copies int NOT NULL);
INSERT INTO stock3 VALUES (1, 5), (2, 5);

MERGE INTO stock3 t
USING (VALUES (1, 5), (3, 7)) AS s(film_id, copies)
ON t.film_id = s.film_id
WHEN MATCHED THEN UPDATE SET copies = t.copies + s.copies
WHEN NOT MATCHED THEN INSERT (film_id, copies) VALUES (s.film_id, s.copies);

SELECT film_id, copies FROM stock3 ORDER BY film_id;
```
