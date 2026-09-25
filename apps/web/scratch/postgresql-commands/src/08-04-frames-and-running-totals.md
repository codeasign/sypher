---
title: "Running Totals and Frames"
order: 0
---

Give a window an `ORDER BY` and it can accumulate as it goes: a running total, a moving average, a share of everything so far. A **frame** controls exactly which rows around the current one are included.

## What you'll learn

- Running totals with `SUM() OVER (ORDER BY ...)`
- Frames: `ROWS BETWEEN ...` and `RANGE`
- Moving averages
- `FIRST_VALUE`, `LAST_VALUE`, and `FILTER` in windows

## Syntax

```sql show
SUM(column) OVER (
  PARTITION BY ...
  ORDER BY ...
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
```

Common frame edges: `UNBOUNDED PRECEDING` (from the first row), `n PRECEDING`, `CURRENT ROW`, `n FOLLOWING`, `UNBOUNDED FOLLOWING`.

## Examples

### A running total

Customer 1's payments, with the total so far:

```sql run
SELECT payment_id, amount,
       SUM(amount) OVER (ORDER BY payment_date, payment_id) AS running_total
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id
LIMIT 5;
```

### A running total per group

Add `PARTITION BY` and the total restarts for each customer:

```sql run
SELECT customer_id, payment_id, amount,
       SUM(amount) OVER (PARTITION BY customer_id ORDER BY payment_date, payment_id) AS running_total
FROM payment
WHERE customer_id <= 2
ORDER BY customer_id, payment_date, payment_id
LIMIT 5;
```

### A moving average

Average of the current payment and the two before it, using a frame:

```sql run
SELECT payment_id, amount,
       round(AVG(amount) OVER (ORDER BY payment_date, payment_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id
LIMIT 5;
```

### First and last in the window

`FIRST_VALUE` and `LAST_VALUE` read the first and last row of the frame. To reach the real last row, widen the frame:

```sql run
SELECT payment_id, amount,
       FIRST_VALUE(amount) OVER w AS first_amount,
       LAST_VALUE(amount) OVER w AS last_amount
FROM payment
WHERE customer_id = 1
WINDOW w AS (ORDER BY payment_date, payment_id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
ORDER BY payment_date, payment_id
LIMIT 3;
```

### A running count with a condition

Window aggregates accept `FILTER` too. How many payments so far were over 5 dollars?

```sql run
SELECT payment_id, amount,
       COUNT(*) FILTER (WHERE amount > 5) OVER (ORDER BY payment_date, payment_id) AS big_so_far
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id
LIMIT 5;
```

## Try it yourself

Calculate a running count of rentals per day, and a 7-row moving average of daily payment totals.

## Watch out

### The default frame counts tied rows together

When you write `ORDER BY` but no frame, PostgreSQL uses `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which treats rows with the **same** sort value as one block. See what happens with tied film lengths:

```sql run
SELECT film_id, length,
       COUNT(*) OVER (ORDER BY length) AS default_frame,
       COUNT(*) OVER (ORDER BY length ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame
FROM film
WHERE length = 46
ORDER BY film_id
LIMIT 3;
```

With the default frame, all films of length 46 show the same count. With `ROWS`, the count goes up one row at a time. For a true row-by-row running total, say `ROWS`, or add a unique column to the `ORDER BY`.

### LAST_VALUE needs a wider frame

With the default frame, the "last row" is only the current row. To reach the real last row, extend the frame to `UNBOUNDED FOLLOWING`, as above.

### Frames need an ORDER BY

`ROWS BETWEEN 2 PRECEDING ...` without `ORDER BY` in the window has no meaning, so PostgreSQL rejects it.

### GROUPS and EXCLUDE

PostgreSQL also has `GROUPS` frames (count peer groups, not rows) and `EXCLUDE CURRENT ROW`. You will rarely need them, but they exist.

## Interview corner

**"How do you calculate a running total?"**
`SUM(value) OVER (ORDER BY date)`. For a total that restarts per group, add `PARTITION BY`.

**"What is a window frame?"**
The set of rows around the current row that the function looks at, defined with `ROWS`, `RANGE` or `GROUPS BETWEEN ... AND ...`.

**"What is the difference between `ROWS` and `RANGE`?"**
`ROWS` counts physical rows. `RANGE` groups rows with equal sort values together, so tied rows share the same result.

## Practice

### Warm-up: running total of payments

For customer 3, show `payment_id`, `amount` and `running_total` in date order (break ties by `payment_id`), and show the first rows.

```sql practice
-- hint: `SUM(amount) OVER (ORDER BY payment_date, payment_id)`.
SELECT payment_id, amount,
       SUM(amount) OVER (ORDER BY payment_date, payment_id) AS running_total
FROM payment
WHERE customer_id = 3
ORDER BY payment_date, payment_id;
```

### Core: three-payment moving average

For customer 3, show `payment_id` and the moving average of the last three payments (including the current one) as `moving_avg`, rounded to 2 decimals. Show the first rows.

```sql practice
-- hint: `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`.
SELECT payment_id,
       round(AVG(amount) OVER (ORDER BY payment_date, payment_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg
FROM payment
WHERE customer_id = 3
ORDER BY payment_date, payment_id;
```

### Stretch: quartile sizes

Split all customers into 4 spending quartiles with `NTILE(4)` (most spent = quartile 1), then show for each quartile the number of customers (`customers`) and the smallest and largest total (`min_spent`, `max_spent`). Order by quartile.

```sql practice
-- hint: Total per customer in a CTE; `NTILE(4) OVER (ORDER BY total DESC, customer_id)` in a second; then GROUP BY quartile.
WITH totals AS (
  SELECT customer_id, SUM(amount) AS total FROM payment GROUP BY customer_id
),
q AS (
  SELECT customer_id, total, NTILE(4) OVER (ORDER BY total DESC, customer_id) AS quartile FROM totals
)
SELECT quartile, COUNT(*) AS customers, MIN(total) AS min_spent, MAX(total) AS max_spent
FROM q
GROUP BY quartile
ORDER BY quartile;
```
