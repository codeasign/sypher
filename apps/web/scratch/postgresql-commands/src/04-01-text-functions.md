---
title: "Text Functions"
order: 0
---

A function takes a value in, does something to it, and gives a value back. Text functions clean, join, cut and inspect strings, and they come up in almost every real query.

## What you'll learn

- Joining text: `||`, `concat`, `concat_ws`
- Changing case and trimming: `upper`, `lower`, `initcap`, `trim`
- Measuring: `length`, `char_length`
- Cutting: `left`, `right`, `substring`, `split_part`
- Searching and replacing: `strpos`, `replace`

## Syntax

```sql show
SELECT function_name(value, ...);
```

You can use a function anywhere you can use a value: in `SELECT`, in `WHERE`, in `ORDER BY`.

## Examples

### Joining text

`||` glues values together, and `concat` does the same:

```sql run
SELECT first_name || ' ' || last_name AS with_bars,
       concat(first_name, ' ', last_name) AS with_concat
FROM customer
ORDER BY customer_id
LIMIT 3;
```

`concat_ws` ("with separator") puts the same separator between every value, so you type it once:

```sql run
SELECT concat_ws(', ', last_name, first_name, email) AS contact
FROM customer
ORDER BY customer_id
LIMIT 3;
```

### Upper, lower and proper case

This database stores names in capitals. `initcap` turns `MARY SMITH` into `Mary Smith`:

```sql run
SELECT first_name, initcap(first_name) AS proper, lower(first_name) AS small, upper('hello') AS big
FROM customer
ORDER BY customer_id
LIMIT 3;
```

### Length

```sql run
SELECT title, length(title) AS characters
FROM film
ORDER BY characters DESC, title
LIMIT 3;
```

### Cutting text apart

`left(text, n)` gives the first `n` characters, `right(text, n)` the last `n`. `substring(text, start, count)` cuts from the middle; character positions start at **1**, not 0. `split_part(text, delimiter, n)` returns the n-th piece, which is perfect for an email's domain:

```sql run
SELECT email,
       left(email, 4) AS first_four,
       substring(email, 6, 3) AS middle,
       split_part(email, '@', 2) AS domain
FROM customer
ORDER BY customer_id
LIMIT 3;
```

### Finding and replacing

`strpos` returns the position of the first match, or `0` if there is none. `replace` swaps text:

```sql run
SELECT title,
       strpos(title, ' ') AS first_space_at,
       replace(title, ' ', '_') AS with_underscores
FROM film
ORDER BY film_id
LIMIT 3;
```

### Trimming and padding

`trim` removes spaces from both ends. Data typed by people often has stray spaces. `lpad` pads to a fixed width:

```sql run
SELECT '[' || trim('   padded   ') || ']' AS trimmed, lpad(customer_id::text, 6, '0') AS padded_id
FROM customer
ORDER BY customer_id
LIMIT 3;
```

## Try it yourself

Show each actor's name as `last_name, first_name` in proper case, and each film's title in lower case.

## Watch out

### `||` with a NULL gives NULL

If any piece is `NULL`, the whole `||` result is `NULL`. `concat` and `concat_ws` simply skip it:

```sql run
SELECT 'ab' || NULL AS with_bars, concat('ab', NULL, 'cd') AS with_concat, concat_ws('-', 'ab', NULL, 'cd') AS with_ws;
```

### `length` counts characters, not bytes

Unlike MySQL, `length('é')` is `1`. Use `octet_length` if you want bytes.

### CHAR columns are padded

A column declared `char(20)` (such as `language.name`) pads short values with spaces. The spaces are harmless in comparisons but appear when you print. Use `trim()` or `varchar`/`text`:

```sql run
SELECT length(name) AS as_stored, length(trim(name)) AS trimmed
FROM language
WHERE language_id = 1;
```

### Functions on a column can stop an index working

`WHERE upper(last_name) = 'SMITH'` computes `upper` for every row, so a plain index on `last_name` cannot be used. Module 14 shows the fix: an index on the expression.

## Interview corner

**"What is the difference between `||` and `concat`?"**
`||` returns `NULL` if any side is `NULL`. `concat` ignores `NULL` arguments. `concat_ws` also ignores them and adds a separator.

**"What is the difference between `length` and `octet_length`?"**
`length` counts characters and `octet_length` counts bytes. They differ for multi-byte characters.

**"How would you extract the domain from an email address?"**
`split_part(email, '@', 2)`.

## Practice

### Warm-up: full names

Show each customer's full name as `first_name last_name` (separated by a space), with the alias `full_name`, ordered by `customer_id`. Show the first rows.

```sql practice
-- hint: `first_name || ' ' || last_name`, or `concat_ws(' ', ...)`.
SELECT first_name || ' ' || last_name AS full_name
FROM customer
ORDER BY customer_id;
```

### Core: name badges

Show each customer's name as `Last, First` in proper case (only the first letter of each part in capitals), with the alias `badge`, ordered by `customer_id`. Show the first rows.

```sql practice
-- hint: `initcap(last_name) || ', ' || initcap(first_name)`.
SELECT initcap(last_name) || ', ' || initcap(first_name) AS badge
FROM customer
ORDER BY customer_id;
```

### Stretch: email domains

List the different email domains that customers use, in alphabetical order. (Counting how many customers use each needs `GROUP BY`, which comes in Module 5.)

```sql practice
-- hint: `split_part(email, '@', 2)` and `DISTINCT`.
SELECT DISTINCT split_part(email, '@', 2) AS domain
FROM customer
ORDER BY domain;
```
