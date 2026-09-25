---
title: "MIN and MAX"
order: 0
---

`MIN` returns the smallest value in a column, and `MAX` returns the largest. They work on numbers, dates and text.

## What you'll learn

- `MIN` and `MAX` on numbers, dates and text
- Combining them with `WHERE`
- Finding the *row* that holds the highest or lowest value

## Syntax

```sql show
SELECT MIN(column), MAX(column)
FROM table_name;
```

## Examples

### Numbers

```sql run
SELECT MIN(length) AS shortest, MAX(length) AS longest
FROM film;
```

### Dates

The first and last rental in the database:

```sql run
SELECT MIN(rental_date) AS first_rental, MAX(rental_date) AS last_rental
FROM rental;
```

### Text

For text, `MIN` and `MAX` use alphabetical order:

```sql run
SELECT MIN(title) AS first_title, MAX(title) AS last_title
FROM film;
```

### With a filter

The longest film that is rated G:

```sql run
SELECT MAX(length) AS longest_g_film
FROM film
WHERE rating = 'G';
```

## Try it yourself

Find the cheapest and most expensive `replacement_cost`, and the earliest and latest `payment_date`.

## Watch out

### The title of the longest film is not `MAX(length)`

A very common mistake: `SELECT title, MAX(length)` does not return the longest film's title.

```sql run error
SELECT title, MAX(length)
FROM film;
```

MySQL rejects it, because `MAX` gives one number for the whole table while `title` has one value per row. To get the row, ask for it in order:

```sql run
SELECT title, length
FROM film
ORDER BY length DESC, title
LIMIT 1;
```

Or filter for the maximum with a subquery (Module 8):

```sql run
SELECT title, length
FROM film
WHERE length = (SELECT MAX(length) FROM film)
ORDER BY title;
```

The second form returns **every** film that ties for the top length, while `LIMIT 1` returns just one.

### NULLs are ignored

`MIN` and `MAX` skip `NULL` values. Over a column that is entirely `NULL`, they return `NULL`:

```sql run
SELECT MAX(original_language_id) AS max_original_language
FROM film;
```

## Interview corner

**"How do you find the row with the highest value?"**
Either `ORDER BY column DESC LIMIT 1` (one row, ties cut arbitrarily) or `WHERE column = (SELECT MAX(column) ...)` (all ties). Never `SELECT title, MAX(x)`.

**"Do `MIN` and `MAX` work on text and dates?"**
Yes: text in alphabetical order, dates chronologically.

## Practice

### Warm-up: price range

Return the lowest and highest `replacement_cost` as `cheapest` and `dearest`.

```sql practice
-- hint: `MIN(replacement_cost)` and `MAX(replacement_cost)`.
SELECT MIN(replacement_cost) AS cheapest, MAX(replacement_cost) AS dearest
FROM film;
```

### Core: the payment window

Return the date-time of the first and last payment, as `first_payment` and `last_payment`.

```sql practice
-- hint: `MIN` and `MAX` work on dates.
SELECT MIN(payment_date) AS first_payment, MAX(payment_date) AS last_payment
FROM payment;
```

### Stretch: the longest films

Show the `title` and `length` of **every** film that is as long as the longest film. Order by title.

```sql practice
-- hint: Compare `length` with `(SELECT MAX(length) FROM film)`.
SELECT title, length
FROM film
WHERE length = (SELECT MAX(length) FROM film)
ORDER BY title;
```
