---
title: "INNER JOIN"
order: 0
---

`INNER JOIN` combines rows from two tables where a condition matches. Rows with no match on the other side are left out.

## What you'll learn

- Joining two tables with `ON`
- Telling apart columns with the same name
- `USING` and `NATURAL JOIN`
- What "inner" means

## Syntax

```sql show
SELECT table1.column1, table2.column2
FROM table1
INNER JOIN table2 ON table1.key = table2.key;
```

`JOIN` on its own means `INNER JOIN`. The `ON` line says how a row of `table1` is matched with a row of `table2`, usually foreign key = primary key.

## Examples

### Films with their language

Each film stores only a `language_id`. Join to `language` for the name:

```sql run
SELECT film.title, trim(language.name) AS language
FROM film
INNER JOIN language ON language.language_id = film.language_id
ORDER BY film.film_id
LIMIT 3;
```

Prefix each column with its table name (`film.title`) so PostgreSQL knows which table you mean.

### Table aliases keep it short

Give each table a nickname, then use it everywhere:

```sql run
SELECT f.title, trim(l.name) AS language
FROM film AS f
JOIN language AS l ON l.language_id = f.language_id
ORDER BY f.film_id
LIMIT 3;
```

### Customers with their address

```sql run
SELECT c.first_name, c.last_name, a.address, a.district
FROM customer c
JOIN address a ON a.address_id = c.address_id
ORDER BY c.customer_id
LIMIT 3;
```

### Join, then filter and sort

Everything you know still works. The customers of one district, alphabetically:

```sql run
SELECT c.last_name, c.first_name, a.district
FROM customer c
JOIN address a ON a.address_id = c.address_id
WHERE a.district = 'Texas'
ORDER BY c.last_name, c.first_name;
```

### Joining copies to films

`inventory` holds one row per physical copy of a film. To see the title of each copy:

```sql run
SELECT i.inventory_id, i.store_id, f.title
FROM inventory i
JOIN film f ON f.film_id = i.film_id
ORDER BY i.inventory_id
LIMIT 3;
```

### USING: a shorter ON

When the two columns have the **same name**, `USING (column)` says the same thing and shows that column once:

```sql run
SELECT film_id, title, trim(name) AS language
FROM film
JOIN language USING (language_id)
ORDER BY film_id
LIMIT 3;
```

## Try it yourself

Show each payment's `amount` with the customer's name, then each rental with the name of the staff member who handled it.

## Watch out

### Ambiguous column names

`film_id` exists in both tables. If you use it without a prefix, PostgreSQL cannot choose:

```sql run error
SELECT film_id, title
FROM film f
JOIN inventory i ON i.film_id = f.film_id;
```

Write `f.film_id` or `i.film_id`.

### Forgetting the ON is an error

Unlike MySQL, PostgreSQL will not treat a missing `ON` as a cross join. It stops you:

```sql run error
SELECT f.title, i.inventory_id
FROM film f
JOIN inventory i;
```

### Unmatched rows disappear

`INNER JOIN` keeps only rows that have a partner. A film with **no copies** in `inventory` is missing from the result:

```sql run
SELECT COUNT(*) AS films_with_copies_rows, COUNT(DISTINCT f.film_id) AS films_seen,
       (SELECT COUNT(*) FROM film) AS films_in_total
FROM film f
JOIN inventory i ON i.film_id = f.film_id;
```

To keep those films too, you need a `LEFT JOIN` (page 6.4).

### NATURAL JOIN is a trap

`NATURAL JOIN` joins on *every* column with the same name, including ones you did not intend (such as `last_update`). It silently changes meaning when a column is added. Prefer `ON` or `USING`.

## Interview corner

**"What does `INNER JOIN` return?"**
Only the rows for which the `ON` condition is true in both tables. Rows without a match on either side are dropped.

**"What is the difference between `JOIN` and `INNER JOIN`?"**
None. `JOIN` alone means `INNER JOIN`.

**"What is the difference between `ON` and `WHERE`?"**
`ON` says how tables are matched. `WHERE` filters the result. For an inner join they behave the same, but for outer joins the difference matters (see `LEFT JOIN`).

## Practice

### Warm-up: films and languages

Show each film's `title` and its language name (`language`, trimmed). Order by `film_id`. Show the first rows.

```sql practice
-- hint: Join `film` to `language` on `language_id`; `trim(l.name)` removes the padding.
SELECT f.title, trim(l.name) AS language
FROM film f
JOIN language l ON l.language_id = f.language_id
ORDER BY f.film_id;
```

### Core: who paid what

Show `payment_id`, the customer's `first_name` and `last_name`, and the `amount`, for payments over 11 dollars. Order by `amount` descending, then `payment_id`.

```sql practice
-- hint: Join `payment` to `customer`, then filter `amount > 11`.
SELECT p.payment_id, c.first_name, c.last_name, p.amount
FROM payment p
JOIN customer c ON c.customer_id = p.customer_id
WHERE p.amount > 11
ORDER BY p.amount DESC, p.payment_id;
```

### Stretch: copies per store

Show each `store_id` with the number of inventory copies it holds (`copies`) for films rated `PG-13` only. Order by `store_id`.

```sql practice
-- hint: Join `inventory` to `film`, filter the rating, `GROUP BY i.store_id`.
SELECT i.store_id, COUNT(*) AS copies
FROM inventory i
JOIN film f ON f.film_id = i.film_id
WHERE f.rating = 'PG-13'
GROUP BY i.store_id
ORDER BY i.store_id;
```
