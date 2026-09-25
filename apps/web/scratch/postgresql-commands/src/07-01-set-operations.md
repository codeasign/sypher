---
title: "UNION, INTERSECT and EXCEPT"
order: 0
---

A join places tables **side by side**. The set operators stack the results of two queries **on top of each other**, into a single list: `UNION` combines, `INTERSECT` keeps what both share, and `EXCEPT` keeps what only the first has.

## What you'll learn

- Combining results with `UNION` and `UNION ALL`
- `INTERSECT` and `EXCEPT`
- The rules the two queries must follow
- Why PostgreSQL needs no `FULL JOIN` workaround

## Syntax

```sql show
SELECT column1 FROM table1
UNION [ALL]
SELECT column1 FROM table2;

SELECT column1 FROM table1
INTERSECT
SELECT column1 FROM table2;

SELECT column1 FROM table1
EXCEPT
SELECT column1 FROM table2;
```

`UNION` removes duplicate rows. `UNION ALL` keeps everything.

## Examples

### One list from two tables

Actors and customers both have names. One combined list of first names, without duplicates:

```sql run
SELECT first_name FROM actor
UNION
SELECT first_name FROM customer
ORDER BY first_name
LIMIT 5;
```

### UNION vs UNION ALL

`UNION ALL` does not remove duplicates, so it can return more rows:

```sql run
SELECT
  (SELECT COUNT(*) FROM (SELECT first_name FROM actor UNION ALL SELECT first_name FROM customer) x) AS union_all,
  (SELECT COUNT(*) FROM (SELECT first_name FROM actor UNION SELECT first_name FROM customer) x) AS union_distinct;
```

The first is {{= SELECT COUNT(*) FROM actor }} actors plus {{= SELECT COUNT(*) FROM customer }} customers. The second is smaller, because many names appear more than once and `UNION` keeps each name once.

### Labelling where each row came from

Add a constant column so you can tell the sources apart:

```sql run
SELECT 'actor' AS source, first_name, last_name FROM actor WHERE last_name = 'DAVIS'
UNION ALL
SELECT 'customer', first_name, last_name FROM customer WHERE last_name = 'DAVIS'
ORDER BY source, first_name;
```

### INTERSECT: in both

First names that belong to both an actor and a customer:

```sql run
SELECT first_name FROM actor
INTERSECT
SELECT first_name FROM customer
ORDER BY first_name
LIMIT 5;
```

### EXCEPT: only in the first

Customer last names that no actor has:

```sql run
SELECT COUNT(*) AS only_customers
FROM (
  SELECT last_name FROM customer
  EXCEPT
  SELECT last_name FROM actor
) x;
```

## Try it yourself

Make one list of all the different first names that occur in `actor`, `customer` and `staff` together, and one of every `city` and every `district` name.

## Watch out

### The two queries must have the same number of columns

The columns are matched by **position**, and their types must be compatible. The column names in the result come from the first query:

```sql run error
SELECT first_name, last_name FROM actor
UNION
SELECT first_name FROM customer;
```

### ORDER BY applies to the whole result

Put one `ORDER BY` at the very end, using the column names of the first query. To sort one part only, wrap it in brackets.

### UNION does extra work

`UNION` has to compare rows to remove duplicates, which costs time on big results. If you know the two queries cannot overlap, or you want duplicates, use `UNION ALL`.

### EXCEPT is not symmetric

`A EXCEPT B` and `B EXCEPT A` are different. And like `UNION`, both `INTERSECT` and `EXCEPT` remove duplicates (`INTERSECT ALL` and `EXCEPT ALL` keep them).

## Interview corner

**"What is the difference between `UNION` and `UNION ALL`?"**
`UNION` removes duplicate rows, and `UNION ALL` keeps them and is faster.

**"What is the difference between a `JOIN` and a `UNION`?"**
A join adds **columns** by matching rows from different tables. A union adds **rows** by stacking result sets that have the same shape.

**"How do you find rows in one table but not another?"**
`EXCEPT`, or `NOT EXISTS`, or a `LEFT JOIN ... IS NULL`. `EXCEPT` compares whole rows and treats `NULL`s as equal.

## Practice

### Warm-up: two short lists

Make a single list of the `name` values from `category` and the trimmed `name` values from `language`, without duplicates, alphabetically. Return one column called `name`.

```sql practice
-- hint: `SELECT name FROM category UNION SELECT trim(name) FROM language`.
SELECT name FROM category
UNION
SELECT trim(name) FROM language
ORDER BY name;
```

### Core: tag the source

Show every `district` from the `address` table that starts with `Q`, together with the text `address` as `source`, and every `city` that starts with `Q`, tagged `city`. Return `source` and `place`, ordered by source then place.

```sql practice
-- hint: Two SELECTs with a constant first column, `UNION`.
SELECT 'address' AS source, district AS place FROM address WHERE district LIKE 'Q%'
UNION
SELECT 'city', city FROM city WHERE city LIKE 'Q%'
ORDER BY source, place;
```

### Stretch: names only in one place

Show the different customer `first_name`s that are **not** also an actor `first_name`, as `only_customer_names`, alphabetically. Show the first rows.

```sql practice
-- hint: `EXCEPT`.
SELECT first_name AS only_customer_names FROM customer
EXCEPT
SELECT first_name FROM actor
ORDER BY only_customer_names;
```
