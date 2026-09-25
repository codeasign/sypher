---
title: "UNION and UNION ALL"
order: 0
---

A join places tables **side by side**. `UNION` stacks the results of two queries **on top of each other**, into a single list.

## What you'll learn

- Combining results with `UNION` and `UNION ALL`
- The rules the two queries must follow
- Emulating a `FULL OUTER JOIN`

## Syntax

```sql show
SELECT column1, column2 FROM table1
UNION
SELECT column1, column2 FROM table2;
```

`UNION` removes duplicate rows. `UNION ALL` keeps everything.

## Examples

### One list from two tables

Actors and customers both have names. One combined list of everybody's name, without duplicates:

```sql run
SELECT first_name, last_name FROM actor
UNION
SELECT first_name, last_name FROM customer
ORDER BY last_name, first_name;
```

### UNION vs UNION ALL

`UNION ALL` does not remove duplicates, so it can return more rows:

```sql run
SELECT COUNT(*) AS with_union_all
FROM (SELECT first_name, last_name FROM actor
      UNION ALL
      SELECT first_name, last_name FROM customer) AS everyone;

SELECT COUNT(*) AS with_union
FROM (SELECT first_name, last_name FROM actor
      UNION
      SELECT first_name, last_name FROM customer) AS everyone;
```

The first is {{= SELECT COUNT(*) FROM actor }} actors plus {{= SELECT COUNT(*) FROM customer }} customers. The second is smaller, because some people share a name across the two tables and `UNION` keeps each name once.

### Labelling where each row came from

Add a constant column so you can tell the sources apart:

```sql run
SELECT 'actor' AS source, first_name, last_name FROM actor WHERE last_name = 'DAVIS'
UNION ALL
SELECT 'customer', first_name, last_name FROM customer WHERE last_name = 'DAVIS'
ORDER BY source, first_name;
```

### Emulating a FULL OUTER JOIN

MySQL has no `FULL OUTER JOIN`, but a `LEFT JOIN` plus a `RIGHT JOIN` joined by `UNION` does the same. Every language and every film, matched where possible:

```sql run
SELECT COUNT(*) AS full_outer_rows
FROM (
  SELECT l.language_id, f.film_id
  FROM language AS l LEFT JOIN film AS f ON f.language_id = l.language_id
  UNION
  SELECT l.language_id, f.film_id
  FROM language AS l RIGHT JOIN film AS f ON f.language_id = l.language_id
) AS combined;
```

That is 1000 films (each with its language), plus 5 languages that have no film.

## Try it yourself

Make one list of all the different first names that occur in `actor`, `customer` and `staff` together, and one of every `city` and every `district` name.

## Watch out

### The two queries must have the same number of columns

```sql run error
SELECT first_name, last_name FROM actor
UNION
SELECT first_name FROM customer;
```

The columns are matched by **position**, and their types must be compatible. The column names in the result come from the first query.

### ORDER BY applies to the whole result

Put one `ORDER BY` at the very end, using the column names of the first query. Putting it after only the first `SELECT` is an error or is ignored.

### UNION does extra work

`UNION` has to compare rows to remove duplicates, which costs time on big results. If you know the two queries cannot overlap, or you want duplicates, use `UNION ALL`.

## Interview corner

**"What is the difference between `UNION` and `UNION ALL`?"**
`UNION` removes duplicate rows, and `UNION ALL` keeps them and is faster.

**"What is the difference between a `JOIN` and a `UNION`?"**
A join adds **columns** by matching rows from different tables. A union adds **rows** by stacking result sets that have the same shape.

**"How do you do a `FULL OUTER JOIN` in MySQL?"**
`LEFT JOIN` `UNION` `RIGHT JOIN`.

## Practice

### Warm-up: two short lists

Make a single list of the `name` values from `category` and the `name` values from `language`, without duplicates, alphabetically. Return one column called `name`.

```sql practice
-- hint: `UNION` two `SELECT name` queries, then `ORDER BY name`.
SELECT name FROM category
UNION
SELECT name FROM language
ORDER BY name;
```

### Core: tag the source

Show every `district` from the `address` table that starts with `Q`, together with the text `address` as `source`, and every `city` that starts with `Q`, tagged `city`. Return `source` and `place`, ordered by source then place.

```sql practice
-- hint: `UNION ALL` two queries, giving both a `place` alias, and a constant `source` column.
SELECT 'address' AS source, district AS place FROM address WHERE district LIKE 'Q%'
UNION ALL
SELECT 'city', city FROM city WHERE city LIKE 'Q%'
ORDER BY source, place;
```
