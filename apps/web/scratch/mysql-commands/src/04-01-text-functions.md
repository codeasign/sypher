---
title: "Text Functions"
order: 0
---

A function takes a value in, does something to it, and gives a value back. Text functions clean, join, cut and inspect strings, and they come up in almost every real query.

## What you'll learn

- Joining text: `CONCAT`, `CONCAT_WS`
- Changing case and trimming: `UPPER`, `LOWER`, `TRIM`
- Measuring: `LENGTH`, `CHAR_LENGTH`
- Cutting: `LEFT`, `RIGHT`, `SUBSTRING`, `SUBSTRING_INDEX`
- Searching and replacing: `INSTR`, `REPLACE`

## Syntax

```sql show
SELECT FUNCTION_NAME(argument1, argument2)
FROM table_name;
```

You can use a function anywhere you can use a value: in `SELECT`, in `WHERE`, in `ORDER BY`.

## Examples

### Joining text

`CONCAT` glues values together:

```sql run
SELECT CONCAT(first_name, ' ', last_name) AS full_name
FROM customer
ORDER BY customer_id;
```

`CONCAT_WS` ("with separator") puts the same separator between every value, so you type it once:

```sql run
SELECT CONCAT_WS(', ', last_name, first_name) AS name_last_first
FROM customer
ORDER BY customer_id;
```

### Upper, lower and proper case

This database stores names in capitals. To show `MARY` as `Mary`, take the first letter in upper case and the rest in lower case:

```sql run
SELECT CONCAT(UPPER(LEFT(first_name, 1)), LOWER(SUBSTRING(first_name, 2))) AS proper_name
FROM customer
ORDER BY customer_id;
```

`LEFT(text, n)` gives the first `n` characters. `SUBSTRING(text, 2)` gives everything from the second character onward. Character positions start at **1**, not 0.

### Length

```sql run
SELECT title, CHAR_LENGTH(title) AS letters
FROM film
ORDER BY letters DESC, title;
```

### Cutting text apart

`SUBSTRING_INDEX(text, delimiter, n)` returns the part before the n-th delimiter. With `-1` it returns everything after the last one, which is perfect for an email's domain:

```sql run
SELECT email, SUBSTRING_INDEX(email, '@', -1) AS email_domain
FROM customer
ORDER BY customer_id;
```

### Finding and replacing

```sql run
SELECT title,
       INSTR(title, ' ') AS first_space_at,
       REPLACE(title, ' ', '_') AS with_underscores
FROM film
ORDER BY film_id;
```

`INSTR` returns the position of the first match, or `0` if there is none.

### Trimming

`TRIM` removes spaces from both ends. Data typed by people often has stray spaces:

```sql run
SELECT CONCAT('[', TRIM('   padded   '), ']') AS trimmed;
```

## Try it yourself

Show each actor's name as `last_name, first_name` in proper case, and each film's title in lower case.

## Watch out

### CONCAT with a NULL gives NULL

If any piece is `NULL`, the whole `CONCAT` result is `NULL`. `CONCAT_WS` simply skips it:

```sql run
SELECT CONCAT('a', NULL, 'b') AS concat_result,
       CONCAT_WS('-', 'a', NULL, 'b') AS concat_ws_result;
```

### LENGTH counts bytes, not characters

A letter such as `é` takes two bytes in UTF-8. `LENGTH` counts bytes and `CHAR_LENGTH` counts characters. For anything a person reads, use `CHAR_LENGTH`:

```sql run
SELECT LENGTH('é') AS bytes, CHAR_LENGTH('é') AS characters;
```

### Functions on a column can stop an index working

`WHERE UPPER(last_name) = 'SMITH'` has to compute `UPPER` for every row, so an index on `last_name` cannot be used. Since MySQL already compares text without regard to case, you rarely need `UPPER` in a `WHERE` at all.

## Interview corner

**"What is the difference between `CONCAT` and `CONCAT_WS`?"**
`CONCAT_WS` takes the separator as its first argument and skips `NULL` values. `CONCAT` returns `NULL` if any argument is `NULL`.

**"What is the difference between `LENGTH` and `CHAR_LENGTH`?"**
`LENGTH` returns bytes, and `CHAR_LENGTH` returns characters. They differ for multi-byte characters.

**"How would you extract the domain from an email address?"**
`SUBSTRING_INDEX(email, '@', -1)`.

## Practice

### Warm-up: full names

Show each customer's full name as `first_name last_name` (separated by a space), with the alias `full_name`, ordered by `customer_id`.

```sql practice
-- hint: `CONCAT(first_name, ' ', last_name)`.
SELECT CONCAT(first_name, ' ', last_name) AS full_name
FROM customer
ORDER BY customer_id;
```

### Core: name badges

Show each customer's name as `Last, First` in proper case (only the first letter of each part in capitals), with the alias `badge`, ordered by `customer_id`.

```sql practice
-- hint: Build the proper-case form of each name with UPPER(LEFT(...)) and LOWER(SUBSTRING(...)), then join with `', '`.
SELECT CONCAT(
         UPPER(LEFT(last_name, 1)), LOWER(SUBSTRING(last_name, 2)),
         ', ',
         UPPER(LEFT(first_name, 1)), LOWER(SUBSTRING(first_name, 2))
       ) AS badge
FROM customer
ORDER BY customer_id;
```

### Stretch: email domains

List the different email domains that customers use, in alphabetical order. (Counting how many customers use each needs `GROUP BY`, which comes in Module 6.)

```sql practice
-- hint: `SELECT DISTINCT SUBSTRING_INDEX(email, '@', -1) AS email_domain`.
SELECT DISTINCT SUBSTRING_INDEX(email, '@', -1) AS email_domain
FROM customer
ORDER BY email_domain;
```
