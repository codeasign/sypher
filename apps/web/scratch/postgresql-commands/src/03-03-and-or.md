---
title: "AND and OR"
order: 0
---

`AND` and `OR` combine several conditions in one `WHERE`. `AND` keeps a row only if **all** conditions are true. `OR` keeps it if **any** condition is true.

## What you'll learn

- Combining conditions with `AND` and `OR`
- Which of the two runs first
- Using brackets to say what you mean

## Syntax

```sql show
SELECT column1
FROM table_name
WHERE condition1 AND condition2;

SELECT column1
FROM table_name
WHERE condition1 OR condition2;
```

## Examples

### AND

PG-rated films that are also shorter than an hour:

```sql run
SELECT title, rating, length
FROM film
WHERE rating = 'PG' AND length < 60
ORDER BY title;
```

Every extra `AND` makes the result *smaller*, because a row has to pass more tests.

### OR

Films that are rated G **or** rated PG:

```sql run
SELECT title, rating
FROM film
WHERE rating = 'G' OR rating = 'PG'
ORDER BY title;
```

Every extra `OR` makes the result *bigger*.

### Mixing them

Short films that are either G or PG. The brackets matter:

```sql run
SELECT title, rating, length
FROM film
WHERE (rating = 'G' OR rating = 'PG') AND length < 60
ORDER BY title;
```

## Try it yourself

Find films rated R **and** costing `4.99` to rent. Then change `AND` to `OR` and watch the number of rows grow.

## Watch out

### AND runs before OR

Without brackets, `a OR b AND c` means `a OR (b AND c)`. These two queries look almost the same but return different numbers of rows:

```sql run
SELECT
  (SELECT COUNT(*) FROM film WHERE rating = 'G' OR rating = 'PG' AND length < 60) AS without_brackets,
  (SELECT COUNT(*) FROM film WHERE (rating = 'G' OR rating = 'PG') AND length < 60) AS with_brackets;
```

The first query returns every G film (of any length) plus the short PG films, so it returns more. The second is what most people mean.

### `x = 1 OR 2` does not work as you'd hope

`WHERE rating = 'G' OR 'PG'` is not a valid way to test two values. Repeat the column (`rating = 'G' OR rating = 'PG'`), or use `IN`, which is the next page.

### NULL and OR

`NULL OR true` is true, but `NULL OR false` is unknown (`NULL`), and `WHERE` throws unknown rows away. Page 3.8 covers `NULL` in detail.

## Interview corner

**"What is the order of evaluation of `AND` and `OR`?"**
`AND` has higher precedence, so it is evaluated first. Use brackets to make the intent explicit.

**"You add another `OR` condition and get more rows. Why?"**
`OR` widens the result (a row needs to satisfy just one condition), while `AND` narrows it.

## Practice

### Warm-up: two conditions

Show the `title`, `rating` and `length` of films rated `R` that are longer than 150 minutes. Order by length descending, then title.

```sql practice
-- hint: `WHERE rating = 'R' AND length > 150`.
SELECT title, rating, length
FROM film
WHERE rating = 'R' AND length > 150
ORDER BY length DESC, title;
```

### Core: either of two prices

Show the `title` and `rental_rate` of films that cost `0.99` or `4.99` to rent. Alphabetical by title.

```sql practice
-- hint: Repeat the column on each side of the `OR`.
SELECT title, rental_rate
FROM film
WHERE rental_rate = 0.99 OR rental_rate = 4.99
ORDER BY title;
```

### Stretch: brackets

Show `title`, `rating` and `rental_rate` of films that are rated `NC-17` **or** `R`, **and** cost `0.99` to rent. Order by title.

```sql practice
-- hint: Put the two ratings in brackets so `AND` applies to both.
SELECT title, rating, rental_rate
FROM film
WHERE (rating = 'NC-17' OR rating = 'R') AND rental_rate = 0.99
ORDER BY title;
```
