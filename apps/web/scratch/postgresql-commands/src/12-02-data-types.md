---
title: "Data Types"
order: 0
---

Every column has a **data type**, a rule about what it may hold. Choosing the right type keeps bad data out, saves space and speeds up queries. Here are the ones you will actually use, and what happens when you break their rules.

## What you'll learn

- The main numeric, text, date and other types
- Why money belongs in `numeric`
- `text` versus `varchar` versus `char`
- What PostgreSQL does when a value does not fit

## The types you will use

| Group | Types | Notes |
|---|---|---|
| Whole numbers | `smallint`, `integer`, `bigint` | 2, 4 and 8 bytes |
| Exact decimals | `numeric(p, s)` | Money, measurements |
| Approximate numbers | `real`, `double precision` | Science; never money |
| Text | `text`, `varchar(n)`, `char(n)` | `text` has no length limit |
| Dates and times | `date`, `time`, `timestamp`, `timestamptz`, `interval` | See page 4.3 |
| True/false | `boolean` | Shown as `t` / `f` |
| Identifiers | `uuid` | Globally unique ids |
| Lists and structure | arrays (`int[]`), `jsonb`, ranges | Module 13 |
| Fixed choices | `enum` | Module 13 |

## Syntax

```sql show
CREATE TABLE table_name (
  column_name data_type [constraints],
  ...
);
```

## Set up a table to experiment on

```sql run destructive
CREATE TABLE type_demo (
  small_number smallint,
  price numeric(6, 2),
  short_code char(5),
  title varchar(10),
  notes text,
  born date,
  active boolean,
  id uuid DEFAULT gen_random_uuid()
);

INSERT INTO type_demo (small_number, price, short_code, title, notes, born, active)
VALUES (100, 1234.56, 'AB', 'hello', 'any length at all', '2007-03-15', true);

SELECT small_number, price, short_code, title, born, active FROM type_demo;
```

## Examples

### Numbers have a range

A `smallint` holds -32768 to 32767. `integer` holds about ±2 billion, and `bigint` about ±9 quintillion:

```sql run
SELECT 32767::smallint AS smallint_max, 2147483647::integer AS integer_max, 9223372036854775807::bigint AS bigint_max;
```

### Decimal is exact, double is not

Computers store `double precision` in binary, and many decimal fractions cannot be stored exactly in binary. Compare adding tenths:

```sql run
SELECT (0.1::numeric + 0.2::numeric) AS numeric_sum,
       (0.1::float8 + 0.2::float8) AS float_sum,
       (0.1::float8 + 0.2::float8) = 0.3::float8 AS float_equal;
```

That is why prices go in `numeric`.

### char pads, varchar and text do not

`char(5)` always uses 5 characters (padding with spaces). `varchar` and `text` remember exactly what you stored:

```sql run
SELECT length(short_code) AS char_length, length(title) AS varchar_length FROM type_demo;
```

### text is fine

In PostgreSQL `text` and `varchar` are stored the same way, and `text` is not slower. Use `varchar(n)` only when the length limit is a real business rule.

### uuid

`gen_random_uuid()` makes a random unique id. It is a good key when rows are created in many places at once:

```sql run
SELECT length(id::text) AS uuid_text_length, id IS NOT NULL AS has_id FROM type_demo;
```

## Try it yourself

Create a table with a `numeric(6, 2)` price and insert `1234.567`. See what is stored. Then try `99999.99`.

## Watch out

### A value that does not fit is an error

PostgreSQL never quietly changes a value to make it fit:

```sql run error
INSERT INTO type_demo (small_number) VALUES (40000);
```

### Text that is too long is refused

```sql run error
INSERT INTO type_demo (title) VALUES ('this title is much too long');
```

`title` was declared `varchar(10)`. (MySQL in non-strict mode would silently cut it.)

### numeric rounds to the declared scale

```sql run
SELECT 1234.567::numeric(6, 2) AS rounded_to_two_places;
```

### An impossible date is refused

```sql run error
INSERT INTO type_demo (born) VALUES ('2007-02-30');
```

### Do not store money in float

Small rounding errors add up over thousands of rows. Use `numeric(10, 2)` (or store whole cents in an `integer`).

### Pick the smallest type that is safe

A `smallint` for a rating from 1 to 5 uses two bytes instead of four. Across millions of rows that saves memory and makes indexes smaller. But do not choose so small that real growth will not fit.

## Interview corner

**"What is the difference between `char`, `varchar` and `text`?"**
`char(n)` is fixed length and pads with spaces. `varchar(n)` has a maximum length. `text` has no limit. In PostgreSQL they perform the same, so `text` is the usual choice unless you need a length rule.

**"Which type would you use for money?"**
`numeric(p, s)`, because it is exact. `real` and `double precision` are approximations. (PostgreSQL also has a `money` type, but it is tied to a locale setting and rarely recommended.)

**"What is the difference between `timestamp` and `timestamptz`?"**
`timestamptz` stores an exact moment (in UTC) and shows it in the session's time zone. `timestamp` stores what you give it, with no zone.

**"What is a `serial` column?"**
Shorthand for an `integer` with a default from a sequence. Modern PostgreSQL prefers `GENERATED ... AS IDENTITY` (page 12.5).

## Practice

### Warm-up: decimal versus double

Return two columns, `decimal_ok` and `double_ok`: whether `0.1 + 0.2 + 0.3 = 0.6` holds when computed as `numeric`, and when computed as `double precision`.

```sql practice
-- hint: Cast every number: `0.1::numeric + 0.2::numeric + 0.3::numeric = 0.6::numeric`.
SELECT (0.1::numeric + 0.2::numeric + 0.3::numeric = 0.6::numeric) AS decimal_ok,
       (0.1::float8 + 0.2::float8 + 0.3::float8 = 0.6::float8) AS double_ok;
```

### Core: a table with the right types

Create `product` with `id integer`, `name varchar(40)`, `price numeric(8, 2)` and `in_stock boolean`. Insert one row `(1, 'Notebook', 4.50, TRUE)` and return it.

```sql practice destructive
-- hint: A plain CREATE TABLE, an INSERT, and a SELECT.
CREATE TABLE product (id integer, name varchar(40), price numeric(8, 2), in_stock boolean);
INSERT INTO product VALUES (1, 'Notebook', 4.50, TRUE);

SELECT * FROM product;
```

### Stretch: the rounding you get

Create `price_test (p numeric(6, 2))`, insert the values `1.005`, `2.675` and `3.994`, and return them ordered by value. What was stored?

```sql practice destructive
-- hint: `numeric(6, 2)` rounds half away from zero.
CREATE TABLE price_test (p numeric(6, 2));
INSERT INTO price_test VALUES (1.005), (2.675), (3.994);

SELECT p FROM price_test ORDER BY p;
```
