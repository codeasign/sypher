---
title: "Number Functions"
order: 0
---

Number functions round, cut and reshape numeric values. Money, prices and measurements pass through them constantly.

## What you'll learn

- Rounding: `ROUND`, `CEIL`, `FLOOR`, `TRUNCATE`
- `ABS`, `MOD` and `POWER`
- The difference between rounding and truncating

## Syntax

```sql show
SELECT ROUND(number, decimal_places);
```

## Examples

### ROUND

`ROUND(x, d)` rounds to `d` decimal places:

```sql run
SELECT ROUND(1234.5678) AS whole,
       ROUND(1234.5678, 2) AS two_places,
       ROUND(1234.5678, -2) AS to_hundreds;
```

A negative number of places rounds to the left of the decimal point.

### CEIL and FLOOR

`CEIL` always rounds up, and `FLOOR` always rounds down:

```sql run
SELECT CEIL(4.1) AS ceil_of_4_1, FLOOR(4.9) AS floor_of_4_9;
```

Each film's length is stored in minutes. Whole hours needed to show it (rounded up):

```sql run
SELECT title, length, CEIL(length / 60) AS hours_needed
FROM film
ORDER BY film_id;
```

### TRUNCATE

`TRUNCATE(x, d)` just cuts the extra digits and never rounds:

```sql run
SELECT ROUND(1234.5678, 2) AS rounded, TRUNCATE(1234.5678, 2) AS truncated;
```

### ABS, MOD and POWER

```sql run
SELECT ABS(-7) AS absolute, MOD(17, 5) AS remainder, POWER(2, 10) AS two_to_the_ten;
```

### In a real query

A film's price per hour of running time, to 2 decimal places:

```sql run
SELECT title, ROUND(rental_rate / length * 60, 2) AS price_per_hour
FROM film
ORDER BY price_per_hour DESC, title;
```

## Try it yourself

Round each film's `replacement_cost` to the nearest whole dollar, then to the nearest ten dollars.

## Watch out

### ROUND is not the same for every kind of number

For exact numbers such as prices (`DECIMAL`), `.5` rounds away from zero, like in school. For approximate numbers (`FLOAT` and `DOUBLE`), MySQL uses the computer's own rule, which can round differently:

```sql run
SELECT ROUND(2.5) AS exact_value, ROUND(2.5e0) AS approximate_value;
```

Store money in `DECIMAL`, never in `FLOAT`, and you avoid the whole problem.

### Round late, not early

Round the final answer, not the numbers you calculate with. Rounding at each step lets small errors pile up.

### Negative numbers and CEIL/FLOOR

`CEIL(-4.1)` is `-4` (up towards zero) and `FLOOR(-4.1)` is `-5`. "Down" means towards negative infinity, not towards zero.

## Interview corner

**"What is the difference between `ROUND` and `TRUNCATE`?"**
`ROUND` gives the nearest value. `TRUNCATE` just drops the extra digits.

**"Why should money be stored as `DECIMAL`?"**
`DECIMAL` is exact. `FLOAT` and `DOUBLE` are binary approximations, so amounts like `0.1` cannot be stored exactly and errors can build up.

## Practice

### Warm-up: rounding

Show each film's `title` and its `replacement_cost` rounded to the nearest whole dollar, as `rounded_cost`. Order by `film_id`.

```sql practice
-- hint: `ROUND(replacement_cost)`.
SELECT title, ROUND(replacement_cost) AS rounded_cost
FROM film
ORDER BY film_id;
```

### Core: hours

Show each film's `title` and its length in **whole hours rounded down** as `full_hours`, and the leftover minutes as `extra_minutes`. Order by `film_id`.

```sql practice
-- hint: Use `FLOOR(length / 60)` and `MOD(length, 60)`.
SELECT title, FLOOR(length / 60) AS full_hours, MOD(length, 60) AS extra_minutes
FROM film
ORDER BY film_id;
```

### Stretch: price per rental hour

Show `title` and the rental price per hour of running time, to 2 decimal places, as `price_per_hour`, for the films longer than 170 minutes only. Cheapest per hour first, then title.

```sql practice
-- hint: `ROUND(rental_rate / length * 60, 2)`, with a WHERE on length.
SELECT title, ROUND(rental_rate / length * 60, 2) AS price_per_hour
FROM film
WHERE length > 170
ORDER BY price_per_hour, title;
```
