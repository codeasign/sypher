---
title: "BETWEEN"
order: 0
---

`BETWEEN` selects values inside a range. Both ends are **included**.

## What you'll learn

- Numeric ranges
- Date ranges
- The classic trap with dates that include a time
- `NOT BETWEEN`

## Syntax

```sql show
SELECT column1
FROM table_name
WHERE column1 BETWEEN low AND high;
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
WHERE last_name BETWEEN 'A' AND 'B'
ORDER BY last_name, first_name;
```

### Dates

Payments during three days in the middle of the payment period:

```sql run
SELECT COUNT(*) AS payments
FROM payment
WHERE payment_date BETWEEN '2007-03-01' AND '2007-03-03';
```

There is a catch here, explained below.

## Try it yourself

List films between 50 and 60 minutes long, then films with a `replacement_cost` between 10 and 12.

## Watch out

### Order matters: low first, then high

`BETWEEN 110 AND 100` is empty. It does not swap the numbers for you (`BETWEEN SYMMETRIC 110 AND 100` does):

```sql run
SELECT
  (SELECT COUNT(*) FROM film WHERE length BETWEEN 110 AND 100) AS wrong_order,
  (SELECT COUNT(*) FROM film WHERE length BETWEEN SYMMETRIC 110 AND 100) AS symmetric;
```

### A date with no time means midnight

`payment_date` also stores a **time**. So `'2007-03-03'` means `'2007-03-03 00:00:00'`, and `BETWEEN '2007-03-01' AND '2007-03-03'` stops at the very start of the 3rd and misses the rest of that day. Compare three ways of asking for "all payments on 1 to 3 March":

```sql run
SELECT
  (SELECT COUNT(*) FROM payment WHERE payment_date BETWEEN '2007-03-01' AND '2007-03-03') AS between_dates,
  (SELECT COUNT(*) FROM payment WHERE payment_date BETWEEN '2007-03-01' AND '2007-03-03 23:59:59') AS almost_right,
  (SELECT COUNT(*) FROM payment WHERE payment_date >= '2007-03-01' AND payment_date < '2007-03-04') AS half_open;
```

The first result loses nearly the whole of the 3rd, because only payments stamped exactly midnight qualify. The second matches here, but would still miss a payment stamped 23:59:59.5. The third form is the safest way to write date ranges. It starts at the first moment you want and stops just before the first moment you don't, so it works for any time precision.

## Interview corner

**"Is `BETWEEN` inclusive?"**
Yes, both ends are included.

**"How do you correctly select all rows for a date range on a timestamp column?"**
Use `>= start_date AND < day_after_end_date`. Avoid `BETWEEN` with a plain end date, because it excludes everything after midnight on the last day.

**"What is `BETWEEN SYMMETRIC`?"**
A PostgreSQL option that swaps the two ends if they are in the wrong order.

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
-- hint: `BETWEEN` includes both ends.
SELECT title, replacement_cost
FROM film
WHERE replacement_cost BETWEEN 12 AND 14
ORDER BY replacement_cost, title;
```

### Stretch: one whole day

Count the payments made at any time on `2007-03-15` (the whole day). Return one number called `payments_that_day`.

```sql practice
-- hint: Use `>= '2007-03-15' AND < '2007-03-16'`.
SELECT COUNT(*) AS payments_that_day
FROM payment
WHERE payment_date >= '2007-03-15' AND payment_date < '2007-03-16';
```
