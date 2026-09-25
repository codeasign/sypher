---
title: "CHECK and EXCLUDE"
order: 0
---

A `CHECK` constraint states a rule that every row must satisfy, such as "the price is above zero" or "the end date is not before the start date". PostgreSQL refuses any row that breaks it. Its cousin `EXCLUDE` states a rule *between* rows, such as "no two bookings of one room may overlap".

## What you'll learn

- Column and table `CHECK` constraints
- Naming and adding a constraint later
- How `NULL` interacts with `CHECK`
- `EXCLUDE` constraints with ranges

## Syntax

```sql show
CREATE TABLE t (
  price numeric CHECK (price > 0),
  a date, b date,
  CONSTRAINT ends_after_start CHECK (b >= a)
);

ALTER TABLE t ADD CONSTRAINT name CHECK (condition);
```

## Examples

### A rule on one column

```sql run destructive
CREATE TABLE item (
  item_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  price numeric(6, 2) NOT NULL CHECK (price > 0)
);

INSERT INTO item (name, price) VALUES ('Lamp', 19.99) RETURNING *;
```

### A rule across columns

A booking must not end before it starts. The condition looks at two columns, so it goes at the table level, and it has a name that helps whoever reads the error:

```sql run destructive
CREATE TABLE stay (
  stay_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  check_in date NOT NULL,
  check_out date NOT NULL,
  CONSTRAINT ends_after_start CHECK (check_out > check_in)
);

INSERT INTO stay (check_in, check_out) VALUES ('2025-01-01', '2025-01-05') RETURNING *;
```

### A list of allowed values

```sql run destructive
CREATE TABLE ticket (
  ticket_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('open', 'closed', 'waiting'))
);

INSERT INTO ticket (status) VALUES ('open') RETURNING *;
```

### Adding a rule to an existing table

```sql run destructive
ALTER TABLE item ADD CONSTRAINT name_not_blank CHECK (length(trim(name)) > 0);

SELECT conname, pg_get_constraintdef(oid) AS rule
FROM pg_constraint
WHERE conrelid = 'item'::regclass AND contype = 'c'
ORDER BY conname;
```

### EXCLUDE: no overlapping bookings

A `UNIQUE` constraint compares values for equality. An `EXCLUDE` constraint compares rows with any operator, such as "the ranges overlap" (`&&`). It needs the `btree_gist` extension for the equality part:

```sql run destructive
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE room_booking (
  room integer NOT NULL,
  during tsrange NOT NULL,
  EXCLUDE USING gist (room WITH =, during WITH &&)
);

INSERT INTO room_booking VALUES (1, '[2025-01-01 10:00, 2025-01-01 12:00)');
INSERT INTO room_booking VALUES (1, '[2025-01-01 12:00, 2025-01-01 14:00)');
INSERT INTO room_booking VALUES (2, '[2025-01-01 10:00, 2025-01-01 12:00)');

SELECT room, during FROM room_booking ORDER BY room, during;
```

These three are accepted: the second starts exactly where the first ends (ranges include the start and exclude the end), and the third is another room.

## Try it yourself

Add a `CHECK` that a rating is between 1 and 5, and one that a percentage is between 0 and 100. Try to insert values on both sides of the limit.

## Watch out

### A failing row is refused

```sql run error destructive
INSERT INTO item (name, price) VALUES ('Freebie', 0);
```

The message names the constraint. A good constraint name (`ends_after_start`, not `chk1`) helps whoever reads the error.

### An overlapping booking is refused

```sql run error destructive
INSERT INTO room_booking VALUES (1, '[2025-01-01 11:00, 2025-01-01 13:00)');
```

### NULL passes a CHECK

A `CHECK` only rejects rows where the condition is **false**. If it is unknown (because a column is `NULL`), the row is accepted:

```sql run destructive
CREATE TABLE score (points integer CHECK (points >= 0));
INSERT INTO score VALUES (NULL);

SELECT COUNT(*) AS rows_stored FROM score;
```

If a value must be present, add `NOT NULL` as well.

### Adding a check fails if the existing data breaks it

`ALTER TABLE ... ADD CONSTRAINT ... CHECK` validates every existing row first. Clean up bad rows before adding the rule, or add it as `NOT VALID` (only new rows are checked) and `VALIDATE CONSTRAINT` later.

### A CHECK cannot use other tables

It cannot look at other tables or use subqueries. For rules across tables, use foreign keys, an `EXCLUDE` constraint, or a trigger (Module 15).

## Interview corner

**"What does a `CHECK` constraint do?"**
It rejects any insert or update that makes the stated condition false for a row.

**"Does a `CHECK` reject `NULL`?"**
No. `NULL` makes the condition unknown, and only a false result is rejected. Combine it with `NOT NULL`.

**"What is an `EXCLUDE` constraint?"**
A generalised unique constraint: no two rows may both satisfy the given operators against each other. The classic use is preventing overlapping time ranges for the same resource.

## Practice

### Warm-up: a positive price

Create `thing (thing_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, price numeric(6,2) NOT NULL, CHECK (price > 0))`, insert a price of `3.50`, and return the row count as `things`.

```sql practice destructive
-- hint: Insert, then COUNT.
CREATE TABLE thing (thing_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, price numeric(6,2) NOT NULL, CHECK (price > 0));
INSERT INTO thing (price) VALUES (3.50);

SELECT COUNT(*) AS things FROM thing;
```

### Core: a rating between 1 and 5

Create `review (review_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, stars smallint NOT NULL, CHECK (stars BETWEEN 1 AND 5))`. Insert the ratings 1, 3 and 5 and return `stars`, ordered by `stars`.

```sql practice destructive
-- hint: All three are within the limits.
CREATE TABLE review (review_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, stars smallint NOT NULL, CHECK (stars BETWEEN 1 AND 5));
INSERT INTO review (stars) VALUES (1), (3), (5);

SELECT stars FROM review ORDER BY stars;
```

### Stretch: no double booking

Create `court_booking (court integer NOT NULL, hours int4range NOT NULL, EXCLUDE USING gist (court WITH =, hours WITH &&))` (after `CREATE EXTENSION IF NOT EXISTS btree_gist`), insert court 1 for hours `[9,11)` and `[11,13)`, and court 2 for `[9,11)`. Return the number of bookings as `bookings`.

```sql practice destructive
-- hint: `[9,11)` and `[11,13)` do not overlap, because the end is excluded.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE court_booking (court integer NOT NULL, hours int4range NOT NULL, EXCLUDE USING gist (court WITH =, hours WITH &&));
INSERT INTO court_booking VALUES (1, '[9,11)'), (1, '[11,13)'), (2, '[9,11)');

SELECT COUNT(*) AS bookings FROM court_booking;
```
