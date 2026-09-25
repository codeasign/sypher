---
title: "ANY and ALL"
order: 0
---

`ANY` and `ALL` compare a value against **every value a subquery returns**. `ANY` means "at least one of them", and `ALL` means "every one of them".

## What you'll learn

- `> ANY`, `< ALL`, `= ANY` and friends
- How they relate to `MIN`, `MAX` and `IN`

## Syntax

```sql show
SELECT columns
FROM table_name
WHERE column operator ANY (SELECT column FROM other_table);

SELECT columns
FROM table_name
WHERE column operator ALL (SELECT column FROM other_table);
```

`operator` is a comparison such as `=`, `>`, `<`, `>=`, `<>`.

## Examples

### > ALL: bigger than every value

Films longer than **every** NC-17 film, meaning longer than the longest NC-17 film (184 minutes):

```sql run
SELECT title, length
FROM film
WHERE length > ALL (SELECT length FROM film WHERE rating = 'NC-17')
ORDER BY length, title;
```

That is the same as `length > (SELECT MAX(length) ...)`.

### > ANY: bigger than at least one value

Films longer than **at least one** G-rated film, meaning longer than the shortest G film:

```sql run
SELECT COUNT(*) AS films_longer_than_some_g_film
FROM film
WHERE length > ANY (SELECT length FROM film WHERE rating = 'G');
```

That is the same as `length > (SELECT MIN(...) ...)`.

### = ANY is IN

```sql run
SELECT COUNT(*) AS with_any FROM film WHERE rating = ANY (SELECT rating FROM film WHERE length > 180);
SELECT COUNT(*) AS with_in FROM film WHERE rating IN (SELECT rating FROM film WHERE length > 180);
```

## Try it yourself

Find the payments larger than **all** the payments of customer 1, and the films cheaper than **any** film of length over 180.

## Watch out

### `<> ANY` does not mean "not in"

`x <> ANY (list)` is true if `x` differs from **at least one** value, which is nearly always true. To say "not equal to any of them" you want `<> ALL` (or `NOT IN`):

```sql run
SELECT COUNT(*) AS not_equal_any, (SELECT COUNT(*) FROM film WHERE rating <> ALL (SELECT rating FROM film WHERE length > 180)) AS not_equal_all
FROM film
WHERE rating <> ANY (SELECT rating FROM film WHERE length > 180);
```

### ALL over an empty list is true

If the subquery returns no rows, `> ALL (...)` is true for every row, which can surprise you.

### They are rarely needed

`MAX`, `MIN` and `IN` are clearer for most cases. `ANY` and `ALL` are mainly good to understand for reading other people's SQL and for interviews.

## Interview corner

**"What is the difference between `ANY` and `ALL`?"**
`ANY` is true if the comparison holds for at least one value returned by the subquery; `ALL` only if it holds for every value.

**"How is `> ALL (subquery)` written without `ALL`?"**
`> (SELECT MAX(col) FROM ...)`. And `> ANY` is `> (SELECT MIN(col) FROM ...)`.

## Practice

### Warm-up: longer than every NC-17 film

How many films are longer than **all** NC-17 films? Return one number, `longer_than_all_nc17`.

```sql practice
-- hint: `length > ALL (SELECT length FROM film WHERE rating = 'NC-17')`.
SELECT COUNT(*) AS longer_than_all_nc17
FROM film
WHERE length > ALL (SELECT length FROM film WHERE rating = 'NC-17');
```

### Core: cheaper than some

Show the `title` and `rental_rate` of films whose `rental_rate` is **lower than at least one** film of length over 180 minutes (that is, lower than the highest rate among those long films). Order by title and show the first rows.

```sql practice rows=5
-- hint: `rental_rate < ANY (SELECT rental_rate FROM film WHERE length > 180)`.
SELECT title, rental_rate
FROM film
WHERE rental_rate < ANY (SELECT rental_rate FROM film WHERE length > 180)
ORDER BY title;
```
