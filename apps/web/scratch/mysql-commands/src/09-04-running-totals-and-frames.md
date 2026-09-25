---
title: "Running Totals, Moving Averages and NTILE"
order: 0
---

Give a window an `ORDER BY` and it can accumulate as it goes: a running total, a moving average, a share of everything so far. A **frame** controls exactly which rows around the current one are included.

## What you'll learn

- Running totals with `SUM() OVER (ORDER BY ...)`
- Frames: `ROWS BETWEEN ...`
- Moving averages
- `NTILE` to split rows into equal groups

## Syntax

```sql show
SUM(column) OVER (
  PARTITION BY group_column
  ORDER BY sort_column
  ROWS BETWEEN start AND end
)
```

Common frame edges: `UNBOUNDED PRECEDING` (from the first row), `n PRECEDING`, `CURRENT ROW`, `n FOLLOWING`, `UNBOUNDED FOLLOWING`.

## Examples

### A running total

Customer 1's payments, with the total so far:

```sql run
SELECT payment_id, payment_date, amount,
       SUM(amount) OVER (ORDER BY payment_date, payment_id) AS running_total
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id;
```

### A running total per group

Add `PARTITION BY` and the total restarts for each customer:

```sql run
SELECT customer_id, payment_id, amount,
       SUM(amount) OVER (PARTITION BY customer_id ORDER BY payment_date, payment_id) AS running_total
FROM payment
WHERE customer_id IN (1, 2)
ORDER BY customer_id, payment_date, payment_id;
```

### A moving average

Average of the current payment and the two before it, using a frame:

```sql run
SELECT payment_id, amount,
       ROUND(AVG(amount) OVER (
         ORDER BY payment_date, payment_id
         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
       ), 2) AS moving_avg_3
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id;
```

### First and last in the window

```sql run
SELECT payment_id, amount,
       FIRST_VALUE(amount) OVER (ORDER BY payment_date, payment_id) AS first_payment_amount,
       LAST_VALUE(amount) OVER (
         ORDER BY payment_date, payment_id
         ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
       ) AS last_payment_amount
FROM payment
WHERE customer_id = 1
ORDER BY payment_date, payment_id;
```

### NTILE: equal-sized buckets

`NTILE(4)` splits the ordered rows into 4 groups of (nearly) equal size, which is a quick way to get quartiles. Customers by spending:

```sql run
SELECT customer_id, total_spent,
       NTILE(4) OVER (ORDER BY total_spent DESC) AS spending_quartile
FROM (SELECT customer_id, SUM(amount) AS total_spent FROM payment GROUP BY customer_id) AS per_customer
ORDER BY total_spent DESC, customer_id;
```

Quartile 1 is the top spenders.

## Try it yourself

Calculate a running count of rentals per day, and a 7-row moving average of daily payment totals.

## Watch out

### The default frame counts tied rows together

When you write `ORDER BY` but no frame, MySQL uses `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which treats rows with the **same** sort value as one block. See what happens with tied film lengths:

```sql run
SELECT title, length,
       COUNT(*) OVER (ORDER BY length) AS default_frame,
       COUNT(*) OVER (ORDER BY length ROWS UNBOUNDED PRECEDING) AS rows_frame
FROM film
ORDER BY length, title;
```

With the default frame, all films of length 46 show the same count. With `ROWS`, the count goes up one row at a time. For a true row-by-row running total, say `ROWS`, or add a unique column to the `ORDER BY`.

### LAST_VALUE needs a wider frame

With the default frame, the "last row" is only the current row. To reach the real last row, extend the frame to `UNBOUNDED FOLLOWING`, as above.

### NTILE splits by count, not by value

Rows with the same value can land in different groups. The groups are equal in **size**, not in range.

## Interview corner

**"How do you calculate a running total?"**
`SUM(value) OVER (ORDER BY date)`. For a total that restarts per group, add `PARTITION BY`.

**"What is a window frame?"**
The set of rows around the current row that the function looks at, defined with `ROWS` or `RANGE BETWEEN ... AND ...`.

**"What is the difference between `ROWS` and `RANGE`?"**
`ROWS` counts physical rows. `RANGE` groups rows with equal sort values together, so tied rows share the same result.

## Practice

### Warm-up: running total of payments

For customer 3, show `payment_id`, `amount` and `running_total` in date order (break ties by `payment_id`), and show the first rows.

```sql practice rows=5
-- hint: `SUM(amount) OVER (ORDER BY payment_date, payment_id)`.
SELECT payment_id, amount,
       SUM(amount) OVER (ORDER BY payment_date, payment_id) AS running_total
FROM payment
WHERE customer_id = 3
ORDER BY payment_date, payment_id;
```

### Core: three-payment moving average

For customer 3, show `payment_id` and the moving average of the last three payments (including the current one) as `moving_avg`, rounded to 2 decimals. Show the first rows.

```sql practice rows=5
-- hint: `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`.
SELECT payment_id,
       ROUND(AVG(amount) OVER (ORDER BY payment_date, payment_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg
FROM payment
WHERE customer_id = 3
ORDER BY payment_date, payment_id;
```

### Stretch: quartile sizes

Split all customers into 4 spending quartiles with `NTILE(4)` (most spent = quartile 1), then show for each quartile the number of customers (`customers`) and the smallest and largest total (`min_spent`, `max_spent`). Order by quartile.

```sql practice
-- hint: A CTE with NTILE, then GROUP BY the quartile.
WITH per_customer AS (
  SELECT customer_id, SUM(amount) AS total_spent
  FROM payment
  GROUP BY customer_id
),
quartiles AS (
  SELECT customer_id, total_spent, NTILE(4) OVER (ORDER BY total_spent DESC) AS quartile
  FROM per_customer
)
SELECT quartile, COUNT(*) AS customers, MIN(total_spent) AS min_spent, MAX(total_spent) AS max_spent
FROM quartiles
GROUP BY quartile
ORDER BY quartile;
```
