---
title: "WHERE"
order: 0
---

`WHERE` filters rows. Only the rows for which the condition is true are kept.

## What you'll learn

- Filtering with `=`, `<>`, `>`, `<`, `>=` and `<=`
- Quoting text and dates
- How `WHERE` fits in the order of a query

## Syntax

```sql show
SELECT column1, column2
FROM table_name
WHERE condition;
```

## Examples

### Text: use single quotes

Films rated PG:

```sql run
SELECT title, rating
FROM film
WHERE rating = 'PG'
ORDER BY title;
```

### Numbers: no quotes

Films longer than three hours:

```sql run
SELECT title, length
FROM film
WHERE length > 180
ORDER BY length DESC, title;
```

### Not equal

```sql run
SELECT title, rating
FROM film
WHERE rating <> 'PG'
ORDER BY title;
```

### Dates

Write dates as `'YYYY-MM-DD'`, in quotes. Customers who joined on a given day:

```sql run
SELECT customer_id, first_name, last_name, create_date
FROM customer
WHERE create_date = '2006-02-14'
ORDER BY customer_id;
```

### WHERE on any column type

Payments over ten dollars:

```sql run
SELECT payment_id, amount
FROM payment
WHERE amount > 10
ORDER BY payment_id;
```

## Try it yourself

Find every film that costs exactly `0.99` to rent, then every film that costs `4.99` or more.

## Watch out

### Text comparison is case-sensitive

Unlike MySQL, PostgreSQL treats `'pg'` and `'PG'` as different. This finds nothing:

```sql run error
SELECT title FROM film WHERE rating = 'pg';
```

For an enum column such as `rating` PostgreSQL even refuses the value, because `pg` is not one of the declared ratings. For an ordinary text column it would simply return no rows. Use `lower()` on both sides, or `ILIKE` (page 3.6), for case-insensitive matches.

```sql run
SELECT COUNT(*) AS found
FROM film
WHERE lower(title) = 'academy dinosaur';
```

### Text needs single quotes, names need double quotes

`WHERE rating = "PG"` (double quotes) makes PostgreSQL look for a *column* called `PG`:

```sql run error
SELECT title FROM film WHERE rating = "PG";
```

### WHERE runs before SELECT

`WHERE` cannot see column aliases or aggregates, as you learned in *Aliases*. It sees the raw table columns.

## Interview corner

**"In what order does PostgreSQL process the parts of a query?"**
`FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`. This explains why `WHERE` cannot use a `SELECT` alias, and why filtering early makes queries faster.

**"What does `WHERE 1 = 1` do?"**
It is always true, so it keeps every row. Programmers use it as a placeholder so that further `AND ...` conditions can be appended without special-casing the first one.

## Practice

### Warm-up: one store's customers

Show the `first_name` and `last_name` of customers who belong to `store_id = 2`, ordered by last name then first name.

```sql practice
-- hint: `WHERE store_id = 2`.
SELECT first_name, last_name
FROM customer
WHERE store_id = 2
ORDER BY last_name, first_name;
```

### Core: expensive to replace

Show the `title` and `replacement_cost` of films whose `replacement_cost` is greater than 28. Most expensive first, then by title.

```sql practice
-- hint: Numbers don't need quotes.
SELECT title, replacement_cost
FROM film
WHERE replacement_cost > 28
ORDER BY replacement_cost DESC, title;
```

### Stretch: short and cheap

Show `title`, `length` and `rental_rate` of films shorter than 50 minutes that cost `0.99` to rent, ordered by `film_id`.

```sql practice
-- hint: Two conditions joined by AND (next page). Try one first.
SELECT title, length, rental_rate
FROM film
WHERE length < 50 AND rental_rate = 0.99
ORDER BY film_id;
```
