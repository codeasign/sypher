---
title: "Why an Index Is Not Used"
order: 0
---

You added an index, and the query is still slow. In most cases the index exists but the query is written in a way that **cannot use it**. This page shows the usual culprits, each proved with `EXPLAIN`, and how to rewrite the query so the index works.

## What you'll learn

- The habits that make MySQL ignore an index
- How to rewrite each one
- How to spot the problem in `EXPLAIN`

## What to look for

In `EXPLAIN`, an index is being ignored when `key` is `NULL` and `type` is `ALL`, even though a suitable index exists.

Before you read any plan, refresh the statistics of the tables involved (see *EXPLAIN*, step zero). A plan built on stale statistics can look wrong for reasons that have nothing to do with your query:

```sql run
ANALYZE TABLE customer, film, payment;
```

## Cause 1: a function on the column

Wrapping the column in a function forces MySQL to compute it for every row, so it cannot **search** the index: it can only read the whole index from start to end (`type: index`) instead of jumping to the right part (`type: range`). Here `payment_date` is inside `YEAR()`:

```sql run as=root destructive
CREATE TABLE payment_plain AS SELECT * FROM payment;
CREATE INDEX idx_date ON payment_plain (payment_date);

EXPLAIN SELECT COUNT(*) FROM payment_plain WHERE YEAR(payment_date) = 2005;
```

Rewrite it as a range on the bare column, and the index works:

```sql run as=root destructive
EXPLAIN SELECT COUNT(*) FROM payment_plain
WHERE payment_date >= '2005-01-01' AND payment_date < '2006-01-01';
```

The results are identical, but the second plan is a `range` that reads only the entries inside the year, while the first reads every entry. **Keep the column on its own side of the comparison.**

## Cause 2: a leading wildcard

A `LIKE` that starts with `%` cannot use an index, because the index is sorted by the *start* of the text:

```sql run
EXPLAIN SELECT * FROM customer WHERE last_name LIKE '%SON';
```

```sql run
EXPLAIN SELECT * FROM customer WHERE last_name LIKE 'SON%';
```

`'SON%'` (a known start) is a range on the index. `'%SON'` scans every row. For real text searching, use a `FULLTEXT` index.

## Cause 3: comparing different types

Comparing a text column with a **number** makes MySQL convert every stored value, so the index cannot be used. `film.title` is text and indexed:

```sql run
EXPLAIN SELECT * FROM film WHERE title = 12345;
```

```sql run
EXPLAIN SELECT * FROM film WHERE title = '12345';
```

The first converts each title to a number for the comparison (a full scan). The second compares text with text and uses the index. **Match the type of the column.**

## Cause 4: an OR where one side has no index

An `OR` needs **both** sides to be searchable. If either column has no index, MySQL has to scan the whole table anyway, because it cannot skip the rows that might match the unindexed side. `film.title` is indexed but `film.length` is not:

```sql run
EXPLAIN SELECT film_id FROM film WHERE title = 'ACADEMY DINOSAUR' OR length = 86;
```

When **both** columns are indexed, MySQL *may* look each one up and merge the results (you will see `index_merge` in `EXPLAIN`), but it is the optimiser's choice, made from its statistics, and it can go either way. You cannot rely on it. The reliable fixes are to index the other column too (`CREATE INDEX idx_length ON film (length)`), or to split the query into two indexed lookups joined with `UNION`.

## Cause 5: the index is not selective

If a value matches nearly the whole table, jumping around an index costs more than reading straight through, so MySQL (rightly) chooses a full scan even though an index exists. Every film in this database has `language_id = 1`, and `language_id` is indexed. Look at `possible_keys` and `key`:

```sql run
EXPLAIN SELECT * FROM film WHERE language_id = 1;
```

The index is *possible*, but `key` is `NULL`: MySQL decided reading the table is cheaper. Compare with a more selective value on an index:

```sql run
EXPLAIN SELECT * FROM film WHERE title = 'ACADEMY DINOSAUR';
```

This is why an index on a column with few different values (a flag, or a status) helps so little.

## Cause 6: the wrong leading column

An index on `(a, b)` cannot serve a query on `b` alone (the leftmost-prefix rule from the last page).

## Try it yourself

Find a query of your own that uses a function on an indexed column, `EXPLAIN` it, then rewrite it as a range.

## Watch out

### Even `WHERE col + 1 = 10` breaks the index

Any arithmetic on the column does. Move the arithmetic to the other side: `WHERE col = 9`.

### A different collation or character set can hide an index

Joining two text columns with different collations can stop an index being used. Keep the same character set and collation across related columns.

### The optimiser has the last word

MySQL may skip a perfectly good index when it judges a scan cheaper. `EXPLAIN` tells you what it decided. If you disagree, refresh statistics with `ANALYZE TABLE` first, before reaching for hints.

## Interview corner

**"You added an index, but `EXPLAIN` still shows `type: ALL`. Why?"**
The query probably cannot use it: a function or calculation on the indexed column, a leading wildcard, a type mismatch, or an `OR` with an unindexed side. Rewrite the condition so the bare column is compared with a constant. It may also be that the value is not selective enough.

**"Why is `LIKE '%text'` slow?"**
The index is ordered by the start of the text, so a leading wildcard gives no starting point.

**"How do you write `WHERE YEAR(d) = 2005` so it uses an index?"**
`d >= '2005-01-01' AND d < '2006-01-01'`.

## Practice

### Warm-up: rewrite the function

The query `SELECT COUNT(*) FROM rental WHERE YEAR(rental_date) = 2005` has a function on the column. Rewrite it as a range and return the count as `rentals_2005`.

```sql practice
-- hint: `rental_date >= '2005-01-01' AND rental_date < '2006-01-01'`.
SELECT COUNT(*) AS rentals_2005
FROM rental
WHERE rental_date >= '2005-01-01' AND rental_date < '2006-01-01';
```

### Core: which form uses the index?

Run `EXPLAIN` on `SELECT * FROM customer WHERE last_name LIKE 'WIL%'` and read the `type`.

```sql practice
-- hint: A known start of the text gives a range on the index.
EXPLAIN SELECT * FROM customer WHERE last_name LIKE 'WIL%';
```

### Stretch: fix a type mismatch

The query `SELECT title FROM film WHERE title = 20` compares text with a number. Rewrite it to compare with a text value, `'20'`, and run `EXPLAIN` on the rewritten query.

```sql practice
-- hint: Put quotes around the value so it is text.
EXPLAIN SELECT title FROM film WHERE title = '20';
```
