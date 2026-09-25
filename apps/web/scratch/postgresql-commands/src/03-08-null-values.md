---
title: "NULL Values"
order: 0
---

`NULL` means "no value" or "unknown". It is not zero, and it is not an empty string. It needs special handling, and it is behind more SQL bugs than any other idea.

## What you'll learn

- What `NULL` is, and how it differs from `0` and `''`
- `IS NULL` and `IS NOT NULL`
- How `NULL` behaves in comparisons and calculations
- How aggregate functions treat `NULL`

## Syntax

```sql show
SELECT column1
FROM table_name
WHERE column1 IS NULL;

SELECT column1
FROM table_name
WHERE column1 IS NOT NULL;
```

## Examples

### NULL is not the same as empty text

The `address` table has a second address line (`address2`). Some addresses have a real `NULL` there, and others have an empty string `''`. They are different things:

```sql run
SELECT
  COUNT(*) FILTER (WHERE address2 IS NULL) AS real_null,
  COUNT(*) FILTER (WHERE address2 = '') AS empty_string,
  COUNT(*) AS total
FROM address;
```

A query for one does not find the other.

### IS NULL

Rentals that have not been returned yet have no end to their `rental_period`. `upper(rental_period)` is the return time:

```sql run
SELECT rental_id, upper(rental_period) AS returned_at
FROM rental
WHERE upper(rental_period) IS NULL
ORDER BY rental_id
LIMIT 5;
```

### IS NOT NULL

Rentals that have been returned:

```sql run
SELECT COUNT(*) AS returned
FROM rental
WHERE upper(rental_period) IS NOT NULL;
```

### NULL in calculations

Any calculation that involves `NULL` gives `NULL`:

```sql run
SELECT 5 + NULL AS sum_with_null, 'abc' || NULL AS joined_with_null, NULL > 3 AS compared, NULL IS NULL AS is_null;
```

### Aggregates skip NULL

`COUNT(*)` counts rows. `COUNT(column)` counts only rows where the column is **not** `NULL`:

```sql run
SELECT COUNT(*) AS all_rentals, COUNT(upper(rental_period)) AS returned
FROM rental;
```

The difference between the two numbers is exactly the number of unreturned rentals.

## Try it yourself

Count the addresses where `address2` is `NULL`, then the ones where it is `''`. Then find the customers with a missing email (there are none in this database; try it anyway).

## Watch out

### `= NULL` never works

Comparing anything to `NULL` with `=` gives `NULL` (unknown), and `WHERE` keeps only true rows:

```sql run
SELECT COUNT(*) AS found
FROM rental
WHERE upper(rental_period) = NULL;
```

Zero rows, although some rentals do have no return time. Always write `IS NULL`.

### NULL breaks "everything else" filters

`upper(rental_period) <> '2005-06-01'` does **not** return the rows where it is `NULL`, because "unknown is not equal to that date" is also unknown. If you want them, ask for them, or use the NULL-safe `IS DISTINCT FROM`:

```sql run
SELECT
  (SELECT COUNT(*) FROM rental WHERE upper(rental_period) <> '2005-06-01') AS not_equal,
  (SELECT COUNT(*) FROM rental WHERE upper(rental_period) IS DISTINCT FROM '2005-06-01') AS distinct_from;
```

### An empty string is not NULL

`WHERE address2 IS NULL` misses every address that stores `''`. Know which one your data uses. (Oracle treats them as the same thing; PostgreSQL does not.)

## Interview corner

**"What is the difference between `NULL`, `0` and an empty string?"**
`0` is a number, `''` is text with no characters, and `NULL` means the value is unknown or missing. Only `NULL` is skipped by aggregates and needs `IS NULL` to test.

**"What is the difference between `COUNT(*)` and `COUNT(column)`?"**
`COUNT(*)` counts every row. `COUNT(column)` counts the rows where that column is not `NULL`.

**"Why does `WHERE col = NULL` return nothing?"**
`= NULL` yields unknown for every row, and `WHERE` only keeps rows that are true. Use `IS NULL`.

## Practice

### Warm-up: not yet returned

Count the rentals that have not been returned. Return one number, `not_returned`.

```sql practice
-- hint: `upper(rental_period) IS NULL`.
SELECT COUNT(*) AS not_returned
FROM rental
WHERE upper(rental_period) IS NULL;
```

### Core: addresses with a true NULL

Show `address_id` and `address` of every address whose `address2` is `NULL`, ordered by `address_id`. Show the first rows.

```sql practice
-- hint: `address2 IS NULL`.
SELECT address_id, address
FROM address
WHERE address2 IS NULL
ORDER BY address_id;
```

### Stretch: missing or blank

Count the addresses whose `address2` is **either** `NULL` **or** an empty string. Return one number, `no_second_line`.

```sql practice
-- hint: `address2 IS NULL OR address2 = ''`.
SELECT COUNT(*) AS no_second_line
FROM address
WHERE address2 IS NULL OR address2 = '';
```
