---
title: "Number Functions"
order: 0
---

Number functions round, cut and reshape numeric values. Money, prices and measurements pass through them constantly.

## What you'll learn

- Rounding: `round`, `ceil`, `floor`, `trunc`
- `abs`, `mod`, `power` and `sqrt`
- The difference between rounding and truncating
- Why money belongs in `numeric`

## Syntax

```sql show
SELECT round(value, decimals), ceil(value), floor(value), trunc(value, decimals);
```

## Examples

### round

`round(x, d)` rounds to `d` decimal places. A negative number of places rounds to the left of the decimal point:

```sql run
SELECT round(3.14159, 2) AS two_places, round(2.5) AS half, round(1234.567, -2) AS hundreds;
```

### ceil and floor

`ceil` always rounds up, and `floor` always rounds down:

```sql run
SELECT ceil(4.1) AS up, floor(4.9) AS down, ceil(-4.1) AS up_negative, floor(-4.1) AS down_negative;
```

Each film's length is stored in minutes. Whole hours needed to show it (rounded up):

```sql run
SELECT title, length, ceil(length / 60.0) AS hours_needed
FROM film
ORDER BY film_id
LIMIT 3;
```

### trunc

`trunc(x, d)` just cuts the extra digits and never rounds:

```sql run
SELECT trunc(9.999, 2) AS cut, round(9.999, 2) AS rounded;
```

### abs, mod, power, sqrt

```sql run
SELECT abs(-7) AS absolute, mod(17, 5) AS remainder, power(2, 8) AS two_to_the_eighth, sqrt(144) AS root;
```

### In a real query

A film's price per hour of running time, to 2 decimal places:

```sql run
SELECT title, round(rental_rate / (length / 60.0), 2) AS price_per_hour
FROM film
ORDER BY film_id
LIMIT 3;
```

## Try it yourself

Round each film's `replacement_cost` to the nearest whole dollar, then to the nearest ten dollars.

## Watch out

### round(x, d) needs numeric, not double precision

`round(value, 2)` exists for the exact type `numeric`, but not for the approximate type `double precision`:

```sql run error
SELECT round(3.14159::double precision, 2);
```

Cast to `numeric` first: `round(x::numeric, 2)`.

### Exact numbers versus approximate numbers

`numeric` (also written `decimal`) is exact. `real` and `double precision` are binary approximations:

```sql run
SELECT 0.1::numeric + 0.2::numeric = 0.3::numeric AS numeric_sum,
       0.1::float8 + 0.2::float8 = 0.3::float8 AS float_sum;
```

Store money in `numeric`, never in a float, and you avoid the whole problem.

### Round late, not early

Round the final answer, not the numbers you calculate with. Rounding at each step lets small errors pile up.

### Negative numbers and ceil/floor

`ceil(-4.1)` is `-4` (up towards zero) and `floor(-4.1)` is `-5`. "Down" means towards negative infinity, not towards zero.

### round(2.5) depends on the type

For `numeric`, halves round away from zero (`2.5` becomes `3`). For `double precision`, PostgreSQL follows the machine's rule ("round half to even"), so `round(2.5::float8)` is `2`.

## Interview corner

**"What is the difference between `round` and `trunc`?"**
`round` gives the nearest value. `trunc` just drops the extra digits.

**"Why should money be stored as `numeric`?"**
`numeric` is exact. `real` and `double precision` are binary approximations, so amounts like `0.1` cannot be stored exactly and errors can build up.

**"How do you get a decimal result from `7 / 2`?"**
Make one side a decimal: `7 / 2.0`, or `7::numeric / 2`.

## Practice

### Warm-up: rounding

Show each film's `title` and its `replacement_cost` rounded to the nearest whole dollar, as `rounded_cost`. Order by `film_id`. Show the first rows.

```sql practice
-- hint: `round(replacement_cost)`; the column is `numeric`, so it works.
SELECT title, round(replacement_cost) AS rounded_cost
FROM film
ORDER BY film_id;
```

### Core: hours

Show each film's `title` and its length in **whole hours rounded down** as `full_hours`, and the leftover minutes as `extra_minutes`. Order by `film_id`. Show the first rows.

```sql practice
-- hint: `length / 60` is whole division; `length % 60` is the remainder.
SELECT title, length / 60 AS full_hours, length % 60 AS extra_minutes
FROM film
ORDER BY film_id;
```

### Stretch: price per rental hour

Show `title` and the rental price per hour of running time, to 2 decimal places, as `price_per_hour`, for the films longer than 170 minutes only. Cheapest per hour first, then title.

```sql practice
-- hint: `round(rental_rate / (length / 60.0), 2)`.
SELECT title, round(rental_rate / (length / 60.0), 2) AS price_per_hour
FROM film
WHERE length > 170
ORDER BY price_per_hour, title;
```
