---
title: "BETWEEN"
order: 0
---

`BETWEEN` selects values inside a range. Both ends are **included**.

## What you'll learn

- Numeric ranges
- Date ranges
- The classic trap with dates that include a time

## Syntax

```sql show
SELECT column1
FROM table_name
WHERE column BETWEEN low AND high;
```

## Examples

### Numbers

Films between 100 and 110 minutes long. A film of exactly 100 or 110 minutes is included:

```sql run
SELECT title, length
FROM film
WHERE length BETWEEN 100 AND 110
ORDER BY length, title;
```

`BETWEEN 100 AND 110` is the same as `length >= 100 AND length <= 110`.

### Text

Actors whose last name sorts between `A` and `B` (this uses alphabetical order):

```sql run
SELECT first_name, last_name
FROM actor
WHERE last_name BETWEEN 'AL' AND 'AN'
ORDER BY last_name, first_name;
```

### Dates

Rentals during three days at the end of May 2005:

```sql run
SELECT rental_id, rental_date
FROM rental
WHERE rental_date BETWEEN '2005-05-25' AND '2005-05-27'
ORDER BY rental_date;
```

There is a catch here, explained below.

## Try it yourself

List films between 50 and 60 minutes long, then films with a `replacement_cost` between 10 and 12.

## Watch out

### Order matters: low first, then high

`BETWEEN 110 AND 100` is empty. It does not swap the numbers for you:

```sql run
SELECT COUNT(*) AS films_found
FROM film
WHERE length BETWEEN 110 AND 100;
```

### A date with no time means midnight

A date column that also stores a **time** (`DATETIME`) treats `'2005-06-15'` as `'2005-06-15 00:00:00'`. So `BETWEEN '2005-06-14' AND '2005-06-15'` stops at the very start of the 15th and misses the rest of that day. Compare three ways of asking for "all payments on 14 and 15 June":

```sql run
SELECT COUNT(*) AS between_dates
FROM payment
WHERE payment_date BETWEEN '2005-06-14' AND '2005-06-15';

SELECT COUNT(*) AS end_of_day
FROM payment
WHERE payment_date BETWEEN '2005-06-14' AND '2005-06-15 23:59:59';

SELECT COUNT(*) AS half_open
FROM payment
WHERE payment_date >= '2005-06-14' AND payment_date < '2005-06-16';
```

The first result is far too low: it lost almost all of the 15th. The third form is the safest way to write date ranges. It starts at the first moment you want and stops just before the first moment you don't, so it works for any time precision.

## Interview corner

**"Is `BETWEEN` inclusive?"**
Yes, both ends are included.

**"How do you correctly select all rows for a date range on a `DATETIME` column?"**
Use `>= start_date AND < day_after_end_date`. Avoid `BETWEEN` with a plain end date, because it excludes everything after midnight on the last day.

## Practice

### Warm-up: mid-length films

Show the `title` and `length` of films between 90 and 95 minutes long. Order by length, then title.

```sql practice
-- hint: `length BETWEEN 90 AND 95`.
SELECT title, length
FROM film
WHERE length BETWEEN 90 AND 95
ORDER BY length, title;
```

### Core: mid-priced replacement

Show the `title` and `replacement_cost` of films whose replacement cost is between 12 and 14 inclusive. Order by `replacement_cost`, then title.

```sql practice
-- hint: Both ends are included.
SELECT title, replacement_cost
FROM film
WHERE replacement_cost BETWEEN 12 AND 14
ORDER BY replacement_cost, title;
```

### Stretch: one whole day

Count the payments made at any time on `2005-07-08` (the whole day). Return one number called `payments_that_day`.

```sql practice
-- hint: Use `payment_date >= '2005-07-08' AND payment_date < '2005-07-09'`.
SELECT COUNT(*) AS payments_that_day
FROM payment
WHERE payment_date >= '2005-07-08'
  AND payment_date < '2005-07-09';
```
