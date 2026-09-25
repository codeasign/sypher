---
title: "PRIMARY KEY, IDENTITY and Sequences"
order: 0
---

A **primary key** is the column (or columns) that identifies each row of a table, with no duplicates and never `NULL`. **Identity columns** (and their older cousin `serial`) let PostgreSQL hand out the ids for you, using a **sequence**. Together they are the backbone of almost every table.

## What you'll learn

- What makes a good primary key
- Composite (multi-column) keys
- Identity columns, `serial` and sequences, including their gaps
- Setting and resetting the counter

## Syntax

```sql show
CREATE TABLE t (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,   -- modern
  old_id serial,                                          -- older shorthand
  PRIMARY KEY (a, b)                                      -- composite key
);
```

## Examples

### A primary key that fills itself in

```sql run destructive
CREATE TABLE ticket (
  ticket_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject text NOT NULL
);

INSERT INTO ticket (subject) VALUES ('Printer is on fire'), ('Cannot log in') RETURNING ticket_id, subject;
```

### The sequence behind it

Every identity column owns a sequence. You can look at it and use it:

```sql run destructive
SELECT pg_get_serial_sequence('ticket', 'ticket_id') AS sequence_name;

SELECT nextval('ticket_ticket_id_seq') AS taken, currval('ticket_ticket_id_seq') AS just_taken;
```

Taking a number with `nextval` uses it up for good, even if you never insert a row with it.

### A composite primary key

In a link table, **the pair** identifies the row. This is how the DVD Rental data records which actor is in which film:

```sql run
SELECT a.attname AS key_column
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
WHERE i.indrelid = 'film_actor'::regclass AND i.indisprimary
ORDER BY a.attnum;
```

Both `actor_id` and `film_id` are part of the key: together they are the key, so the same actor cannot be linked to the same film twice. You would create one like this:

```sql run destructive
CREATE TABLE ticket_tag (
  ticket_id integer NOT NULL,
  tag text NOT NULL,
  PRIMARY KEY (ticket_id, tag)
);

INSERT INTO ticket_tag VALUES (1, 'urgent'), (1, 'hardware'), (2, 'urgent');

SELECT * FROM ticket_tag ORDER BY ticket_id, tag;
```

### Set the next value

```sql run destructive
CREATE TABLE room (room_id integer GENERATED ALWAYS AS IDENTITY (START WITH 500) PRIMARY KEY, label text NOT NULL);

INSERT INTO room (label) VALUES ('A1') RETURNING room_id;
```

To move an existing counter, use `ALTER TABLE room ALTER COLUMN room_id RESTART WITH 1000`, or `setval()` on the sequence.

### uuid keys

A random `uuid` key needs no sequence and can be generated anywhere:

```sql run destructive
CREATE TABLE session_log (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, note text);
INSERT INTO session_log (note) VALUES ('first');

SELECT length(id::text) AS id_length, note FROM session_log;
```

## Try it yourself

Create a table with a two-column primary key, insert a pair, and try to insert the same pair again.

## Watch out

### A primary key cannot repeat

```sql run error destructive
CREATE TABLE ticket_tag2 (ticket_id integer, tag text, PRIMARY KEY (ticket_id, tag));
INSERT INTO ticket_tag2 VALUES (1, 'urgent'), (1, 'urgent');
```

A `NULL` in either key column would be refused as well.

### Sequences leave gaps

The counter only goes up. A failed insert, or a rolled-back one, still uses up a number, so ids are unique but **not** consecutive. Here the second insert fails on the duplicate email, but it still consumed an id:

```sql run error destructive
CREATE TABLE user_account (
  user_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE
);
INSERT INTO user_account (email) VALUES ('a@x.com');
INSERT INTO user_account (email) VALUES ('a@x.com');
INSERT INTO user_account (email) VALUES ('b@x.com');

SELECT user_id, email FROM user_account ORDER BY user_id;
```

`b@x.com` got `3`, not `2`. Never count rows by looking at the highest id.

### After a bulk load, the sequence may be behind

If you insert rows with explicit ids (or load a dump), the sequence does not know. The next automatic id can collide with an existing one. Fix it with `SELECT setval('table_id_seq', (SELECT MAX(id) FROM table))`.

### Do not use a person's real data as the key

A key that comes from real life (an email, a phone number, a national id) can change, be mistyped, or turn out not to be unique. A meaningless generated id never has those problems. Keep the real value in its own `UNIQUE` column.

### Pick a type that will not run out

`integer` reaches about 2.1 billion. A table that inserts millions of rows a day may need `bigint`.

## Interview corner

**"What makes a good primary key?"**
It is unique, never `NULL`, never changes, and is short. A surrogate key (a generated integer or uuid) meets all of that. Natural keys such as emails often change.

**"What is the difference between `serial` and `GENERATED AS IDENTITY`?"**
`serial` is an older shorthand that creates a sequence and a default. Identity columns are the SQL-standard way, tie the sequence to the column more cleanly, and can refuse manual values (`ALWAYS`).

**"Will sequence ids always be consecutive?"**
No. Failed and rolled-back inserts, crashes and bulk inserts can leave gaps. Ids are for uniqueness, not for counting.

**"Surrogate key or natural key?"**
Usually a surrogate key for the primary key, plus a `UNIQUE` constraint on the natural key, so both are protected.

## Practice

### Warm-up: ids that fill themselves in

Create `room2 (room_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, label text NOT NULL)`, insert `A1`, `A2` and `A3`, and return `room_id` and `label`.

```sql practice destructive
-- hint: Insert only `label`.
CREATE TABLE room2 (room_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, label text NOT NULL);
INSERT INTO room2 (label) VALUES ('A1'), ('A2'), ('A3');

SELECT room_id, label FROM room2 ORDER BY room_id;
```

### Core: start at 500

Create the same kind of table with the counter starting at 500 (`GENERATED ALWAYS AS IDENTITY (START WITH 500)`), insert one row, and return its `room_id`.

```sql practice destructive
-- hint: `(START WITH 500)` after IDENTITY.
CREATE TABLE room3 (room_id integer GENERATED ALWAYS AS IDENTITY (START WITH 500) PRIMARY KEY, label text NOT NULL);
INSERT INTO room3 (label) VALUES ('B1');

SELECT room_id FROM room3;
```

### Stretch: a pair as a key

Create `enrolment (student_id integer NOT NULL, course_id integer NOT NULL, PRIMARY KEY (student_id, course_id))`. Insert `(1, 10)`, `(1, 20)`, `(2, 10)`. Return the number of enrolments **for course 10** as `in_course_10`.

```sql practice destructive
-- hint: Count where `course_id = 10`.
CREATE TABLE enrolment (student_id integer NOT NULL, course_id integer NOT NULL, PRIMARY KEY (student_id, course_id));
INSERT INTO enrolment VALUES (1, 10), (1, 20), (2, 10);

SELECT COUNT(*) AS in_course_10 FROM enrolment WHERE course_id = 10;
```
