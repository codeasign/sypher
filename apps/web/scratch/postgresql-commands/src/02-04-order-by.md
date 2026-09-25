---
title: "ORDER BY"
order: 0
---

`ORDER BY` sorts the rows of a result. Without it, PostgreSQL returns rows in whatever order is convenient, and that order is not guaranteed.

## What you'll learn

- Sorting ascending and descending
- Sorting by more than one column
- Where `NULL` sorts, and `NULLS FIRST` / `NULLS LAST`
- Why ties need a tiebreaker

## Syntax

```sql show
SELECT column1, column2
FROM table_name
ORDER BY column1 [ASC | DESC] [NULLS FIRST | NULLS LAST], column2 [ASC | DESC];
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

Sort by the first column, and use the next one to break ties. Here, films by length, and within the same length by title:

```sql run
SELECT title, rating, length
FROM film
ORDER BY length DESC, title;
```

Each column gets its own `ASC` or `DESC`.

### By an expression or an alias

```sql run
SELECT title, rental_rate / length AS price_per_minute
FROM film
ORDER BY price_per_minute DESC, title;
```

### The enum sorts in its own order

`rating` is not plain text but an **enum**, a type with a fixed list of values. It sorts in the order the values were declared, not alphabetically:

```sql run
SELECT DISTINCT rating
FROM film
ORDER BY rating;
```

Sort by `rating::text` when you want alphabetical order.

## Try it yourself

Sort the customers by `create_date`, newest first. Then sort by `last_name` and `first_name`.

## Watch out

### No ORDER BY, no guaranteed order

A query without `ORDER BY` may look sorted today and change tomorrow, after an update or a `VACUUM` moves rows around. If order matters, say so.

### NULLs sort last in ascending order

PostgreSQL treats `NULL` as larger than any value. In `ORDER BY ... ASC` the `NULL`s come **last**; in `DESC` they come first. (MySQL does the opposite.) You can say what you want:

```sql run
SELECT rental_id, upper(rental_period) AS returned_at
FROM rental
ORDER BY returned_at DESC NULLS LAST, rental_id
LIMIT 5;
```

Here `upper(rental_period)` is the return time of a rental, or `NULL` for a film not yet returned. `NULLS LAST` puts the unreturned ones at the end even in a descending sort.

### Ties need a tiebreaker

Many films are the same length. When rows tie, PostgreSQL may return them in a different order each time. Add a column that is unique, such as the title or the id, at the end:

```sql run
SELECT film_id, title, length
FROM film
ORDER BY length DESC, film_id;
```

This matters most when you also use `LIMIT` (next page), because a different order means different rows come back.

### Sorting follows the database's collation

Text is sorted by the database's language rules (here `en_US.utf8`), which ignore case and punctuation at first. `'a' < 'B'` is true, unlike in a plain byte-order sort.

## Interview corner

**"Is the order of rows guaranteed without `ORDER BY`?"**
No. Relational tables are unordered sets. Only an explicit `ORDER BY` guarantees an order.

**"Can you `ORDER BY` a column that is not in the `SELECT` list?"**
Yes. You can sort by any column of the table, even one you don't show. (With `DISTINCT`, the sort columns must appear in the select list.)

**"Where do `NULL`s sort in PostgreSQL?"**
As the largest values: last for `ASC`, first for `DESC`. Use `NULLS FIRST` or `NULLS LAST` to choose.

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

Show `rental_id` and the return time (`upper(rental_period)` as `returned_at`) of every rental, ordered by `returned_at` ascending, but with the not-yet-returned rentals at the **end**. Break ties on `rental_id`.

```sql practice
-- hint: Ascending already puts NULL last in PostgreSQL, but say it out loud with `NULLS LAST`.
SELECT rental_id, upper(rental_period) AS returned_at
FROM rental
ORDER BY returned_at NULLS LAST, rental_id;
```
