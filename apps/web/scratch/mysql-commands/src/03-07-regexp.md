---
title: "REGEXP"
order: 0
---

`REGEXP` matches text against a **regular expression**, a small pattern language that is far more powerful than `LIKE`'s two wildcards.

## What you'll learn

- Anchors (`^` and `$`)
- Alternatives (`|`) and character sets (`[ ]`)
- When to use `REGEXP` and when `LIKE` is enough

## Syntax

```sql show
SELECT column1
FROM table_name
WHERE column REGEXP 'pattern';
```

`RLIKE` is another name for `REGEXP`, and `REGEXP_LIKE(column, 'pattern')` is the function form.

| Pattern | Meaning |
|---|---|
| `^` | start of the text |
| `$` | end of the text |
| `.` | any one character |
| `\|` | either the pattern before or the one after |
| `[abc]` | one of the characters a, b or c |
| `[^abc]` | any character except a, b or c |
| `*` `+` `?` | zero or more, one or more, zero or one of the thing before |

## Examples

### Either of two words

Titles containing `LOVE` or `HATE`:

```sql run
SELECT title
FROM film
WHERE title REGEXP 'LOVE|HATE'
ORDER BY title;
```

### Starts with a vowel

```sql run
SELECT title
FROM film
WHERE title REGEXP '^[AEIOU]'
ORDER BY title;
```

### Starts with X, ends with Y

```sql run
SELECT title
FROM film
WHERE title REGEXP '^[A-Z].*[Y]$'
ORDER BY title;
```

`.*` means "any characters, any number of times".

### The function form

```sql run
SELECT title
FROM film
WHERE REGEXP_LIKE(title, '^(ZO|ZI)')
ORDER BY title;
```

## Try it yourself

Find actors whose last name ends with `SON`, or films whose title starts with `A` and ends with `R`.

## Watch out

### `REGEXP` is not anchored

Unlike `LIKE`, which must match the whole value, `REGEXP` matches **anywhere** in the text unless you add `^` or `$`:

```sql run
SELECT COUNT(*) AS anywhere FROM film WHERE title REGEXP 'AGE';
SELECT COUNT(*) AS at_start FROM film WHERE title REGEXP '^AGE';
```

### Backslashes are doubled in a string

In a MySQL string, `\` is itself an escape character. To send one backslash to the regex engine you write two: `'\\d'` for a digit.

### It cannot use an index

`REGEXP` reads every row. If `LIKE 'ZO%'` does the job, use `LIKE`.

## Interview corner

**"What is the difference between `LIKE` and `REGEXP`?"**
`LIKE` has two wildcards (`%` and `_`) and must match the whole value. `REGEXP` supports full regular expressions and matches anywhere in the value.

**"Which version of `REGEXP` does MySQL 8 use?"**
It uses the ICU library (Unicode-aware), and is case-insensitive by default for the default collation.

## Practice

### Warm-up: either word

Show the `title` of every film whose title contains `DOG` or `CAT`, alphabetically.

```sql practice
-- hint: `REGEXP 'DOG|CAT'`. The `|` means "or".
SELECT title
FROM film
WHERE title REGEXP 'DOG|CAT'
ORDER BY title;
```

### Core: ends with `ER`

Show the `title` of every film that ends with `ER`, alphabetically.

```sql practice
-- hint: Anchor to the end with `$`.
SELECT title
FROM film
WHERE title REGEXP 'ER$'
ORDER BY title;
```

### Stretch: no vowel start, three-letter first word

Show the `title` of every film that does **not** start with a vowel and whose first word has exactly three letters (so the fourth character is a space). Alphabetical order.

```sql practice
-- hint: `'^[^AEIOU][A-Z]{2} '` means: a non-vowel, two letters, then a space.
SELECT title
FROM film
WHERE title REGEXP '^[^AEIOU][A-Z]{2} '
ORDER BY title;
```
