---
title: "SELECT DISTINCT"
order: 0
---

`SELECT DISTINCT` removes duplicate rows from the result, so each different value appears only once.

## What you'll learn

- Listing the different values in a column
- `DISTINCT` on more than one column
- Counting different values

## Syntax

```sql show
SELECT DISTINCT column1, column2
FROM table_name;
```

## Examples

### The different values in a column

The `film` table has {{= SELECT COUNT(*) FROM film }} rows, but only a few ratings. Without `DISTINCT` you see one rating per film:

```sql run
SELECT rating
FROM film;
```

With `DISTINCT`, each rating appears once:

```sql run
SELECT DISTINCT rating
FROM film;
```

### DISTINCT on several columns

With more than one column, `DISTINCT` removes rows where the **whole combination** repeats. Here are the different pairs of rating and rental price:

```sql run rows=6
SELECT DISTINCT rating, rental_rate
FROM film
ORDER BY rating, rental_rate;
```

### Counting different values

Wrap the column in `COUNT(DISTINCT ...)` to count them:

```sql run
SELECT COUNT(DISTINCT rating) AS different_ratings
FROM film;
```

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

### DISTINCT is not a free fix

Adding `DISTINCT` to hide unexpected duplicates covers up a problem, often a badly written join. Find out why duplicates appear before removing them.

## Interview corner

**"What is the difference between `DISTINCT` and `GROUP BY`?"**
For plain de-duplication they give the same result. `GROUP BY` also lets you compute something per group (counts, sums), which `DISTINCT` cannot. You will learn `GROUP BY` in Module 6.

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

```sql practice rows=6
-- hint: Same idea, on the `address` table.
SELECT DISTINCT district
FROM address
ORDER BY district;
```

### Stretch: how many different?

How many different last names do the customers have? Return one number called `different_last_names`.

```sql practice
-- hint: `COUNT(DISTINCT last_name)` on `customer`.
SELECT COUNT(DISTINCT last_name) AS different_last_names
FROM customer;
```
