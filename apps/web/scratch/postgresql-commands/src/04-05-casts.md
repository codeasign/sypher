---
title: "Casting: CAST and ::"
order: 0
---

A **cast** changes a value from one data type to another, for example text to a number, a number to text, or a timestamp to a plain date. PostgreSQL is strict about types, so casts are part of everyday queries.

## What you'll learn

- `CAST(value AS type)` and the shorter `value::type`
- The `to_char`, `to_number` and `to_date` helpers
- When PostgreSQL converts for you, and when it refuses
- Why comparing numbers stored as text surprises people

## Syntax

```sql show
SELECT CAST(value AS type);
SELECT value::type;
```

Common target types: `text`, `integer`, `bigint`, `numeric(10,2)`, `date`, `timestamp`, `boolean`.

## Examples

### Text to a number

```sql run
SELECT '42'::integer + 8 AS total, CAST('3.50' AS numeric) * 2 AS doubled;
```

### A number to text

```sql run
SELECT 42::text || ' items' AS label, length(12345::text) AS digits;
```

### A timestamp to a date

Payments have a date and a time. To group or compare by day, cut the time off:

```sql run
SELECT payment_date::date AS day, COUNT(*) AS payments
FROM payment
GROUP BY 1
ORDER BY 1
LIMIT 3;
```

### To boolean, and back

```sql run
SELECT 'yes'::boolean AS a, 'f'::boolean AS b, true::integer AS c;
```

### Helpers with formats

`to_char`, `to_number` and `to_date` convert using a pattern:

```sql run
SELECT to_number('1,234.50', '9,999.99') AS number_from_text,
       to_date('15 Mar 2007', 'DD Mon YYYY') AS date_from_text,
       to_char(1234.5, 'FM9,999.00') AS text_from_number;
```

### Precision with numeric

```sql run
SELECT 10::numeric / 3 AS long, (10::numeric / 3)::numeric(6,2) AS two_places;
```

## Try it yourself

Show each film's `replacement_cost` as whole dollars using `::integer`. Compare with `trunc()`.

## Watch out

### Text sorts and compares differently from numbers

As text, `'9'` comes **after** `'10'`, because PostgreSQL compares character by character. As numbers, the answer flips:

```sql run
SELECT '9' > '10' AS as_text, '9'::integer > '10'::integer AS as_numbers;
```

If numbers are stored in a text column, cast them before you sort or compare.

### A bad value is an error, not a guess

MySQL reads the digits it can and ignores the rest. PostgreSQL refuses:

```sql run error
SELECT '12abc'::integer;
```

### Casting to an integer rounds

Casting a decimal to a whole number rounds, it does not cut:

```sql run
SELECT 2.7::integer AS rounded, trunc(2.7)::integer AS cut;
```

### Implicit conversion is limited

PostgreSQL converts quietly only when it is safe, for example integer to numeric. It will not compare a number column with a text value that is not a number, and it will not silently turn text into a date. This is a feature: bugs show up as errors, not wrong answers.

## Interview corner

**"What is the difference between `CAST(x AS type)` and `x::type`?"**
None. `CAST` is the standard SQL form; `::` is PostgreSQL's short form.

**"Why does sorting a text column of numbers give 1, 10, 2, 3?"**
It is sorted as text, character by character. Cast it to a number (or store it as a number) to sort it numerically.

**"What happens when a cast fails?"**
PostgreSQL raises an error (`invalid input syntax for type integer`) and the statement is cancelled.

## Practice

### Warm-up: length as text

Show each film's `title` and `length` cast to text as `length_text`, ordered by `film_id`. Show the first rows.

```sql practice
-- hint: `length::text`.
SELECT title, length::text AS length_text
FROM film
ORDER BY film_id;
```

### Core: payments by day

Show the different **dates** (without the time) on which payments were made, oldest first. Return one column, `payment_day`. Show the first rows.

```sql practice
-- hint: `DISTINCT payment_date::date`.
SELECT DISTINCT payment_date::date AS payment_day
FROM payment
ORDER BY payment_day;
```

### Stretch: price with a surcharge

Show `title` and the `rental_rate` increased by 15% and cast to `numeric(5,2)`, as `new_rate`, for films whose current rate is `0.99`. Order by `title`. Show the first rows.

```sql practice
-- hint: `(rental_rate * 1.15)::numeric(5,2)`.
SELECT title, (rental_rate * 1.15)::numeric(5,2) AS new_rate
FROM film
WHERE rental_rate = 0.99
ORDER BY title;
```
