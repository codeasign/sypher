---
title: "CAST and CONVERT"
order: 0
---

`CAST` changes a value from one data type to another, for example text to a number, a number to text, or a date-time to a plain date.

## What you'll learn

- Changing types with `CAST` and `CONVERT`
- When MySQL converts for you, and when that goes wrong
- Why comparing numbers stored as text surprises people

## Syntax

```sql show
CAST(value AS type)
CONVERT(value, type)
```

Common target types: `CHAR`, `SIGNED`, `UNSIGNED`, `DECIMAL(10,2)`, `DATE`, `DATETIME`, `TIME`.

## Examples

### Text to a number

```sql run
SELECT CAST('123' AS UNSIGNED) + 1 AS number_plus_one;
```

### A number to text

```sql run
SELECT title, CONCAT(CAST(length AS CHAR), ' min') AS running_time
FROM film
ORDER BY film_id;
```

### A date-time to a date

Payments have a date and a time. To group or compare by day, cut the time off:

```sql run
SELECT payment_id, payment_date, CAST(payment_date AS DATE) AS payment_day
FROM payment
ORDER BY payment_id;
```

`DATE(payment_date)` does the same and is shorter.

### CONVERT

`CONVERT` does the same job with the arguments in the other order:

```sql run
SELECT CONVERT('2005-06-15 14:30:00', DATETIME) AS as_datetime,
       CONVERT(4.99, DECIMAL(4, 1)) AS one_decimal;
```

### Precision with DECIMAL

```sql run
SELECT rental_rate, CAST(rental_rate * 1.2 AS DECIMAL(5, 2)) AS with_surcharge
FROM film
ORDER BY film_id;
```

## Try it yourself

Show each film's `replacement_cost` as whole dollars using `CAST(... AS SIGNED)`. Compare with `TRUNCATE`.

## Watch out

### Text sorts and compares differently from numbers

As text, `'9'` comes **after** `'10'`, because MySQL compares character by character. As numbers, the answer flips:

```sql run
SELECT '9' > '10' AS as_text, 9 > 10 AS as_numbers, CAST('9' AS UNSIGNED) > CAST('10' AS UNSIGNED) AS after_cast;
```

If numbers are stored in a text column, `CAST` them before you sort or compare.

### CAST to an integer rounds

Casting a decimal to a whole number rounds, it does not cut:

```sql run
SELECT CAST(4.99 AS SIGNED) AS cast_4_99, TRUNCATE(4.99, 0) AS truncate_4_99;
```

### A partly numeric string is cut, not rejected

```sql run
SELECT CAST('12abc' AS UNSIGNED) AS partial;
```

MySQL reads the digits it can (`12`) and ignores the rest, with only a warning. Bad data can slip through, so clean it first.

### Implicit conversion hides problems

MySQL will often convert types quietly, for example when comparing a number column to a text value. It works until it doesn't, and it can also stop an index being used. Write the right type in the first place.

## Interview corner

**"What is the difference between `CAST` and `CONVERT`?"**
They do the same in MySQL. `CAST` is the standard SQL form. `CONVERT` is MySQL's older form, with the arguments reversed, and it can also change character sets.

**"Why does sorting a text column of numbers give 1, 10, 2, 3?"**
It is sorted as text, character by character. Cast it to a number (or store it as a number) to sort it numerically.

## Practice

### Warm-up: length as text

Show each film's `title` and `length` cast to text (`CHAR`) as `length_text`, ordered by `film_id`.

```sql practice
-- hint: `CAST(length AS CHAR)`.
SELECT title, CAST(length AS CHAR) AS length_text
FROM film
ORDER BY film_id;
```

### Core: payments by day

Show the different **dates** (without the time) on which payments were made, oldest first. Return one column, `payment_day`.

```sql practice rows=6
-- hint: Cast `payment_date` to `DATE` and use `DISTINCT`.
SELECT DISTINCT CAST(payment_date AS DATE) AS payment_day
FROM payment
ORDER BY payment_day;
```

### Stretch: price with a surcharge

Show `title` and the `rental_rate` increased by 15% and cast to `DECIMAL(5,2)`, as `new_rate`, for films whose current rate is `0.99`. Order by `title`.

```sql practice
-- hint: `CAST(rental_rate * 1.15 AS DECIMAL(5,2))`, filtered with `WHERE rental_rate = 0.99`.
SELECT title, CAST(rental_rate * 1.15 AS DECIMAL(5, 2)) AS new_rate
FROM film
WHERE rental_rate = 0.99
ORDER BY title;
```
