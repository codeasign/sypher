---
title: "LIKE and Wildcards"
order: 0
---

`LIKE` matches text against a pattern. Two wildcard characters let you say "anything can go here".

## What you'll learn

- The `%` and `_` wildcards
- Starts with, ends with, contains
- Matching a literal `%` or `_`

## Syntax

```sql show
SELECT column1
FROM table_name
WHERE column LIKE pattern;
```

| Wildcard | Matches |
|---|---|
| `%` | any number of characters, including none |
| `_` | exactly one character |

## Examples

### Starts with

Film titles that start with `ZO`:

```sql run
SELECT title
FROM film
WHERE title LIKE 'ZO%'
ORDER BY title;
```

### Ends with

Titles that end with `LOVE`:

```sql run
SELECT title
FROM film
WHERE title LIKE '%LOVE'
ORDER BY title;
```

### Contains

Titles with `LOVE` anywhere in them:

```sql run
SELECT title
FROM film
WHERE title LIKE '%LOVE%'
ORDER BY title;
```

### One character at a time

`_` stands for exactly one character. Titles whose *second* letter is `A`:

```sql run
SELECT title
FROM film
WHERE title LIKE '_A%'
ORDER BY title;
```

Actors with a first name of exactly three letters:

```sql run
SELECT first_name, last_name
FROM actor
WHERE first_name LIKE '___'
ORDER BY first_name, last_name;
```

## Try it yourself

Find the films with `DOG` anywhere in the title, and the customers whose first name ends in `Y`.

## Watch out

### LIKE ignores case (usually)

It follows the column's collation, and MySQL's default ignores case. So `LIKE 'zo%'` finds `ZORRO ARK` too.

### A leading wildcard is slow

`LIKE 'ZO%'` can use an index on the column, because the start of the value is known. `LIKE '%LOVE%'` cannot: MySQL must read every row. On a table with millions of rows, that hurts.

### Matching a real percent sign

To search for a literal `%` or `_`, put a backslash before it:

```sql run
SELECT 'discount 50%' LIKE '%50\%' AS ends_with_50_percent,
       'discount 500' LIKE '%50\%' AS wrongly_matches;
```

### LIKE never matches NULL

A `NULL` value matches no pattern, including `'%'`. Use `IS NULL` for empty values.

## Interview corner

**"What is the difference between `%` and `_`?"**
`%` matches any number of characters (zero or more); `_` matches exactly one.

**"Why is `LIKE '%text%'` slow?"**
A pattern that starts with a wildcard cannot use a normal (B-tree) index, so MySQL scans the whole table. For heavy text search, use a `FULLTEXT` index instead.

**"How would you find rows where a column contains a literal underscore?"**
Escape it: `LIKE '%\_%'`.

## Practice

### Warm-up: titles starting with B

Show the `title` of every film that starts with `B`, ordered alphabetically.

```sql practice rows=5
-- hint: `LIKE 'B%'`.
SELECT title
FROM film
WHERE title LIKE 'B%'
ORDER BY title;
```

### Core: names ending in `EN`

Show the `first_name` and `last_name` of actors whose first name ends in `EN`. Order by first name, then last name.

```sql practice
-- hint: The wildcard goes at the beginning: `'%EN'`.
SELECT first_name, last_name
FROM actor
WHERE first_name LIKE '%EN'
ORDER BY first_name, last_name;
```

### Stretch: a pattern in the middle

Show the `title` of every film whose **third and fourth** letters are `DR` (two letters of anything, then `DR`, then anything else). Order alphabetically.

```sql practice
-- hint: Two `_` wildcards stand for the first two letters, then `DR`, then `%`.
SELECT title
FROM film
WHERE title LIKE '__DR%'
ORDER BY title;
```
