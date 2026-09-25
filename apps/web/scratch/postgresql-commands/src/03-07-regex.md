---
title: "Regular Expressions"
order: 0
---

A **regular expression** is a small pattern language, far more powerful than `LIKE`'s two wildcards. PostgreSQL has operators for it, and a family of functions.

## What you'll learn

- The operators `~`, `~*`, `!~` and `!~*`
- Anchors (`^` and `$`), alternatives (`|`) and character sets (`[ ]`)
- `SIMILAR TO`, and the functions `regexp_replace` and `regexp_matches`
- When to use a regex and when `LIKE` is enough

## Syntax

```sql show
SELECT column1
FROM table_name
WHERE column1 ~ 'pattern';      -- matches, case-sensitive
WHERE column1 ~* 'pattern';     -- matches, ignoring case
WHERE column1 !~ 'pattern';     -- does not match
```

## Examples

### Either of two words

Titles containing `LOVE` or `HATE`:

```sql run
SELECT title
FROM film
WHERE title ~ 'LOVE|HATE'
ORDER BY title;
```

### Starts with a vowel

`^` anchors the match at the start, and `[AEIOU]` means "one of these letters":

```sql run
SELECT COUNT(*) AS vowel_titles
FROM film
WHERE title ~ '^[AEIOU]';
```

### Starts with X, ends with Y

`.*` means "any characters, any number of times":

```sql run
SELECT title
FROM film
WHERE title ~ '^X.*Y$'
ORDER BY title;
```

### Ignoring case

The `*` in `~*` makes the match case-insensitive:

```sql run
SELECT COUNT(*) AS found
FROM film
WHERE title ~* 'dog|cat';
```

### Replacing and extracting

`regexp_replace` rewrites text, and `substring(text from pattern)` pulls out the part that matches:

```sql run
SELECT title,
       regexp_replace(title, '[AEIOU]', '_', 'g') AS no_vowels,
       substring(title from '^[A-Z]+') AS first_word
FROM film
ORDER BY film_id
LIMIT 3;
```

The `'g'` flag means "every match", not just the first.

## Try it yourself

Find actors whose last name ends with `SON`, or films whose title starts with `A` and ends with `R`.

## Watch out

### A regex is not anchored

Unlike `LIKE`, which must match the whole value, a regex matches **anywhere** in the text unless you add `^` or `$`:

```sql run
SELECT
  (SELECT COUNT(*) FROM film WHERE title ~ 'ZO') AS anywhere,
  (SELECT COUNT(*) FROM film WHERE title ~ '^ZO') AS at_start;
```

### Backslashes and quotes

Standard strings keep backslashes as they are, so `'\d'` means a digit. If you use the `E'...'` string form, you must double them (`E'\\d'`).

### A regex cannot use a normal index

`~` reads every row. If `LIKE 'ZO%'` does the job, use `LIKE`. For fast regex searches, a `pg_trgm` index helps (Module 14).

### SIMILAR TO is rarely worth it

`SIMILAR TO` is the SQL-standard mix of `LIKE` and regex syntax. It is slower and less known than `~`, so most people avoid it.

## Interview corner

**"What is the difference between `LIKE` and `~`?"**
`LIKE` has two wildcards (`%` and `_`) and must match the whole value. `~` supports full regular expressions and matches anywhere in the value.

**"How do you do a case-insensitive regex match?"**
Use `~*`, or the `(?i)` flag inside the pattern.

**"How do you replace every match?"**
`regexp_replace(text, pattern, replacement, 'g')`. Without `'g'` only the first match is replaced.

## Practice

### Warm-up: either word

Show the `title` of every film whose title contains `DOG` or `CAT`, alphabetically.

```sql practice
-- hint: `~ 'DOG|CAT'`. The `|` means "or".
SELECT title
FROM film
WHERE title ~ 'DOG|CAT'
ORDER BY title;
```

### Core: ends with `ER`

Show the `title` of every film that ends with `ER`, alphabetically.

```sql practice
-- hint: `~ 'ER$'`.
SELECT title
FROM film
WHERE title ~ 'ER$'
ORDER BY title;
```

### Stretch: no vowel start, three-letter first word

Show the `title` of every film that does **not** start with a vowel and whose first word has exactly three letters (so the fourth character is a space). Alphabetical order.

```sql practice
-- hint: `!~ '^[AEIOU]'` and `~ '^... '` (three dots, then a space).
SELECT title
FROM film
WHERE title !~ '^[AEIOU]' AND title ~ '^... '
ORDER BY title;
```
