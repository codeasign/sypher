---
title: "Aliases"
order: 0
---

An **alias** is a temporary nickname. You give a column or a table a friendlier name for the length of one query.

## What you'll learn

- Column aliases with `AS`
- Aliases with spaces
- Table aliases
- Where you can and cannot use an alias

## Syntax

```sql show
SELECT column_name AS alias_name
FROM table_name AS table_alias;
```

## Examples

### Naming a column

Recall the ugly `length / 60` column from the last page. An alias fixes it:

```sql run
SELECT title, length / 60 AS hours
FROM film;
```

The alias only changes the heading of the result. The table itself is untouched.

### Aliases with spaces

If the alias contains a space, wrap it in quotes (backticks always work; double quotes work by default too):

```sql run
SELECT title AS `Movie Title`, rental_rate AS `Price per Night`
FROM film;
```

### AS is optional

You can leave `AS` out. Most people keep it because it is clearer:

```sql run
SELECT title movie, length minutes
FROM film;
```

### Table aliases

A table can have a short nickname too, and you can then prefix columns with it:

```sql run
SELECT f.title, f.rating
FROM film AS f;
```

For one table this is optional. It becomes essential in joins, where several tables have columns with the same name.

## Try it yourself

Take any query from the last page and give each column a nicer name with `AS`.

## Watch out

### You cannot use a column alias in WHERE

`WHERE` runs *before* `SELECT`, so the alias does not exist yet:

```sql run error
SELECT title, length / 60 AS hours
FROM film
WHERE hours > 2;
```

Repeat the expression instead:

```sql run
SELECT title, length / 60 AS hours
FROM film
WHERE length / 60 > 2
ORDER BY length, title;
```

### You can use it in ORDER BY

`ORDER BY` runs *after* `SELECT`, so it can see the alias:

```sql run
SELECT title, length / 60 AS hours
FROM film
ORDER BY hours DESC, title;
```

### A missing comma looks like an alias

If you forget a comma, MySQL reads the second word as an alias, and you get no error:

```sql run
SELECT title rating
FROM film;
```

You asked for two columns but got one, called `rating`, containing the titles. Always check the column headings.

## Interview corner

**"Why can't you use a column alias in a `WHERE` clause?"**
Because of the logical order in which MySQL processes a query: `FROM`, then `WHERE`, then `GROUP BY`, `HAVING`, `SELECT`, and finally `ORDER BY`. Aliases are created in the `SELECT` step, after `WHERE` has already run.

**"When are table aliases required?"**
When you join a table to itself (a self-join), and whenever a derived table (a subquery in `FROM`) is used, since it must have a name.

## Practice

### Warm-up: rename two columns

Show each film's `title` as `Movie` and `length` as `Minutes`.

```sql practice
-- hint: Use `AS` after each column. No quotes are needed for one-word aliases.
SELECT title AS Movie, length AS Minutes
FROM film;
```

### Core: price per minute, named

For every film show the `title` and the rental price per minute (`rental_rate / length`) with the alias `price_per_minute`. Sort with the most expensive per minute first, then by title.

```sql practice
-- hint: `ORDER BY` can use the alias.
SELECT title, rental_rate / length AS price_per_minute
FROM film
ORDER BY price_per_minute DESC, title;
```

### Stretch: films over two and a half hours

Show the `title` and the length in hours (alias `hours`) of every film longer than 150 minutes. Order by `hours` descending, then title.

```sql practice
-- hint: The alias can't be used in WHERE, so filter on `length > 150`.
SELECT title, length / 60 AS hours
FROM film
WHERE length > 150
ORDER BY hours DESC, title;
```
