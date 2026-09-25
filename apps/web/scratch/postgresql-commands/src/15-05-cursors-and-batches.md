---
title: "Cursors and Working in Batches"
order: 0
---

A **cursor** lets you read a big result a few rows at a time, instead of loading all of it at once. It is how a program walks through millions of rows without running out of memory, and it works inside `psql` too. This page also shows the batch patterns that go with it.

## What you'll learn

- `DECLARE`, `FETCH` and `CLOSE`
- Scrollable cursors, and why cursors live inside a transaction
- Looping over a cursor in PL/pgSQL
- Batching updates and deletes with `LIMIT`

## Syntax

```sql show
BEGIN;
DECLARE name CURSOR FOR SELECT ...;
FETCH 10 FROM name;
FETCH NEXT FROM name;
CLOSE name;
COMMIT;
```

## Examples

### Fetch a few rows at a time

A cursor needs a transaction (unless declared `WITH HOLD`). Fetch three films, then the next two:

```sql run
BEGIN;
DECLARE film_cur CURSOR FOR SELECT film_id, title FROM film ORDER BY film_id;
FETCH 3 FROM film_cur;
FETCH 2 FROM film_cur;
CLOSE film_cur;
COMMIT;
```

The second `FETCH` continues where the first stopped.

### Scrolling back and forward

A `SCROLL` cursor can also move backwards:

```sql run
BEGIN;
DECLARE scroll_cur SCROLL CURSOR FOR SELECT film_id FROM film ORDER BY film_id;
FETCH 3 FROM scroll_cur;
FETCH PRIOR FROM scroll_cur;
FETCH ABSOLUTE 10 FROM scroll_cur;
CLOSE scroll_cur;
COMMIT;
```

### Looping over a cursor in PL/pgSQL

Inside a function or `DO` block, `FOR ... IN query LOOP` uses a cursor for you, so the whole result never sits in memory at once:

```sql run notices
DO $$
DECLARE
  r record;
  total numeric := 0;
BEGIN
  FOR r IN SELECT amount FROM payment WHERE customer_id = 1 LOOP
    total := total + r.amount;
  END LOOP;
  RAISE NOTICE 'customer 1 paid % in total', total;
END;
$$;
```

### Batching a big update

Changing millions of rows in one statement holds locks and makes one huge transaction. Do it in slices, each in its own transaction (from a script or a procedure):

```sql run destructive
CREATE TABLE job (id int PRIMARY KEY, done boolean NOT NULL DEFAULT false);
INSERT INTO job SELECT g FROM generate_series(1, 1000) g;

UPDATE job SET done = true WHERE id IN (SELECT id FROM job WHERE NOT done ORDER BY id LIMIT 300);
UPDATE job SET done = true WHERE id IN (SELECT id FROM job WHERE NOT done ORDER BY id LIMIT 300);

SELECT COUNT(*) FILTER (WHERE done) AS done_so_far, COUNT(*) AS total FROM job;
```

Repeat until the `UPDATE` reports 0 rows. `FOR UPDATE SKIP LOCKED` in the inner query lets several workers share the queue (page 11.4).

### Streaming the result to the client

`psql` can fetch in chunks by itself with `\set FETCH_COUNT 1000`, and drivers offer "server-side cursors" for the same reason.

## Try it yourself

Declare a cursor over the customers, fetch 5, then 5 more, and close it. Then declare it `SCROLL` and fetch the last row with `FETCH LAST`.

## Watch out

### A cursor lives inside a transaction

When the transaction ends, a normal cursor disappears. `WITH HOLD` keeps it after the commit, but it then stores its whole result, so use it sparingly.

### An open cursor holds a snapshot

A long-running transaction with an open cursor keeps old row versions alive and can bloat tables (page 11.5). Close cursors promptly.

### OFFSET paging is not a cursor

`LIMIT n OFFSET m` re-runs the query for every page and gets slower. A cursor keeps its position; keyset pagination avoids `OFFSET` without holding a transaction open.

### Cursors and ORDER BY

Without an `ORDER BY`, the order of a cursor is not defined. Add a unique column so the walk is repeatable.

## Interview corner

**"What is a cursor, and when do you use one?"**
A pointer into a query result that lets you fetch rows in chunks. Use one when the result is too big to load at once, or when a procedure has to process rows one by one.

**"What is the difference between a cursor and keyset pagination?"**
A cursor keeps a transaction and position open on the server. Keyset pagination is stateless: each request asks for `WHERE id > last_id ORDER BY id LIMIT n`.

**"How do you update a huge table without one giant transaction?"**
In batches: update a slice with `WHERE ... LIMIT`, commit, repeat, so locks are short and vacuum can keep up.

## Practice

### Warm-up: the first five

Write the cursor commands (in one block) to fetch the first 5 `category` rows ordered by `category_id`, and show them.

```sql practice
-- hint: BEGIN, DECLARE, FETCH 5, CLOSE, COMMIT: the last result set is the fetch.
BEGIN;
DECLARE cat_cur CURSOR FOR SELECT category_id, name FROM category ORDER BY category_id;
FETCH 5 FROM cat_cur;
CLOSE cat_cur;
COMMIT;
```

### Core: back and forth

Declare a `SCROLL` cursor over `film_id` ordered ascending, fetch 3, then `FETCH PRIOR`, and show that last fetch (the second film).

```sql practice
-- hint: The last result set is the result of `FETCH PRIOR`.
BEGIN;
DECLARE back_cur SCROLL CURSOR FOR SELECT film_id FROM film ORDER BY film_id;
FETCH 3 FROM back_cur;
FETCH PRIOR FROM back_cur;
CLOSE back_cur;
COMMIT;
```

### Stretch: two batches

Create `task (id int PRIMARY KEY, done boolean NOT NULL DEFAULT false)` with 500 rows. Process 200 rows, then another 200 (each as a separate `UPDATE ... WHERE id IN (SELECT ... LIMIT 200)`), and return how many are done as `done_count`.

```sql practice destructive
-- hint: Two UPDATE statements, then COUNT(*) FILTER (WHERE done).
CREATE TABLE task (id int PRIMARY KEY, done boolean NOT NULL DEFAULT false);
INSERT INTO task SELECT g FROM generate_series(1, 500) g;
UPDATE task SET done = true WHERE id IN (SELECT id FROM task WHERE NOT done ORDER BY id LIMIT 200);
UPDATE task SET done = true WHERE id IN (SELECT id FROM task WHERE NOT done ORDER BY id LIMIT 200);

SELECT COUNT(*) FILTER (WHERE done) AS done_count FROM task;
```
