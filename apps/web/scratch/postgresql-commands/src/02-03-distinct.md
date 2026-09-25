---
title: "SELECT DISTINCT"
order: 0
---

`SELECT DISTINCT` removes duplicate rows from the result, so each different value appears only once. PostgreSQL also has a special form, `DISTINCT ON`, that keeps one row per group.

## What you'll learn

- Listing the different values in a column
- `DISTINCT` on more than one column
- Counting different values
- `DISTINCT ON`: one row per group (PostgreSQL only)

## Syntax

```sql show
SELECT DISTINCT column1, column2
FROM table_name;

SELECT DISTINCT ON (column1) column1, column2
FROM table_name
ORDER BY column1, column2;
```

## Examples

### The different values in a column

The `film` table has {{= SELECT COUNT(*) FROM film }} rows, but only a few ratings. Without `DISTINCT` you see one rating per film:

```sql run
SELECT rating
FROM film;
```

With `DISTINCT`, each rating appears once (the order is that of the `mpaa_rating` enum type, which you will meet in Module 13):

```sql run
SELECT DISTINCT rating
FROM film
ORDER BY rating;
```

### DISTINCT on several columns

With more than one column, `DISTINCT` removes rows where the **whole combination** repeats. The different pairs of rating and rental price:

```sql run
SELECT DISTINCT rating, rental_rate
FROM film
ORDER BY rating, rental_rate;
```

### Counting different values

Wrap the column in `COUNT(DISTINCT ...)` to count them:

```sql run
SELECT COUNT(DISTINCT rating) AS ratings, COUNT(DISTINCT rental_rate) AS prices
FROM film;
```

### DISTINCT ON: the first row of each group

`DISTINCT ON (rating)` keeps **one row per rating**: the first one in the `ORDER BY`. The `ORDER BY` must start with the same column. Here, the longest film of each rating:

```sql run
SELECT DISTINCT ON (rating) rating, title, length
FROM film
ORDER BY rating, length DESC, title;
```

This is a short way to answer "top one per group" questions. Other databases need a window function for it (Module 8).

## Try it yourself

Find the different `rental_duration` values in `film`, and the different `district` values in `address`.

## Watch out

### DISTINCT applies to the whole row

`SELECT DISTINCT rating, title` does not give one row per rating, because every title is different. `DISTINCT` looks at the combination of all the selected columns:

```sql run
SELECT COUNT(*) AS rows_returned
FROM (SELECT DISTINCT rating, title FROM film) AS pairs;
```

Every film stays, since each title is unique.

### NULL counts as a value

`DISTINCT` treats all `NULL`s as the same value, and returns one `NULL` row. In this database, `original_language_id` is empty for every film:

```sql run
SELECT DISTINCT original_language_id
FROM film;
```

### DISTINCT ON needs a matching ORDER BY

If the `ORDER BY` does not start with the `DISTINCT ON` column, PostgreSQL refuses:

```sql run error
SELECT DISTINCT ON (rating) rating, title
FROM film
ORDER BY title;
```

### DISTINCT is not a free fix

Adding `DISTINCT` to hide unexpected duplicates covers up a problem, often a badly written join. Find out why duplicates appear before removing them.

## Interview corner

**"What is the difference between `DISTINCT` and `GROUP BY`?"**
For plain de-duplication they give the same result. `GROUP BY` also lets you compute something per group (counts, sums), which `DISTINCT` cannot. You will learn `GROUP BY` in Module 5.

**"What does `DISTINCT ON` do?"**
It keeps only the first row of each group of rows that share the given columns, where "first" is decided by the `ORDER BY`. It is PostgreSQL-specific.

**"Does `DISTINCT` apply to one column or to the whole row?"**
To the whole selected row, meaning the combination of all the columns listed.

## Practice

### Warm-up: different lengths of rental

Show the different values of `rental_duration` in `film`, from smallest to largest.

```sql practice
-- hint: `SELECT DISTINCT` plus `ORDER BY`.
SELECT DISTINCT rental_duration
FROM film
ORDER BY rental_duration;
```

### Core: districts

Show the different `district` values in the `address` table, alphabetically.

```sql practice
-- hint: Same idea, on the `address` table.
SELECT DISTINCT district
FROM address
ORDER BY district;
```

### Stretch: the shortest film of each rating

Using `DISTINCT ON`, show the `rating`, `title` and `length` of the shortest film of each rating (break ties by title). Order by rating.

```sql practice
-- hint: `DISTINCT ON (rating)`, with `ORDER BY rating, length, title`.
SELECT DISTINCT ON (rating) rating, title, length
FROM film
ORDER BY rating, length, title;
```
