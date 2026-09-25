---
title: "ORDER BY"
order: 0
---

`ORDER BY` sorts the rows of a result. Without it, MySQL returns rows in whatever order is convenient, and that order is not guaranteed.

## What you'll learn

- Sorting ascending and descending
- Sorting by more than one column
- How `NULL` sorts
- Why ties need a tiebreaker

## Syntax

```sql show
SELECT column1, column2
FROM table_name
ORDER BY column1 ASC, column2 DESC;
```

`ASC` (smallest first) is the default, so you can leave it out. `DESC` is largest first.

## Examples

### One column

The shortest films first:

```sql run
SELECT title, length
FROM film
ORDER BY length;
```

### Descending

The longest films first:

```sql run
SELECT title, length
FROM film
ORDER BY length DESC;
```

### Text sorts alphabetically

```sql run
SELECT first_name, last_name
FROM actor
ORDER BY last_name;
```

### Several columns

Sort by the first column, and use the next one to break ties. Here, films by rating, and within each rating the longest first:

```sql run
SELECT title, rating, length
FROM film
ORDER BY rating, length DESC;
```

Each column gets its own `ASC` or `DESC`.

### By an expression or an alias

```sql run
SELECT title, rental_rate / length AS price_per_minute
FROM film
ORDER BY price_per_minute DESC;
```

## Try it yourself

Sort the customers by `create_date`, newest first. Then sort by `last_name` and `first_name`.

## Watch out

### No ORDER BY, no guaranteed order

A query without `ORDER BY` may look sorted today and change tomorrow, after an index or a server setting changes. If order matters, say so.

### NULLs sort first in ascending order

MySQL treats `NULL` as smaller than any value. In `ORDER BY ... ASC` the `NULL`s come first; in `DESC` they come last:

```sql run
SELECT rental_id, return_date
FROM rental
ORDER BY return_date;
```

The rentals that have not been returned yet (`NULL`) appear at the top. To put them last in an ascending sort:

```sql run
SELECT rental_id, return_date
FROM rental
ORDER BY return_date IS NULL, return_date;
```

`return_date IS NULL` is `0` for real dates and `1` for empty ones, so real dates come first.

### Ties need a tiebreaker

Many films are the same length. When rows tie, MySQL may return them in a different order each time. Add a column that is unique, such as the title or the id, at the end:

```sql run
SELECT title, length
FROM film
ORDER BY length, title;
```

This matters most when you also use `LIMIT` (next page), because a different order means different rows come back.

## Interview corner

**"Is the order of rows guaranteed without `ORDER BY`?"**
No. Relational tables are unordered sets. Only an explicit `ORDER BY` guarantees an order.

**"Can you `ORDER BY` a column that is not in the `SELECT` list?"**
Yes. You can sort by any column of the table, even one you don't show.

**"Where do `NULL`s sort?"**
In MySQL they are the smallest values: first for `ASC`, last for `DESC`.

## Practice

### Warm-up: alphabetical categories

Show every category `name`, in alphabetical order.

```sql practice
-- hint: `ORDER BY name`.
SELECT name
FROM category
ORDER BY name;
```

### Core: newest customers

Show the `first_name`, `last_name` and `create_date` of every customer, newest `create_date` first, and by `last_name` then `first_name` when dates tie.

```sql practice
-- hint: Three sort columns: `create_date DESC`, then the two names.
SELECT first_name, last_name, create_date
FROM customer
ORDER BY create_date DESC, last_name, first_name;
```

### Stretch: unreturned rentals last

Show `rental_id` and `return_date` of every rental, ordered by `return_date` ascending, but with the not-yet-returned rentals at the **end**. Break ties on `rental_id`.

```sql practice
-- hint: Sort first by `return_date IS NULL`, then by `return_date`, then by `rental_id`.
SELECT rental_id, return_date
FROM rental
ORDER BY return_date IS NULL, return_date, rental_id;
```
