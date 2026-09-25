---
title: "Operators"
order: 0
---

An operator is a symbol that combines or compares values: `+`, `=`, `AND`. You have already met a few. This page collects them, because every `WHERE` clause you write is built from them.

## What you'll learn

- Arithmetic operators (`+ - * / DIV %`)
- Comparison operators (`= <> < > <= >= <=>`)
- Logical operators (`AND OR NOT`)
- Which operator wins when you mix them

## Syntax

```sql show
value1 operator value2
```

## Examples

### Arithmetic

```sql run
SELECT 7 + 2 AS plus, 7 - 2 AS minus, 7 * 2 AS times, 7 / 2 AS divide;
```

Note that `/` gives a decimal answer. Two more operators deal with whole numbers:

```sql run
SELECT 7 DIV 2 AS whole_part, 7 % 2 AS remainder;
```

`DIV` is whole-number division, and `%` (or `MOD`) is the remainder. The remainder is useful for questions like "is this number even?" (`n % 2 = 0`).

### Comparison

A comparison gives `1` (true), `0` (false) or `NULL` (unknown):

```sql run
SELECT 5 = 5 AS equal, 5 <> 6 AS not_equal, 5 > 6 AS bigger, 5 <= 5 AS at_most;
```

`<>` and `!=` both mean "not equal". Text comparisons ignore case by default:

```sql run
SELECT 'a' = 'A' AS same_letter;
```

### The NULL-safe equals

Ordinary `=` cannot compare with `NULL`, because "unknown equals unknown" is still unknown. The special operator `<=>` treats two `NULL`s as equal:

```sql run
SELECT NULL = NULL AS with_equals, NULL <=> NULL AS null_safe, 1 <=> 1 AS also_works;
```

### Logical

`AND` needs both sides true. `OR` needs at least one. `NOT` flips a result:

```sql run
SELECT (1 = 1 AND 2 = 2) AS both_true, (1 = 2 OR 2 = 2) AS one_true, NOT (1 = 2) AS flipped;
```

### Who goes first?

Like in school maths, some operators bind tighter. `AND` runs before `OR`, so these two are different:

```sql run
SELECT (TRUE OR FALSE AND FALSE) AS and_first, ((TRUE OR FALSE) AND FALSE) AS brackets_first;
```

Brackets always win. Use them whenever you mix `AND` and `OR`.

## Try it yourself

Try `SELECT 10 / 4, 10 DIV 4, 10 % 4;` in your lab, then invent three of your own.

## Watch out

### Dividing by zero gives NULL, not an error

```sql run
SELECT 10 / 0 AS result;
```

The result is empty (`NULL`) and MySQL only records a warning, so a bad divisor quietly produces blanks in a report.

### `div` is a reserved word

Words like `DIV`, `ORDER`, `SELECT` and `GROUP` mean something to MySQL, so they make bad column aliases:

```sql run error
SELECT 5 / 2 AS div;
```

Pick another name (`quotient`), or wrap the word in backticks.

### There is no `==`

Equality in SQL is a single `=`. In `SELECT` it compares; in `UPDATE ... SET` it assigns. Which one it is depends on where it stands.

## Interview corner

**"What is the difference between `/` and `DIV`?"**
`/` returns a decimal (`7 / 2 = 3.5`), and `DIV` returns only the whole part (`7 DIV 2 = 3`).

**"What does `<=>` do?"**
It is the NULL-safe equality operator. `NULL <=> NULL` is true, while `NULL = NULL` is `NULL`.

**"Which is evaluated first, `AND` or `OR`?"**
`AND`. That is why `a OR b AND c` means `a OR (b AND c)`.

## Practice

### Warm-up: whole numbers and remainders

Return the whole-number result of `47 DIV 5` as `quotient` and the remainder of `47 % 5` as `remainder`.

```sql practice
-- hint: One SELECT with two expressions, each with an alias.
SELECT 47 DIV 5 AS quotient, 47 % 5 AS remainder;
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

Show each film's `title`, `length`, and a column `is_even` that is `1` when the length is even and `0` when it is odd. Order by `film_id`.

```sql practice
-- hint: `length % 2 = 0` is itself a value: 1 or 0.
SELECT title, length, length % 2 = 0 AS is_even
FROM film
ORDER BY film_id;
```
