---
title: "Interview Problem: Month-over-Month Change"
order: 0
---

"Calculate the growth in revenue compared with the previous month" combines aggregation with a window function. It is a favourite in analyst interviews because it is what real reports do.

## What you'll learn

- Aggregating to one row per month
- Comparing with the previous row using `LAG`
- Calculating a percentage change safely

## The problem

For each month, show the revenue, the revenue of the previous month, and the percentage change.

## Step 1: revenue per month

```sql run
SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
       SUM(amount) AS revenue
FROM payment
GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
ORDER BY month;
```

## Step 2: add the previous month with LAG

Aggregate first, in a CTE. Then apply `LAG` to that one-row-per-month result:

```sql run
WITH monthly AS (
  SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
         SUM(amount) AS revenue
  FROM payment
  GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS previous_revenue
FROM monthly
ORDER BY month;
```

## Step 3: the change and the percentage

```sql run
WITH monthly AS (
  SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
         SUM(amount) AS revenue
  FROM payment
  GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
),
with_previous AS (
  SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS previous_revenue
  FROM monthly
)
SELECT month,
       revenue,
       previous_revenue,
       revenue - previous_revenue AS change_amount,
       ROUND(100 * (revenue - previous_revenue) / NULLIF(previous_revenue, 0), 1) AS change_percent
FROM with_previous
ORDER BY month;
```

`NULLIF(previous_revenue, 0)` avoids dividing by zero, and the first month has no previous month, so its change is `NULL`.

## Year-to-date and share of the total

The same monthly result can feed other window calculations. Running total and each month's share of all revenue:

```sql run
WITH monthly AS (
  SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
         SUM(amount) AS revenue
  FROM payment
  GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
)
SELECT month,
       revenue,
       SUM(revenue) OVER (ORDER BY month) AS running_revenue,
       ROUND(100 * revenue / SUM(revenue) OVER (), 1) AS percent_of_total
FROM monthly
ORDER BY month;
```

## Try it yourself

Calculate the month-over-month change in the **number of rentals**, and the change per store.

## Watch out

### LAG follows the rows, not the calendar

`LAG` returns the previous **row**. If a month has no data at all, there is no row for it, and the "previous month" will really be the last month that has data. Look at the gap between August 2005 and February 2006 above: the February row is compared with August. If you need real calendar months, generate the month list first (a recursive CTE) and `LEFT JOIN` the revenue onto it.

### Aggregate first, then LAG

Applying `LAG` over individual payments compares one payment with the previous payment, not one month with the previous month.

### A percentage of zero

If the previous value can be 0, dividing by it fails. `NULLIF(previous, 0)` turns that into `NULL`.

### Sort months as text carefully

`'%Y-%m'` sorts correctly as text (`2005-05` before `2005-06`). A format like `'%m/%Y'` does not.

## Interview corner

**"How do you compute month-over-month growth in SQL?"**
Aggregate to one row per month in a CTE, then `LAG(total) OVER (ORDER BY month)`, and compute `(total - previous) / previous`.

**"How do you handle the first month?"**
`LAG` returns `NULL` for it, so the change is `NULL`. You can also supply a default with `LAG(total, 1, 0)`.

**"What about months with no data?"**
Generate the full list of months (a recursive CTE or a calendar table) and `LEFT JOIN` the data, so empty months appear with zero.

## Practice

### Warm-up: rentals per month

Show `month` (format `YYYY-MM`) and the number of rentals (`rentals`) for each month, in order.

```sql practice
-- hint: Group by `DATE_FORMAT(rental_date, '%Y-%m')`.
SELECT DATE_FORMAT(rental_date, '%Y-%m') AS month, COUNT(*) AS rentals
FROM rental
GROUP BY DATE_FORMAT(rental_date, '%Y-%m')
ORDER BY month;
```

### Core: change in rentals

For each month show `month`, `rentals` and `change_from_previous`: the rentals minus the rentals of the previous month with data (`NULL` for the first). In month order.

```sql practice
-- hint: Aggregate in a CTE, then `rentals - LAG(rentals) OVER (ORDER BY month)`.
WITH monthly AS (
  SELECT DATE_FORMAT(rental_date, '%Y-%m') AS month, COUNT(*) AS rentals
  FROM rental
  GROUP BY DATE_FORMAT(rental_date, '%Y-%m')
)
SELECT month, rentals, rentals - LAG(rentals) OVER (ORDER BY month) AS change_from_previous
FROM monthly
ORDER BY month;
```

### Stretch: best month per store

For each store (`store_id` from the customer's home store) show the **month with the highest revenue** and that revenue (`best_revenue`). Order by store.

```sql practice
-- hint: Revenue per store per month in a CTE, then ROW_NUMBER partitioned by store, ordered by revenue descending.
WITH monthly AS (
  SELECT c.store_id, DATE_FORMAT(p.payment_date, '%Y-%m') AS month, SUM(p.amount) AS revenue
  FROM payment AS p
  JOIN customer AS c ON c.customer_id = p.customer_id
  GROUP BY c.store_id, DATE_FORMAT(p.payment_date, '%Y-%m')
),
ranked AS (
  SELECT store_id, month, revenue,
         ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY revenue DESC, month) AS rn
  FROM monthly
)
SELECT store_id, month, revenue AS best_revenue
FROM ranked
WHERE rn = 1
ORDER BY store_id;
```
