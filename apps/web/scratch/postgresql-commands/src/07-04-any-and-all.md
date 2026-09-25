---
title: "ANY and ALL"
order: 0
---

`ANY` and `ALL` compare a value against **every value a subquery (or an array) returns**. `ANY` means "at least one of them", and `ALL` means "every one of them".

## What you'll learn

- `> ANY`, `< ALL`, `= ANY` and friends
- How they relate to `MIN`, `MAX` and `IN`
- `ANY` and `ALL` with arrays

## Syntax

```sql show
SELECT column1
FROM table1
WHERE column2 operator ANY (SELECT column2 FROM table2 WHERE condition);

SELECT column1
FROM table1
WHERE column2 operator ALL (SELECT column2 FROM table2 WHERE condition);
```

`operator` is a comparison such as `=`, `>`, `<`, `>=`, `<>`.

## Examples

### > ALL: bigger than every value

Films longer than **every** NC-17 film, meaning longer than the longest NC-17 film:

```sql run
SELECT title, length
FROM film
WHERE length > ALL (SELECT length FROM film WHERE rating = 'NC-17')
ORDER BY length DESC, title
LIMIT 5;
```

That is the same as `length > (SELECT MAX(length) ...)`. The longest NC-17 film is {{= SELECT MAX(length) FROM film WHERE rating = 'NC-17' }} minutes.

### > ANY: bigger than at least one value

Films longer than **at least one** G-rated film, meaning longer than the shortest G film:

```sql run
SELECT COUNT(*) AS films
FROM film
WHERE length > ANY (SELECT length FROM film WHERE rating = 'G');
```

That is the same as `length > (SELECT MIN(...) ...)`.

### = ANY is IN

`= ANY` and `IN` give the same result:

```sql run
SELECT
  (SELECT COUNT(*) FROM film WHERE rental_duration = ANY (SELECT 3 UNION SELECT 7)) AS with_any,
  (SELECT COUNT(*) FROM film WHERE rental_duration IN (3, 7)) AS with_in;
```

### ANY and ALL with an array

In PostgreSQL both also accept an **array**, which is how you test against a list you pass in:

```sql run
SELECT COUNT(*) AS films
FROM film
WHERE length = ANY (ARRAY[46, 47, 48]);
```

### `<> ALL` means "not in"

`x <> ANY (list)` is true if `x` differs from **at least one** value, which is nearly always true. To say "not equal to any of them" you want `<> ALL` (or `NOT IN`):

```sql run
SELECT
  (SELECT COUNT(*) FROM film WHERE rating::text <> ANY (ARRAY['G', 'PG'])) AS not_equal_any,
  (SELECT COUNT(*) FROM film WHERE rating::text <> ALL (ARRAY['G', 'PG'])) AS not_equal_all;
```

## Try it yourself

Find the payments larger than **all** the payments of customer 1, and the films cheaper than **any** film of length over 180.

## Watch out

### ALL over an empty list is true

If the subquery returns no rows, `> ALL (...)` is true for every row, which can surprise you. `> ANY (...)` over an empty list is false:

```sql run
SELECT
  (SELECT COUNT(*) FROM film WHERE length > ALL (SELECT length FROM film WHERE rating::text = 'XX_NONE')) AS all_of_nothing;
```

No film has that rating, so the list is empty and every film passes. (We compare `rating::text` because `'XX_NONE'` is not a valid value of the `rating` enum, and PostgreSQL would reject it.)

### `<> ANY` does not mean "not in"

Read the two examples above again. `<> ANY` almost always matches.

### They are rarely needed

`MAX`, `MIN` and `IN` are clearer for most cases. `ANY` and `ALL` are mainly good for reading other people's SQL, for arrays, and for interviews.

## Interview corner

**"What is the difference between `ANY` and `ALL`?"**
`ANY` is true if the comparison holds for at least one value returned by the subquery; `ALL` only if it holds for every value.

**"How is `> ALL (subquery)` written without `ALL`?"**
`> (SELECT MAX(col) FROM ...)`. And `> ANY` is `> (SELECT MIN(col) FROM ...)`.

**"How do you pass a list of values to a query as one parameter?"**
As an array: `WHERE id = ANY($1)`.

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

```sql practice
-- hint: `rental_rate < ANY (SELECT rental_rate FROM film WHERE length > 180)`.
SELECT title, rental_rate
FROM film
WHERE rental_rate < ANY (SELECT rental_rate FROM film WHERE length > 180)
ORDER BY title;
```

### Stretch: an array of ratings

Count the films whose `rating` (cast to text) is in the array `ARRAY['PG-13', 'R']`, using `= ANY`. Return one number, `films`.

```sql practice
-- hint: `rating::text = ANY (ARRAY['PG-13', 'R'])`.
SELECT COUNT(*) AS films
FROM film
WHERE rating::text = ANY (ARRAY['PG-13', 'R']);
```
