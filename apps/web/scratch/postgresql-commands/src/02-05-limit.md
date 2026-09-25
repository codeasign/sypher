---
title: "LIMIT, OFFSET and FETCH"
order: 0
---

`LIMIT` caps how many rows a query returns. Together with `OFFSET` it lets you page through a large result a chunk at a time. `FETCH FIRST` is the standard-SQL spelling of the same idea.

## What you'll learn

- Getting the first N rows
- Getting the top or bottom N with `ORDER BY`
- Paging with `OFFSET`
- `FETCH FIRST ... ROWS ONLY` and `WITH TIES`

## Syntax

```sql show
SELECT column1
FROM table_name
ORDER BY column1
LIMIT row_count OFFSET rows_to_skip;

-- the standard-SQL form
SELECT column1
FROM table_name
ORDER BY column1
OFFSET rows_to_skip ROWS
FETCH FIRST row_count ROWS ONLY;
```

`OFFSET` is optional and defaults to 0.

## Examples

### The first few rows

```sql run
SELECT film_id, title
FROM film
ORDER BY film_id
LIMIT 3;
```

### Top N

Combine `ORDER BY` and `LIMIT` for a "top" list. The five longest films:

```sql run
SELECT title, length
FROM film
ORDER BY length DESC, title
LIMIT 5;
```

### Skipping rows with OFFSET

Rows 6 to 10 (skip 5, then return 5):

```sql run
SELECT film_id, title
FROM film
ORDER BY film_id
LIMIT 5 OFFSET 5;
```

### Paging

Page `p` of size `n` skips `(p - 1) * n` rows. Page 3 with 10 films per page skips 20:

```sql run
SELECT film_id, title
FROM film
ORDER BY film_id
LIMIT 10 OFFSET 20;
```

### The standard form, and WITH TIES

`FETCH FIRST` does the same as `LIMIT`. Its extra option `WITH TIES` also returns every row that ties with the last one, so you never cut a tie in half:

```sql run
SELECT title, length
FROM film
ORDER BY length DESC
FETCH FIRST 3 ROWS WITH TIES;
```

{{= SELECT COUNT(*) FROM film WHERE length = (SELECT MAX(length) FROM film) }} films share the longest length, so all of them come back, not just three. `LIMIT 3` would have cut that group of equals arbitrarily.

## Try it yourself

Show the 10 cheapest films, and then the next 10.

## Watch out

### LIMIT without ORDER BY gives arbitrary rows

"The first 5 rows" means nothing until you say what order. Always pair `LIMIT` with `ORDER BY`, and add a unique column so ties are broken the same way every time.

### Big offsets are slow

`LIMIT 10 OFFSET 100000` still reads and throws away 100000 rows. For deep paging, remember where the last page ended and continue from there (*keyset pagination*). Compare:

```sql run
SELECT film_id, title
FROM film
WHERE film_id > 20
ORDER BY film_id
LIMIT 10;
```

This returns the same ten films as the `OFFSET 20` query above, but PostgreSQL can jump straight to `film_id > 20` using the primary key.

### LIMIT ALL and LIMIT NULL

`LIMIT ALL` (or `LIMIT NULL`) means "no limit". It is useful when the limit comes from a variable that might be empty.

## Interview corner

**"How would you get the top 3 most expensive films?"**
`ORDER BY replacement_cost DESC, title LIMIT 3`. If ties matter (several films share the top price), `LIMIT` cuts them arbitrarily. Use `FETCH FIRST 3 ROWS WITH TIES`, or `DENSE_RANK()` from Module 8.

**"What is the problem with `OFFSET` for pagination?"**
The database must walk past every skipped row, so later pages get slower, and rows can be missed or repeated if data changes between pages. Keyset pagination (`WHERE id > last_seen_id`) avoids both.

**"Is `LIMIT` standard SQL?"**
No. `FETCH FIRST n ROWS ONLY` is the standard form. PostgreSQL, MySQL and SQLite accept `LIMIT`; SQL Server uses `TOP` and Oracle used `ROWNUM` before adopting `FETCH FIRST`.

## Practice

### Warm-up: first five actors

Show the first five actors (`first_name`, `last_name`) ordered by `actor_id`.

```sql practice
-- hint: `ORDER BY actor_id LIMIT 5`.
SELECT first_name, last_name
FROM actor
ORDER BY actor_id
LIMIT 5;
```

### Core: the cheapest films

Show the `title` and `replacement_cost` of the 5 films that are cheapest to replace. Break ties alphabetically by title.

```sql practice
-- hint: Sort by `replacement_cost` ascending and then by `title`, then `LIMIT 5`.
SELECT title, replacement_cost
FROM film
ORDER BY replacement_cost, title
LIMIT 5;
```

### Stretch: page 4

A film list shows 12 films per page, ordered by `title`. Show page 4 (`title` only).

```sql practice
-- hint: Page 4 skips (4 - 1) * 12 = 36 rows.
SELECT title
FROM film
ORDER BY title
LIMIT 12 OFFSET 36;
```
