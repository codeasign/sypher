---
title: "NOT NULL, DEFAULT and UNIQUE"
order: 0
---

A **constraint** is a rule the database enforces for you. Instead of hoping every program remembers to check the data, you make bad data impossible to store. Three of the most useful are `NOT NULL`, `DEFAULT` and `UNIQUE`.

## What you'll learn

- Forbidding empty values with `NOT NULL`
- Filling in a value automatically with `DEFAULT`
- Forbidding duplicates with `UNIQUE`
- How `UNIQUE` treats `NULL` (and `NULLS NOT DISTINCT`)

## Syntax

```sql show
CREATE TABLE t (
  a text NOT NULL,
  b text DEFAULT 'x',
  c text UNIQUE,
  d text,
  UNIQUE (a, d)
);
```

## Set up

A table of members for a small club:

```sql run destructive
CREATE TABLE member (
  member_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  nickname text UNIQUE,
  level text NOT NULL DEFAULT 'bronze'
);

INSERT INTO member (email, nickname) VALUES ('asha@example.com', 'asha');

SELECT member_id, email, nickname, level FROM member;
```

## Examples

### DEFAULT fills in the blanks

`level` was not given, so it took its default (see above): `bronze`.

### UNIQUE allows many NULLs

`nickname` is `UNIQUE` but not `NOT NULL`. `NULL` means "no value", so any number of rows may have it, without clashing:

```sql run destructive
INSERT INTO member (email) VALUES ('ben@example.com'), ('chen@example.com');

SELECT email, nickname FROM member ORDER BY member_id;
```

### A unique key over two columns

Sometimes it is the **combination** that must be unique. A member can have many badges, but not the same badge twice:

```sql run destructive
CREATE TABLE member_badge (
  member_id integer NOT NULL,
  badge text NOT NULL,
  CONSTRAINT one_badge_per_member UNIQUE (member_id, badge)
);

INSERT INTO member_badge VALUES (1, 'gold'), (2, 'gold'), (1, 'silver');

SELECT * FROM member_badge ORDER BY member_id, badge;
```

### NULLS NOT DISTINCT

Since PostgreSQL 15 you can make `NULL`s count as equal in a unique rule:

```sql run error destructive
CREATE TABLE code (value text UNIQUE NULLS NOT DISTINCT);
INSERT INTO code VALUES (NULL);
INSERT INTO code VALUES (NULL);
```

The second `NULL` is refused, because the constraint treats two `NULL`s as the same value.

## Try it yourself

Add a table `room` where `(building, number)` is unique, and check that two rooms with the same number in different buildings are allowed.

## Watch out

### NOT NULL rejects a missing value

```sql run error destructive
INSERT INTO member (nickname) VALUES ('nomail');
```

`email` is `NOT NULL` and has no default, and this insert did not supply one, so PostgreSQL refuses.

### UNIQUE rejects a duplicate

```sql run error destructive
INSERT INTO member (email) VALUES ('asha@example.com');
```

The message names the value and the constraint that stopped it.

### The combination is what counts

With a two-column `UNIQUE`, the pair `(1, 'gold')` cannot appear twice, but `(1, 'gold')` and `(2, 'gold')` are fine:

```sql run error destructive
INSERT INTO member_badge VALUES (1, 'gold');
```

### Text uniqueness is case-sensitive

`'ASHA@example.com'` and `'asha@example.com'` are **different** values in PostgreSQL (unlike MySQL). For case-insensitive uniqueness, use a unique index on `lower(email)` (Module 14), or the `citext` extension.

### A DEFAULT is not used when you insert NULL yourself

Leaving a column out uses the default. Explicitly inserting `NULL` into a `NOT NULL` column is an error, and into a nullable column stores `NULL`, not the default.

## Interview corner

**"What is the difference between `UNIQUE` and `PRIMARY KEY`?"**
A table can have only one primary key, and it cannot be `NULL`. A table can have several `UNIQUE` constraints, and they may allow `NULL`s.

**"Can a `UNIQUE` column contain `NULL`?"**
Yes, and by default several `NULL`s are allowed, since `NULL` is never equal to another `NULL`. `NULLS NOT DISTINCT` (PostgreSQL 15+) changes that.

**"Why enforce rules in the database and not just in the application?"**
Many programs (and people running manual updates) touch the same data. A constraint protects it from all of them, and a bug in one program cannot corrupt it.

## Practice

### Warm-up: reject a missing name

Create `pet (pet_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL)`. Insert `Rex`, then return the number of pets as `pets`.

```sql practice destructive
-- hint: Create, insert, count.
CREATE TABLE pet (pet_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL);
INSERT INTO pet (name) VALUES ('Rex');

SELECT COUNT(*) AS pets FROM pet;
```

### Core: unique emails, several NULL nicknames

Create `subscriber (email text NOT NULL UNIQUE, nickname text UNIQUE)`. Insert three subscribers with different emails and **no** nickname. Return how many have a `NULL` nickname as `without_nickname`.

```sql practice destructive
-- hint: Several NULLs do not clash in a UNIQUE column.
CREATE TABLE subscriber (email text NOT NULL UNIQUE, nickname text UNIQUE);
INSERT INTO subscriber (email) VALUES ('a@x.com'), ('b@x.com'), ('c@x.com');

SELECT COUNT(*) AS without_nickname FROM subscriber WHERE nickname IS NULL;
```

### Stretch: unique pairs

Create `booking (room integer NOT NULL, day date NOT NULL, UNIQUE (room, day))`. Insert room 1 on `2025-01-01`, room 1 on `2025-01-02`, and room 2 on `2025-01-01`. Return the number of bookings as `bookings`.

```sql practice destructive
-- hint: The three rows all differ as pairs.
CREATE TABLE booking (room integer NOT NULL, day date NOT NULL, UNIQUE (room, day));
INSERT INTO booking VALUES (1, '2025-01-01'), (1, '2025-01-02'), (2, '2025-01-01');

SELECT COUNT(*) AS bookings FROM booking;
```
