---
title: "INNER JOIN"
order: 0
---

`INNER JOIN` combines rows from two tables where a condition matches. Rows with no match on the other side are left out.

## What you'll learn

- Joining two tables with `ON`
- Telling apart columns with the same name
- What "inner" means

## Syntax

```sql show
SELECT columns
FROM table1
INNER JOIN table2
  ON table1.column = table2.column;
```

`JOIN` on its own means `INNER JOIN`. The `ON` line says how a row of `table1` is matched with a row of `table2`, usually foreign key = primary key.

## Examples

### Films with their language

Each film stores only a `language_id`. Join to `language` for the name:

```sql run
SELECT film.title, language.name AS language
FROM film
INNER JOIN language
  ON film.language_id = language.language_id
ORDER BY film.title;
```

Prefix each column with its table name (`film.title`) so MySQL knows which table you mean.

### Table aliases keep it short

Give each table a nickname, then use it everywhere:

```sql run
SELECT f.title, l.name AS language
FROM film AS f
INNER JOIN language AS l
  ON f.language_id = l.language_id
ORDER BY f.title;
```

### Customers with their address

```sql run
SELECT c.first_name, c.last_name, a.address, a.district
FROM customer AS c
JOIN address AS a
  ON c.address_id = a.address_id
ORDER BY c.customer_id;
```

### Join, then filter and sort

Everything you know still works. The customers of a district, alphabetically:

```sql run
SELECT c.first_name, c.last_name, a.district
FROM customer AS c
JOIN address AS a ON a.address_id = c.address_id
WHERE a.district = 'California'
ORDER BY c.last_name, c.first_name;
```

### Joining copies to films

`inventory` holds one row per physical copy of a film. To see the title of each copy:

```sql run
SELECT i.inventory_id, i.store_id, f.title
FROM inventory AS i
JOIN film AS f ON f.film_id = i.film_id
ORDER BY i.inventory_id;
```

## Try it yourself

Show each payment's `amount` with the customer's name, then each rental with the name of the staff member who handled it.

## Watch out

### Ambiguous column names

`film_id` exists in both tables. If you use it without a prefix, MySQL cannot choose:

```sql run error
SELECT film_id, title
FROM film
JOIN inventory ON film.film_id = inventory.film_id;
```

Write `f.film_id` or `i.film_id`.

### Forgetting the ON is a disaster

Without a matching condition, every row of one table pairs with every row of the other (a *cross join*). The number of rows explodes:

```sql run
SELECT COUNT(*) AS rows_in_the_mess
FROM film
JOIN inventory;
```

That is every film paired with every inventory row: {{= SELECT COUNT(*) FROM film }} × {{= SELECT COUNT(*) FROM inventory }}. Always write the `ON`.

### Unmatched rows disappear

`INNER JOIN` keeps only rows that have a partner. A film with **no copies** in `inventory` is missing from the result:

```sql run
SELECT COUNT(*) AS films_in_table,
       (SELECT COUNT(DISTINCT f.film_id) FROM film f JOIN inventory i ON i.film_id = f.film_id) AS films_that_joined
FROM film;
```

To keep those films too, you need a `LEFT JOIN` (page 7.4).

## Interview corner

**"What does `INNER JOIN` return?"**
Only the rows for which the `ON` condition is true in both tables. Rows without a match on either side are dropped.

**"What is the difference between `JOIN` and `INNER JOIN`?"**
None. `JOIN` alone means `INNER JOIN`.

**"What is the difference between `ON` and `WHERE`?"**
`ON` says how tables are matched. `WHERE` filters the result. For an inner join they behave the same, but for outer joins the difference matters (see `LEFT JOIN`).

## Practice

### Warm-up: films and languages

Show each film's `title` and its language name (`language`). Order by `film_id`.

```sql practice
-- hint: Join `film` to `language` on `language_id`.
SELECT f.title, l.name AS language
FROM film AS f
JOIN language AS l ON l.language_id = f.language_id
ORDER BY f.film_id;
```

### Core: who paid what

Show `payment_id`, the customer's `first_name` and `last_name`, and the `amount`, for payments over 11 dollars. Order by `amount` descending, then `payment_id`.

```sql practice
-- hint: Join `payment` to `customer` on `customer_id`, then filter on `amount`.
SELECT p.payment_id, c.first_name, c.last_name, p.amount
FROM payment AS p
JOIN customer AS c ON c.customer_id = p.customer_id
WHERE p.amount > 11
ORDER BY p.amount DESC, p.payment_id;
```

### Stretch: copies per store

Show each `store_id` with the number of inventory copies it holds (`copies`) for films rated `PG-13` only. Order by `store_id`.

```sql practice
-- hint: Join `inventory` to `film`, filter the rating, then group by store.
SELECT i.store_id, COUNT(*) AS copies
FROM inventory AS i
JOIN film AS f ON f.film_id = i.film_id
WHERE f.rating = 'PG-13'
GROUP BY i.store_id
ORDER BY i.store_id;
```
