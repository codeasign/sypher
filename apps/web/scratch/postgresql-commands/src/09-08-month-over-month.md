---
title: "Interview Problem: Month over Month Change"
order: 0
---

"Calculate the growth in revenue compared with the previous month" combines aggregation with a window function. It is a favourite in analyst interviews because it is what real reports do.

## What you'll learn

- Aggregating to one row per month
- Comparing with the previous row using `LAG`
- Calculating a percentage change safely
- Filling missing months with `generate_series`

## The problem

For each month, show the revenue, the revenue of the previous month, and the percentage change.

## Step 1: revenue per month

```sql run
SELECT date_trunc('month', payment_date)::date AS month, SUM(amount) AS revenue
FROM payment
GROUP BY 1
ORDER BY 1;
```

## Step 2: add the previous month with LAG

Aggregate first, in a CTE. Then apply `LAG` to that one-row-per-month result:

```sql run
WITH monthly AS (
  SELECT date_trunc('month', payment_date)::date AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY 1
)
SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS previous_revenue
FROM monthly
ORDER BY month
LIMIT 4;
```

## Step 3: the change and the percentage

```sql run
WITH monthly AS (
  SELECT date_trunc('month', payment_date)::date AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY 1
),
with_prev AS (
  SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS previous_revenue FROM monthly
)
SELECT month, revenue, previous_revenue,
       revenue - previous_revenue AS change_amount,
       round(100.0 * (revenue - previous_revenue) / NULLIF(previous_revenue, 0), 1) AS change_percent
FROM with_prev
ORDER BY month;
```

`NULLIF(previous_revenue, 0)` avoids dividing by zero, and the first month has no previous month, so its change is `NULL`.

## Year-to-date and share of the total

The same monthly result can feed other window calculations. Running total and each month's share of all revenue:

```sql run
WITH monthly AS (
  SELECT date_trunc('month', payment_date)::date AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY 1
)
SELECT month, revenue,
       SUM(revenue) OVER (ORDER BY month) AS running_total,
       round(100 * revenue / SUM(revenue) OVER (), 1) AS share_of_total
FROM monthly
ORDER BY month
LIMIT 4;
```

## Try it yourself

Calculate the month-over-month change in the **number of payments**, and the change per staff member.

## Watch out

### LAG follows the rows, not the calendar

`LAG` returns the previous **row**. If a month has no data at all, there is no row for it, and the "previous month" will really be the last month that has data. If you need real calendar months, generate the month list first and `LEFT JOIN` the revenue onto it:

```sql run
WITH months AS (
  SELECT generate_series(date '2006-11-01', date '2007-02-01', interval '1 month')::date AS month
),
monthly AS (
  SELECT date_trunc('month', payment_date)::date AS month, SUM(amount) AS revenue
  FROM payment GROUP BY 1
)
SELECT m.month, COALESCE(mo.revenue, 0) AS revenue
FROM months m
LEFT JOIN monthly mo ON mo.month = m.month
ORDER BY m.month;
```

### Aggregate first, then LAG

Applying `LAG` over individual payments compares one payment with the previous payment, not one month with the previous month.

### A percentage of zero

If the previous value can be 0, dividing by it raises an error. `NULLIF(previous, 0)` turns that into `NULL`.

### Sort months as text carefully

`'YYYY-MM'` sorts correctly as text (`2007-05` before `2007-06`). A format like `'MM/YYYY'` does not. Better still, keep a real `date` from `date_trunc`.

## Interview corner

**"How do you compute month-over-month growth in SQL?"**
Aggregate to one row per month in a CTE, then `LAG(total) OVER (ORDER BY month)`, and compute `(total - previous) / previous`.

**"How do you handle the first month?"**
`LAG` returns `NULL` for it, so the change is `NULL`. You can also supply a default with `LAG(total, 1, 0)`, but then the change for the first month becomes misleading.

**"What about months with no data?"**
Generate the full list of months (`generate_series` or a calendar table) and `LEFT JOIN` the data, so empty months appear with zero.

## Practice

### Warm-up: payments per month

Show `month` (format `YYYY-MM`) and the number of payments (`payments`) for each month, in order.

```sql practice
-- hint: `to_char(payment_date, 'YYYY-MM')`, `COUNT(*)`, group by 1.
SELECT to_char(payment_date, 'YYYY-MM') AS month, COUNT(*) AS payments
FROM payment
GROUP BY 1
ORDER BY 1;
```

### Core: change in payments

For each month show `month`, `payments` and `change_from_previous`: the payments minus the payments of the previous month with data (`NULL` for the first). In month order.

```sql practice
-- hint: Count per month in a CTE, then `payments - LAG(payments) OVER (ORDER BY month)`.
WITH monthly AS (
  SELECT to_char(payment_date, 'YYYY-MM') AS month, COUNT(*) AS payments
  FROM payment
  GROUP BY 1
)
SELECT month, payments, payments - LAG(payments) OVER (ORDER BY month) AS change_from_previous
FROM monthly
ORDER BY month;
```

### Stretch: best month per store

For each staff member (`staff_id`), show the month with the highest revenue (`month`, `YYYY-MM`) and that revenue (`best_revenue`). Order by `staff_id`.

```sql practice
-- hint: Revenue per staff and month, `ROW_NUMBER() OVER (PARTITION BY staff_id ORDER BY revenue DESC)`, keep 1.
WITH monthly AS (
  SELECT staff_id, to_char(payment_date, 'YYYY-MM') AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY staff_id, month
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY staff_id ORDER BY revenue DESC, month) AS rn FROM monthly
)
SELECT staff_id, month, revenue AS best_revenue
FROM ranked
WHERE rn = 1
ORDER BY staff_id;
```
