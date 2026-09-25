---
title: "Operators"
order: 0
---

An operator is a symbol that combines or compares values: `+`, `=`, `AND`. This page collects them, because every `WHERE` clause you write is built from them.

## What you'll learn

- Arithmetic operators (`+ - * / % ^`)
- Comparison operators (`= <> < > <= >=`) and `IS DISTINCT FROM`
- Logical operators (`AND OR NOT`)
- Which operator wins when you mix them

## Syntax

```sql show
SELECT 10 + 5, 10 - 5, 10 * 5, 10 / 5, 10 % 3, 2 ^ 3;
SELECT a = b, a <> b, a < b, a >= b;
SELECT a AND b, a OR b, NOT a;
```

## Examples

### Arithmetic

```sql run
SELECT 10 + 5 AS plus, 10 - 5 AS minus, 10 * 5 AS times, 2 ^ 10 AS power;
```

Division of two whole numbers gives a **whole** number. Make one side a decimal to get decimals:

```sql run
SELECT 7 / 2 AS whole, 7 / 2.0 AS decimal, 7 % 2 AS remainder, div(7, 2) AS also_whole;
```

`%` (or `mod()`) is the remainder. It is useful for questions like "is this number even?" (`n % 2 = 0`).

### Comparison

A comparison gives `t` (true), `f` (false) or `NULL` (unknown):

```sql run
SELECT 5 > 3 AS bigger, 5 = 3 AS equal, 5 <> 3 AS different, NULL = NULL AS null_equals_null;
```

`<>` and `!=` both mean "not equal". Unlike MySQL, **text comparison is case-sensitive**:

```sql run
SELECT 'abc' = 'ABC' AS same_case_insensitive, lower('abc') = lower('ABC') AS after_lower;
```

### The NULL-safe comparison

Ordinary `=` cannot compare with `NULL`, because "unknown equals unknown" is still unknown. PostgreSQL's `IS DISTINCT FROM` treats two `NULL`s as equal:

```sql run
SELECT NULL IS DISTINCT FROM NULL AS both_null, 1 IS DISTINCT FROM NULL AS one_vs_null, 1 IS NOT DISTINCT FROM 1 AS same;
```

### Logical

`AND` needs both sides true. `OR` needs at least one. `NOT` flips a result:

```sql run
SELECT true AND false AS and_result, true OR false AS or_result, NOT true AS not_result;
```

### Who goes first?

Like in school maths, some operators bind tighter. `AND` runs before `OR`, so these two are different:

```sql run
SELECT true OR false AND false AS without_brackets, (true OR false) AND false AS with_brackets;
```

Brackets always win. Use them whenever you mix `AND` and `OR`.

## Try it yourself

Try `SELECT 10 / 4, 10 / 4.0, 10 % 4;` in your lab, then invent three of your own.

## Watch out

### Dividing by zero is an error

Unlike MySQL, PostgreSQL does not quietly return `NULL`:

```sql run error
SELECT 10 / 0;
```

Use `NULLIF(divisor, 0)` to turn a zero divisor into `NULL` (page 4.4).

### Whole-number division cuts the decimals

`7 / 2` is `3`, not `3.5`. This surprises people coming from other languages, and it silently damages averages and percentages you compute by hand. Write `7 / 2.0`, or cast one side (`7::numeric / 2`).

### There is no `==`, and no `<=>`

Equality is a single `=`. In `SELECT` it compares; in `UPDATE ... SET` it assigns. For NULL-safe equality use `IS NOT DISTINCT FROM`.

### Reserved words make bad names

Words like `order`, `group`, `user` and `select` mean something to PostgreSQL, so they make bad column aliases. If you must, wrap them in double quotes.

## Interview corner

**"What does `7 / 2` return in PostgreSQL?"**
`3`. Both sides are integers, so integer division is used. `7 / 2.0` returns `3.5000000000000000`.

**"What does `IS DISTINCT FROM` do?"**
It is a NULL-safe "not equal": `NULL IS DISTINCT FROM NULL` is false, and `1 IS DISTINCT FROM NULL` is true. Ordinary `<>` returns `NULL` in both cases.

**"Which is evaluated first, `AND` or `OR`?"**
`AND`. That is why `a OR b AND c` means `a OR (b AND c)`.

## Practice

### Warm-up: whole numbers and remainders

Return the whole-number result of `47 / 5` as `quotient` and the remainder of `47 % 5` as `remainder`.

```sql practice
-- hint: One SELECT with two expressions, each with an alias. Whole numbers divide to a whole number.
SELECT 47 / 5 AS quotient, 47 % 5 AS remainder;
```

### Core: price ratio

For each film show the `title` and how many rentals at the `rental_rate` it takes to pay back the `replacement_cost` (`replacement_cost / rental_rate`), as `rentals_to_recoup`. Order by `rentals_to_recoup` descending, then title.

```sql practice
-- hint: Divide the two columns and give the result an alias; ORDER BY can use the alias.
SELECT title, replacement_cost / rental_rate AS rentals_to_recoup
FROM film
ORDER BY rentals_to_recoup DESC, title;
```

### Stretch: even or odd

Show each film's `title`, `length`, and a column `is_even` that is `t` when the length is even and `f` when it is odd. Order by `film_id`.

```sql practice
-- hint: `length % 2 = 0` is itself a value: true or false.
SELECT title, length, length % 2 = 0 AS is_even
FROM film
ORDER BY film_id;
```
