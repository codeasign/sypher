---
title: "Enums and Domains"
order: 0
---

An **enum** is a type with a fixed list of allowed values, such as a film's rating. A **domain** is an ordinary type with a rule attached, such as "a year between 1901 and 2155". Both let the database, rather than the application, guard what a column may hold.

## What you'll learn

- What an enum is, and how it sorts
- Creating, extending and listing enums
- Casting between enums and text
- Domains: a reusable type with a constraint

## Syntax

```sql show
CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy');
ALTER TYPE mood ADD VALUE 'ecstatic' AFTER 'happy';

CREATE DOMAIN positive_int AS integer CHECK (VALUE > 0);
```

## Examples

### The rating enum

`film.rating` is not text. It is the enum `mpaa_rating`. See its values in order:

```sql run
SELECT enum_range(NULL::mpaa_rating) AS ratings;
```

```sql run
SELECT e.enumsortorder AS position, e.enumlabel AS label
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'mpaa_rating'
ORDER BY e.enumsortorder;
```

### Enums sort and compare in declaration order

```sql run
SELECT 'G'::mpaa_rating < 'R'::mpaa_rating AS g_before_r,
       'NC-17'::mpaa_rating > 'PG'::mpaa_rating AS nc17_after_pg,
       MIN(rating) AS lowest, MAX(rating) AS highest
FROM film;
```

So `WHERE rating >= 'PG-13'` means PG-13, R and NC-17.

### Your own enum

```sql run destructive
CREATE TYPE ticket_status AS ENUM ('open', 'waiting', 'closed');

CREATE TABLE support_ticket (
  ticket_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status ticket_status NOT NULL DEFAULT 'open'
);
INSERT INTO support_ticket (status) VALUES ('open'), ('closed'), ('waiting');

SELECT status FROM support_ticket ORDER BY status;
```

### Adding a value

You can add a value, and choose where:

```sql run destructive
CREATE TYPE size AS ENUM ('small', 'large');
ALTER TYPE size ADD VALUE 'medium' BEFORE 'large';

SELECT enum_range(NULL::size) AS sizes;
```

You cannot easily remove or rename most values, so use an enum only for lists that rarely change.

### Domains: a type with a rule

`film.release_year` uses the domain `year`. A domain is a base type plus a `CHECK`, reusable across tables:

```sql run
SELECT t.typname AS domain, format_type(t.typbasetype, NULL) AS based_on, pg_get_constraintdef(c.oid) AS rule
FROM pg_type t
JOIN pg_constraint c ON c.contypid = t.oid
WHERE t.typname = 'year';
```

```sql run destructive
CREATE DOMAIN percent AS integer CHECK (VALUE BETWEEN 0 AND 100);
CREATE TABLE exam (student text, score percent);
INSERT INTO exam VALUES ('Asha', 87);

SELECT * FROM exam;
```

## Try it yourself

Create an enum `weekday` with the seven days and a table `shift (person text, day weekday)`. Insert a shift, then sort the table by day.

## Watch out

### An invalid value is an error

```sql run error
SELECT 'XX'::mpaa_rating;
```

### A domain check is enforced everywhere it is used

```sql run error destructive
CREATE DOMAIN percent2 AS integer CHECK (VALUE BETWEEN 0 AND 100);
CREATE TABLE exam2 (score percent2);
INSERT INTO exam2 VALUES (150);
```

### Enums are harder to change than a lookup table

Removing or reordering enum values needs a type rewrite. If the list changes often, or you want extra columns (a label, a colour), use a small lookup table with a foreign key instead.

### Enums and text do not mix silently

`rating = 'R'` works because the literal is converted. But `rating = some_text_column` fails: cast one side (`rating::text`).

### Adding a value inside a transaction

`ALTER TYPE ... ADD VALUE` cannot always be used in the same transaction that then uses the new value. Run it on its own first.

## Interview corner

**"What is an enum in PostgreSQL, and when would you use one?"**
A type with a fixed, ordered list of values. It stores compactly (4 bytes), sorts in declaration order and rejects other values. Use it for small stable lists such as statuses or ratings.

**"Enum versus a lookup table or a CHECK constraint?"**
An enum is compact and typed. A lookup table with a foreign key is easier to extend and can carry extra columns. `CHECK (col IN (...))` is simple but the list is repeated in every table.

**"What is a domain?"**
A named data type built on another type with an optional default and constraints, so the same rule (like "a percentage") is defined once and reused.

## Practice

### Warm-up: enum comparison

How many films have a rating **above** `PG` (that is, `PG-13`, `R` or `NC-17`)? Return one number, `above_pg`.

```sql practice
-- hint: `rating > 'PG'` uses the enum's order.
SELECT COUNT(*) AS above_pg FROM film WHERE rating > 'PG';
```

### Core: your own enum

Create the enum `traffic AS ENUM ('red', 'amber', 'green')`, a table `light (colour traffic)`, insert `green`, `red`, `amber`, and return the colours in enum order (`colour` column).

```sql practice destructive
-- hint: ORDER BY the enum column.
CREATE TYPE traffic AS ENUM ('red', 'amber', 'green');
CREATE TABLE light (colour traffic);
INSERT INTO light VALUES ('green'), ('red'), ('amber');

SELECT colour FROM light ORDER BY colour;
```

### Stretch: a domain

Create the domain `age_years AS integer CHECK (VALUE BETWEEN 0 AND 130)`, a table `person (name text, age age_years)`, insert `('Asha', 30)`, and return the row.

```sql practice destructive
-- hint: `CREATE DOMAIN age_years AS integer CHECK (VALUE BETWEEN 0 AND 130)`.
CREATE DOMAIN age_years AS integer CHECK (VALUE BETWEEN 0 AND 130);
CREATE TABLE person (name text, age age_years);
INSERT INTO person VALUES ('Asha', 30);

SELECT * FROM person;
```
