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
WHERE column IS NULL;

SELECT column1
FROM table_name
WHERE column IS NOT NULL;
```

## Examples

### NULL is not the same as empty text

The `address` table has a second address line (`address2`). Some addresses have a real `NULL` there, and others have an empty string `''`. They are different things:

```sql run
SELECT
  SUM(address2 IS NULL) AS null_values,
  SUM(address2 = '') AS empty_strings,
  COUNT(*) AS total_addresses
FROM address;
```

Almost all of the addresses store an empty string, and only a few store a true `NULL`. A query for one does not find the other.

### IS NULL

Rentals that have not been returned yet have no `return_date`:

```sql run
SELECT rental_id, rental_date, return_date
FROM rental
WHERE return_date IS NULL
ORDER BY rental_id;
```

### IS NOT NULL

Rentals that have been returned:

```sql run
SELECT COUNT(*) AS returned_rentals
FROM rental
WHERE return_date IS NOT NULL;
```

### NULL in calculations

Any calculation that involves `NULL` gives `NULL`:

```sql run
SELECT 5 + NULL AS plus_null, NULL * 0 AS times_zero, CONCAT('a', NULL) AS joined;
```

### Aggregates skip NULL

`COUNT(*)` counts rows. `COUNT(column)` counts only rows where the column is **not** `NULL`:

```sql run
SELECT COUNT(*) AS all_rentals, COUNT(return_date) AS with_a_return_date
FROM rental;
```

The difference between the two numbers is exactly the number of unreturned rentals.

## Try it yourself

Count the addresses where `address2` is `NULL`, then the ones where it is `''`. Then find the customers with a missing email (there are none in this database; try it anyway).

## Watch out

### `= NULL` never works

Comparing anything to `NULL` with `=` gives `NULL` (unknown), and `WHERE` keeps only true rows:

```sql run
SELECT COUNT(*) AS wrong_way
FROM rental
WHERE return_date = NULL;
```

Zero rows, although some rentals do have no return date. Always write `IS NULL`.

### NULL breaks "everything else" filters

`return_date <> '2005-06-01'` does **not** return the rows where `return_date` is `NULL`, because "unknown is not equal to that date" is also unknown. If you want them, ask for them: `return_date <> '2005-06-01' OR return_date IS NULL`.

### An empty string is not NULL

`WHERE address2 IS NULL` misses every address that stores `''`. Know which one your data uses.

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
-- hint: `COUNT(*)` with `WHERE return_date IS NULL`.
SELECT COUNT(*) AS not_returned
FROM rental
WHERE return_date IS NULL;
```

### Core: addresses with a true NULL

Show `address_id` and `address` of every address whose `address2` is `NULL`, ordered by `address_id`.

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
-- hint: Combine `IS NULL` and `= ''` with `OR`.
SELECT COUNT(*) AS no_second_line
FROM address
WHERE address2 IS NULL OR address2 = '';
```
