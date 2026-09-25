---
title: "PRIMARY KEY and AUTO_INCREMENT"
order: 0
---

A **primary key** is the column (or columns) that identifies each row of a table, with no duplicates and never `NULL`. `AUTO_INCREMENT` lets MySQL hand out the ids for you. Together they are the backbone of almost every table.

## What you'll learn

- What makes a good primary key
- Composite (multi-column) keys
- How `AUTO_INCREMENT` behaves, including its gaps
- Setting and resetting the counter

## Syntax

```sql show
CREATE TABLE table_name (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  other_column datatype
);

CREATE TABLE link_table (
  a_id INT NOT NULL,
  b_id INT NOT NULL,
  PRIMARY KEY (a_id, b_id)
);
```

## Examples

### A primary key that fills itself in

```sql run destructive
CREATE TABLE ticket (
  ticket_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(60) NOT NULL
);

INSERT INTO ticket (subject) VALUES ('Printer jammed'), ('Password reset'), ('New laptop');

SELECT ticket_id, subject FROM ticket ORDER BY ticket_id;
```

### Finding the id you just got

```sql run destructive
INSERT INTO ticket (subject) VALUES ('Broken monitor');

SELECT LAST_INSERT_ID() AS id_of_the_new_ticket;
```

### A composite primary key

In a link table, **the pair** identifies the row. This is how the DVD Rental data records which actor is in which film:

```sql run
DESCRIBE film_actor;
```

Both `actor_id` and `film_id` are marked `PRI`: together they are the key, so the same actor cannot be linked to the same film twice. You would create one like this:

```sql run destructive
CREATE TABLE ticket_tag (
  ticket_id INT UNSIGNED NOT NULL,
  tag VARCHAR(20) NOT NULL,
  PRIMARY KEY (ticket_id, tag)
);

INSERT INTO ticket_tag VALUES (1, 'hardware'), (1, 'urgent'), (2, 'account');

SELECT ticket_id, tag FROM ticket_tag ORDER BY ticket_id, tag;
```

### Set the next value

```sql run destructive
ALTER TABLE ticket AUTO_INCREMENT = 1000;

INSERT INTO ticket (subject) VALUES ('Server down');

SELECT ticket_id, subject FROM ticket ORDER BY ticket_id DESC;
```

## Try it yourself

Create a table with a two-column primary key, insert a pair, and try to insert the same pair again.

## Watch out

### A primary key cannot be NULL and cannot repeat

```sql run error destructive
INSERT INTO ticket_tag VALUES (1, 'urgent');
```

The pair `(1, 'urgent')` was already stored earlier on this page, so the primary key refuses it (error 1062). A `NULL` in either key column would be refused as well.

### AUTO_INCREMENT leaves gaps

The counter only goes up. A failed insert, or a rolled-back one, still uses up a number, so ids are unique but **not** consecutive. Here the second insert fails on the duplicate email, but it still consumed an id:

```sql run error destructive
CREATE TABLE user_account (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(60) NOT NULL UNIQUE
);

INSERT INTO user_account (email) VALUES ('a@x.com');
INSERT INTO user_account (email) VALUES ('a@x.com');
INSERT INTO user_account (email) VALUES ('b@x.com');

SELECT user_id, email FROM user_account ORDER BY user_id;
```

`b@x.com` got `3`, not `2`. Never count rows by looking at the highest id.

### Deleting does not reuse ids

If you delete the row with the highest id and insert again, MySQL normally continues from the counter, not from the highest id still in the table. Do not build meaning into the numbers.

### Do not use a person's real data as the key

A key that comes from real life (an email, a phone number, a national id) can change, be mistyped, or turn out not to be unique. A meaningless generated id never has those problems. Keep the real value in its own `UNIQUE` column.

### Pick a type that will not run out

`INT UNSIGNED` reaches about 4.29 billion. A table that inserts millions of rows a day may need `BIGINT`.

## Interview corner

**"What makes a good primary key?"**
It is unique, never `NULL`, never changes, and is short. A surrogate key (a generated integer) meets all of that. Natural keys such as emails often change.

**"What is a composite key?"**
A primary key made of two or more columns, as in a link table between two entities.

**"Will `AUTO_INCREMENT` ids always be consecutive?"**
No. Failed and rolled-back inserts, deletes, and bulk inserts can leave gaps. Ids are for uniqueness, not for counting.

**"Surrogate key or natural key?"**
Usually a surrogate key for the primary key, plus a `UNIQUE` constraint on the natural key, so both are protected.

## Practice

### Warm-up: ids that fill themselves in

Create `room (room_id INT AUTO_INCREMENT PRIMARY KEY, label VARCHAR(20) NOT NULL)`, insert `A1`, `A2` and `A3`, and return `room_id` and `label`.

```sql practice destructive
-- hint: Insert only the labels.
DROP TABLE IF EXISTS room;
CREATE TABLE room (room_id INT AUTO_INCREMENT PRIMARY KEY, label VARCHAR(20) NOT NULL);
INSERT INTO room (label) VALUES ('A1'), ('A2'), ('A3');

SELECT room_id, label FROM room ORDER BY room_id;
```

### Core: start at 500

Create the same table, set its counter to start at 500 with `AUTO_INCREMENT = 500`, insert one row, and return its `room_id`.

```sql practice destructive
-- hint: Use `ALTER TABLE room AUTO_INCREMENT = 500;` before the insert.
DROP TABLE IF EXISTS room;
CREATE TABLE room (room_id INT AUTO_INCREMENT PRIMARY KEY, label VARCHAR(20) NOT NULL);
ALTER TABLE room AUTO_INCREMENT = 500;
INSERT INTO room (label) VALUES ('B1');

SELECT room_id FROM room;
```

### Stretch: a pair as a key

Create `enrolment (student_id INT NOT NULL, course_id INT NOT NULL, PRIMARY KEY (student_id, course_id))`. Insert `(1, 10)`, `(1, 20)`, `(2, 10)`. Return the number of enrolments **for course 10** as `in_course_10`.

```sql practice destructive
-- hint: The composite key allows the same course with different students.
DROP TABLE IF EXISTS enrolment;
CREATE TABLE enrolment (
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO enrolment VALUES (1, 10), (1, 20), (2, 10);

SELECT COUNT(*) AS in_course_10 FROM enrolment WHERE course_id = 10;
```
