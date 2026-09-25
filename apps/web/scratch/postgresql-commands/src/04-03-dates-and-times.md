---
title: "Dates, Times and Ranges"
order: 0
---

Dates are everywhere: when a rental happened, when a payment was made, how long a customer kept a film. PostgreSQL has excellent tools for them, including a **range** type that this database uses to record a rental's whole lifetime in one column.

## What you'll learn

- The date and time types, and `timestamp` versus `timestamptz`
- Pulling parts out of a date: `EXTRACT`, `date_trunc`
- Formatting: `to_char`
- Date arithmetic with `interval`, and `age`
- The `rental_period` range: `lower`, `upper` and `@>`

## The date types

| Type | Holds | Example |
|---|---|---|
| `date` | A day | `2007-03-15` |
| `time` | A time of day | `14:30:00` |
| `timestamp` | Day and time, no time zone | `2007-03-15 14:30:00` |
| `timestamptz` | Day and time, stored as an exact moment (UTC), shown in the session's time zone | `2007-03-15 14:30:00+00` |
| `interval` | A length of time | `3 days 04:00:00` |

## Syntax

```sql show
SELECT EXTRACT(part FROM date_or_timestamp);
SELECT date_trunc('month', timestamp);
SELECT to_char(timestamp, 'YYYY-MM-DD');
SELECT timestamp + interval '1 month';
```

## Examples

### The current date and time

```sql show
SELECT current_date, now(), current_timestamp;
```

These change every time you run them, so the examples below use fixed dates from the database, and their results never change.

### Pulling out the parts

`EXTRACT(part FROM value)` gives one part as a number. `to_char` gives text in the shape you choose:

```sql run
SELECT payment_date,
       EXTRACT(year FROM payment_date) AS year,
       EXTRACT(month FROM payment_date) AS month,
       EXTRACT(dow FROM payment_date) AS weekday_number,
       to_char(payment_date, 'Day') AS weekday_name
FROM payment
ORDER BY payment_id
LIMIT 3;
```

`dow` is the day of the week, with Sunday as 0.

### Formatting

`to_char` uses pattern letters: `YYYY` year, `MM` month, `DD` day, `Mon` short month name, `HH24:MI` time:

```sql run
SELECT payment_date,
       to_char(payment_date, 'DD Mon YYYY') AS readable,
       to_char(payment_date, 'YYYY-MM') AS month_key
FROM payment
ORDER BY payment_id
LIMIT 3;
```

### Cutting to a unit: date_trunc

`date_trunc('month', ts)` returns the first moment of that month. It is the standard way to group by month:

```sql run
SELECT date_trunc('month', payment_date) AS month, COUNT(*) AS payments
FROM payment
GROUP BY 1
ORDER BY 1
LIMIT 4;
```

### Adding and subtracting time

Add an `interval` to a date or timestamp. Subtracting two dates gives a number of days; subtracting two timestamps gives an interval:

```sql run
SELECT date '2007-01-31' + interval '1 month' AS plus_month,
       date '2007-03-15' - date '2007-03-01' AS days_between,
       timestamp '2007-03-15 18:00' - timestamp '2007-03-15 09:30' AS elapsed;
```

### age

`age(later, earlier)` gives the gap as years, months and days:

```sql run
SELECT age(date '2007-03-15', date '2006-02-14') AS gap;
```

### Ranges: the rental period

A `rental` does not have a `rental_date` and a `return_date`. It has one column, `rental_period`, of type `tsrange` (a range of timestamps). It stores from when to when the DVD was out:

```sql run
SELECT rental_id, rental_period
FROM rental
ORDER BY rental_id
LIMIT 3;
```

`[` means "including the start" and `)` means "excluding the end". Take a range apart with `lower()` and `upper()`. A film that has not come back has no end, so `upper()` is `NULL`:

```sql run
SELECT rental_id,
       lower(rental_period) AS rented_at,
       upper(rental_period) AS returned_at,
       upper(rental_period) - lower(rental_period) AS kept_for
FROM rental
WHERE upper(rental_period) IS NOT NULL
ORDER BY rental_id
LIMIT 3;
```

The operator `@>` asks "does this range contain that moment?". Which rentals were out at noon on 1 June 2005?

```sql run
SELECT COUNT(*) AS out_at_noon
FROM rental
WHERE rental_period @> timestamp '2005-06-01 12:00';
```

## Try it yourself

Show the weekday name of each payment, and the last day of each payment's month (`date_trunc('month', payment_date) + interval '1 month - 1 day'`).

## Watch out

### timestamp versus timestamptz

`timestamp` stores exactly what you give it. `timestamptz` converts to UTC on the way in and back to the session's time zone on the way out, so it means the same moment for everyone. For the moment something happened, prefer `timestamptz`. (The tables here use plain `timestamp`.)

### Adding months can land on a shorter month

Adding a month to 31 January cannot give 31 February, so PostgreSQL gives the last day of the shorter month:

```sql run
SELECT date '2007-01-31' + interval '1 month' AS result;
```

### Subtracting dates gives days, subtracting timestamps gives an interval

`date - date` is a whole number of days. `timestamp - timestamp` is an `interval` such as `2 days 03:15:00`. To turn an interval into hours, use `EXTRACT(epoch FROM interval) / 3600`.

### Never compare dates as text

Always write dates as `'YYYY-MM-DD'`. PostgreSQL rejects a value it cannot read (for example month 15) rather than guessing, but an ambiguous one such as `'03/04/2007'` is read according to the `DateStyle` setting.

### `now()` changes every time

Any query with `now()` or `current_date` returns something different tomorrow. That is fine for live reports, and bad for tests. Inside a transaction, `now()` is frozen at the transaction's start.

## Interview corner

**"What is the difference between `timestamp` and `timestamptz`?"**
`timestamptz` stores an exact moment (converted to UTC) and displays it in the session's time zone. `timestamp` stores a plain date-and-time with no zone, and does no conversion.

**"How do you find the number of days between two dates?"**
Subtract them: `later::date - earlier::date`.

**"How do you group rows by month?"**
`GROUP BY date_trunc('month', column)`, or `to_char(column, 'YYYY-MM')` when you want a text label.

**"How would you get all rows from last month?"**
Use a half-open range on the column: `>= date_trunc('month', now() - interval '1 month') AND < date_trunc('month', now())`.

## Practice

### Warm-up: what weekday?

Show each payment's `payment_id` and the weekday name on which it was made, as `weekday` (use `trim(to_char(payment_date, 'Day'))`), ordered by `payment_id`. Show the first rows.

```sql practice
-- hint: `trim(to_char(payment_date, 'Day'))` removes the padding `Day` adds.
SELECT payment_id, trim(to_char(payment_date, 'Day')) AS weekday
FROM payment
ORDER BY payment_id;
```

### Core: how long?

For every rental that has been returned, show `rental_id` and the number of **whole hours** the film was kept, as `hours_kept` (use `floor(EXTRACT(epoch FROM upper(rental_period) - lower(rental_period)) / 3600)`). Order by `rental_id`. Show the first rows.

```sql practice
-- hint: The gap is `upper(rental_period) - lower(rental_period)`; `EXTRACT(epoch FROM ...)` turns it into seconds.
SELECT rental_id,
       floor(EXTRACT(epoch FROM upper(rental_period) - lower(rental_period)) / 3600) AS hours_kept
FROM rental
WHERE upper(rental_period) IS NOT NULL
ORDER BY rental_id;
```

### Stretch: rentals per month

Show each month in which rentals started (as `month`, in the form `YYYY-MM`) and how many rentals started in it (`rentals`), in month order.

```sql practice
-- hint: Group by `to_char(lower(rental_period), 'YYYY-MM')`.
SELECT to_char(lower(rental_period), 'YYYY-MM') AS month, COUNT(*) AS rentals
FROM rental
GROUP BY 1
ORDER BY 1;
```
