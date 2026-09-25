---
title: "Dates and Times"
order: 0
---

Dates are everywhere: when a rental happened, when a payment was made, how long a customer kept a film. MySQL has good tools for them, and a few traps.

## What you'll learn

- The date and time data types
- Pulling parts out of a date: `YEAR`, `MONTH`, `DAYNAME`, `EXTRACT`
- Formatting: `DATE_FORMAT`
- Date arithmetic: `DATE_ADD`, `DATEDIFF`, `TIMESTAMPDIFF`
- Getting the current date and time

## The date types

| Type | Stores | Example |
|---|---|---|
| `DATE` | a day | `2005-06-15` |
| `TIME` | a time of day | `14:30:00` |
| `DATETIME` | a day and a time | `2005-06-15 14:30:00` |
| `TIMESTAMP` | a moment in time, stored in UTC and shown in your time zone | `2005-06-15 14:30:00` |
| `YEAR` | a year | `2005` |

## Syntax

```sql show
SELECT YEAR(date_column), DATE_FORMAT(date_column, '%d %M %Y')
FROM table_name;
```

## Examples

### The current date and time

```sql show
SELECT NOW();        -- date and time right now
SELECT CURDATE();    -- today's date
SELECT CURTIME();    -- the time right now
```

(These change every time you run them, so the examples below use fixed dates from the database, and their results never change.)

### Pulling out the parts

```sql run
SELECT rental_id,
       rental_date,
       YEAR(rental_date) AS year,
       MONTH(rental_date) AS month,
       DAYNAME(rental_date) AS weekday,
       HOUR(rental_date) AS hour
FROM rental
ORDER BY rental_id;
```

`EXTRACT(part FROM date)` does the same in the standard SQL way:

```sql run
SELECT EXTRACT(YEAR FROM '2005-06-15') AS year, EXTRACT(MONTH FROM '2005-06-15') AS month;
```

### Formatting

`DATE_FORMAT` turns a date into text in the shape you choose:

```sql run
SELECT DATE_FORMAT('2005-06-15 14:30:00', '%W %d %M %Y, %H:%i') AS pretty;
```

| Code | Means |
|---|---|
| `%Y` / `%y` | year: 2005 / 05 |
| `%M` / `%m` | month name / number |
| `%d` | day of the month |
| `%W` | weekday name |
| `%H` / `%i` | hour (24h) / minutes |

### Adding and subtracting time

```sql run
SELECT DATE_ADD('2005-06-15', INTERVAL 10 DAY) AS plus_ten_days,
       DATE_SUB('2005-06-15', INTERVAL 1 MONTH) AS minus_one_month;
```

Here is each rental's due date: the rental date plus the film's `rental_duration` in days. That needs two tables, so it is a preview of Module 7:

```sql run
SELECT r.rental_id, r.rental_date, DATE_ADD(r.rental_date, INTERVAL f.rental_duration DAY) AS due_date
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film f ON f.film_id = i.film_id
ORDER BY r.rental_id;
```

### The gap between two dates

`DATEDIFF` returns whole days between two dates. `TIMESTAMPDIFF` lets you choose the unit:

```sql run
SELECT DATEDIFF('2005-06-15', '2005-06-01') AS days_apart,
       TIMESTAMPDIFF(HOUR, '2005-06-01 08:00:00', '2005-06-02 10:30:00') AS hours_apart;
```

How long a customer kept each returned film, in days:

```sql run
SELECT rental_id, rental_date, return_date, DATEDIFF(return_date, rental_date) AS days_kept
FROM rental
WHERE return_date IS NOT NULL
ORDER BY rental_id;
```

## Try it yourself

Show the day of the week each payment was made on, and the last day of the month of each `rental_date` (`LAST_DAY()`).

## Watch out

### Adding months can land on a shorter month

Adding a month to 31 January cannot give 31 February, so MySQL gives the last day of February:

```sql run
SELECT DATE_ADD('2005-01-31', INTERVAL 1 MONTH) AS one_month_later;
```

### DATEDIFF ignores the time of day

`DATEDIFF` compares dates only, so `23:59` on one day and `00:01` on the next counts as **1** day even though only two minutes have passed. Use `TIMESTAMPDIFF` when the time matters.

### Never compare dates as text

Always write dates as `'YYYY-MM-DD'`. A format such as `'15/06/2005'` is not understood and silently gives wrong results.

### `NOW()` changes every time

Any query with `NOW()` or `CURDATE()` returns something different tomorrow. That is fine for live reports, and bad for tests. Keep this in mind.

## Interview corner

**"What is the difference between `DATETIME` and `TIMESTAMP`?"**
`TIMESTAMP` is stored as a UTC moment and converted to the session's time zone when read, and it only covers 1970 to January 2038. `DATETIME` stores exactly what you give it with no conversion, and covers years 1000 to 9999.

**"How do you find the number of days between two dates?"**
`DATEDIFF(later, earlier)`.

**"How would you get all rows from last month?"**
Use a half-open range on the date column, such as `>= first_day_of_last_month AND < first_day_of_this_month`, so it works for `DATETIME` columns too.

## Practice

### Warm-up: what weekday?

Show each payment's `payment_id` and the weekday name on which it was made, as `weekday`, ordered by `payment_id`.

```sql practice
-- hint: `DAYNAME(payment_date)`.
SELECT payment_id, DAYNAME(payment_date) AS weekday
FROM payment
ORDER BY payment_id;
```

### Core: how long?

For every rental that has been returned, show `rental_id` and the number of **whole hours** between `rental_date` and `return_date` as `hours_kept`. Order by `rental_id`.

```sql practice
-- hint: `TIMESTAMPDIFF(HOUR, rental_date, return_date)`.
SELECT rental_id, TIMESTAMPDIFF(HOUR, rental_date, return_date) AS hours_kept
FROM rental
WHERE return_date IS NOT NULL
ORDER BY rental_id;
```

### Stretch: month of the year

Show each different month name in which rentals happened, with its month number, ordered by month number. Return `month_number` and `month_name`.

```sql practice
-- hint: Use `SELECT DISTINCT MONTH(rental_date), MONTHNAME(rental_date)` and order by the number.
SELECT DISTINCT MONTH(rental_date) AS month_number, MONTHNAME(rental_date) AS month_name
FROM rental
ORDER BY month_number;
```
