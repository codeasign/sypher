---
title: "Final Project: Sypher DVD Rentals Analyst"
order: 0
---

Time to use everything. In this project you are the new data analyst at **Sypher DVD Rentals**, a small chain with two stores. The owner has ten questions, and you have the whole rental database to answer them with.

There is no lesson to read and no hand-holding. For each question you get the question in plain business language, the tables it involves, and **what your result should look like**. You write the query. When you are done, compare your result with the expected one, and only then open the *Project Solutions* page.

## How to work

1. Make sure your lab is running (*Set Up Your Lab*) and connect to the DVD Rental database.
2. Do the questions in any order, but try each before you look at a hint.
3. For each question, run your query and compare with the **Expected result**: same columns, same order, same first rows, same total number of rows.
4. If your numbers differ, `EXPLAIN` and `SELECT` pieces of the query separately, and find where it goes wrong. (That is the real skill.)
5. When you have tried all ten, do the stretch goals, then read the solutions.

## The ten questions

### Question 1: Which store earns the most?

Management wants to know how much money each store has taken in. Show each `store_id` and its total revenue (`revenue`), highest first. (A payment belongs to the store of the staff member who took it.)

Skills you need: joins, `SUM`, `GROUP BY` (Modules 5 and 6).

<details>
<summary>Hint: where to look</summary>

Join `payment` to `staff` to reach the store.

</details>

```sql expect rows=5
SELECT s.store_id, SUM(p.amount) AS revenue
FROM payment p
JOIN staff s ON s.staff_id = p.staff_id
GROUP BY s.store_id
ORDER BY revenue DESC;
```

### Question 2: Who are our five best customers?

Show the five customers who have paid the most: their `customer_id`, full name as `customer`, and `total_spent`. Break ties by `customer_id`.

Skills you need: joins, `||`, `SUM`, `ORDER BY`, `LIMIT` (Modules 2, 4, 5, 6).

<details>
<summary>Hint: where to look</summary>

Group the payments per customer, then sort and limit.

</details>

```sql expect rows=5
SELECT c.customer_id, c.first_name || ' ' || c.last_name AS customer, SUM(p.amount) AS total_spent
FROM payment p
JOIN customer c ON c.customer_id = p.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_spent DESC, c.customer_id
LIMIT 5;
```

### Question 3: Which film categories make the most money?

Show the five categories that have brought in the most revenue, with the `category` name and its `revenue`. (Follow each payment to its rental, then to the film and its category.)

Skills you need: a long join chain, `SUM`, `GROUP BY` (Modules 5 and 6).

<details>
<summary>Hint: where to look</summary>

payment, rental, inventory, film_category, category.

</details>

```sql expect rows=5
SELECT c.name AS category, SUM(p.amount) AS revenue
FROM payment p
JOIN rental r ON r.rental_id = p.rental_id
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film_category fc ON fc.film_id = i.film_id
JOIN category c ON c.category_id = fc.category_id
GROUP BY c.name
ORDER BY revenue DESC, c.name
LIMIT 5;
```

### Question 4: Which films have never been rented?

List the films that no customer has ever rented (including films with no copies at all): `film_id` and `title`, alphabetical by title.

Skills you need: `NOT EXISTS` or an anti-join (Modules 6, 7 and 9).

<details>
<summary>Hint: where to look</summary>

A film is never rented if none of its copies has a rental.

</details>

```sql expect rows=5
SELECT f.film_id, f.title
FROM film f
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory i
  JOIN rental r ON r.inventory_id = i.inventory_id
  WHERE i.film_id = f.film_id
)
ORDER BY f.title;
```

### Question 5: Which months are busiest?

Count the rentals that started in each month, busiest first. Return `month` (as `YYYY-MM`) and `rentals`. Break ties by month.

Skills you need: `lower()` on a range, `to_char`, `GROUP BY` (Modules 4 and 5).

<details>
<summary>Hint: where to look</summary>

The start of a rental is `lower(rental_period)`.

</details>

```sql expect rows=5
SELECT to_char(lower(rental_period), 'YYYY-MM') AS month, COUNT(*) AS rentals
FROM rental
GROUP BY 1
ORDER BY rentals DESC, month;
```

### Question 6: How long do customers keep films, by category?

For rentals that have been returned, show each `category` and the average number of days a film was kept (`avg_days_kept`, 1 decimal), longest first, then by category name. (Days kept = the length of `rental_period` in days, fractions included.)

Skills you need: ranges, `EXTRACT(epoch ...)`, `AVG`, joins (Modules 4, 5, 6).

<details>
<summary>Hint: where to look</summary>

`EXTRACT(epoch FROM upper(rental_period) - lower(rental_period)) / 86400`.

</details>

```sql expect rows=5
SELECT c.name AS category,
       round(AVG(EXTRACT(epoch FROM upper(r.rental_period) - lower(r.rental_period)) / 86400)::numeric, 1) AS avg_days_kept
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film_category fc ON fc.film_id = i.film_id
JOIN category c ON c.category_id = fc.category_id
WHERE NOT upper_inf(r.rental_period)
GROUP BY c.name
ORDER BY avg_days_kept DESC, c.name;
```

### Question 7: What are the top 3 films in each store?

For each store, show its three most-rented films: `store_id`, `rank_in_store` (1 to 3), `title` and `rentals`. A store is the one that owns the copy that was rented. Break ties by title so there are exactly three per store.

Skills you need: CTEs, `ROW_NUMBER() OVER (PARTITION BY ...)` (Modules 7, 8 and 9).

<details>
<summary>Hint: where to look</summary>

Count rentals per store and film first, then rank inside each store.

</details>

```sql expect rows=6
WITH counts AS (
  SELECT i.store_id, f.title, COUNT(*) AS rentals
  FROM rental r
  JOIN inventory i ON i.inventory_id = r.inventory_id
  JOIN film f ON f.film_id = i.film_id
  GROUP BY i.store_id, f.film_id, f.title
),
ranked AS (
  SELECT store_id, title, rentals,
         ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY rentals DESC, title) AS rank_in_store
  FROM counts
)
SELECT store_id, rank_in_store, title, rentals
FROM ranked
WHERE rank_in_store <= 3
ORDER BY store_id, rank_in_store;
```

### Question 8: Who returns films late most often?

A rental is **late** when the film was kept for longer than its `rental_duration` (in days). Show the five customers with the most late returns: `customer_id`, `customer` (full name) and `late_returns`. Break ties by `customer_id`.

Skills you need: ranges, intervals, comparing columns from two tables, `COUNT` (Modules 4, 5 and 6).

<details>
<summary>Hint: where to look</summary>

Compare `upper(rental_period) - lower(rental_period)` with `rental_duration * interval '1 day'`.

</details>

```sql expect rows=5
SELECT c.customer_id, c.first_name || ' ' || c.last_name AS customer, COUNT(*) AS late_returns
FROM rental r
JOIN customer c ON c.customer_id = r.customer_id
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film f ON f.film_id = i.film_id
WHERE NOT upper_inf(r.rental_period)
  AND upper(r.rental_period) - lower(r.rental_period) > f.rental_duration * interval '1 day'
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY late_returns DESC, c.customer_id
LIMIT 5;
```

### Question 9: How is revenue changing month to month?

For each month that has payments, show the `month` (`YYYY-MM`), its `revenue`, and `change_percent` compared with the previous month (1 decimal, `NULL` for the first month), in month order.

Skills you need: CTEs, `LAG`, `NULLIF`, percentage arithmetic (Modules 4, 7, 8 and 9).

<details>
<summary>Hint: where to look</summary>

Aggregate to one row per month, then `LAG(revenue)`.

</details>

```sql expect rows=5
WITH monthly AS (
  SELECT to_char(payment_date, 'YYYY-MM') AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY 1
)
SELECT month, revenue,
       round(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS change_percent
FROM monthly
ORDER BY month;
```

### Question 10: Which countries bring in the most revenue?

Show the five countries with the highest revenue: `country`, the number of paying `customers`, their `revenue`, and `revenue_per_customer` (2 decimals). Break ties by country name.

Skills you need: a five-table join, `COUNT(DISTINCT ...)`, `SUM`, `round` (Modules 5 and 6).

<details>
<summary>Hint: where to look</summary>

payment, customer, address, city, country.

</details>

```sql expect rows=5
SELECT co.country,
       COUNT(DISTINCT c.customer_id) AS customers,
       SUM(p.amount) AS revenue,
       round(SUM(p.amount) / COUNT(DISTINCT c.customer_id), 2) AS revenue_per_customer
FROM payment p
JOIN customer c ON c.customer_id = p.customer_id
JOIN address a ON a.address_id = c.address_id
JOIN city ci ON ci.city_id = a.city_id
JOIN country co ON co.country_id = ci.country_id
GROUP BY co.country
ORDER BY revenue DESC, co.country
LIMIT 5;
```

## Stretch goals

Once all ten queries match:

1. **Make the slowest one fast.** Pick your slowest query. Look at its plan with `EXPLAIN (ANALYZE)` (see *Tuning a Slow Query*), add a suitable index on a copy of the table, and measure again. Write down the before and after.
2. **Make it reusable.** Turn question 2 into a **view**, and question 1 into a **function** that takes the number of rows to return.
3. **Back it up.** Take a `pg_dump` of your work, restore it into a scratch database, and check the row counts match.
4. **Explain it out loud.** Pick three of your queries and explain each one to an imaginary interviewer: what it does, why you joined those tables, what would go wrong without the `NULLIF` or the tiebreaker.

## Self-check

Tick off the skills you used (copy this table into your notes and mark each row):

| Done | Skill | Module |
|:---:|---|---|
| ☐ | Filtering, sorting, limiting | 2 and 3 |
| ☐ | Functions on dates and text | 4 |
| ☐ | Aggregates, `GROUP BY`, `HAVING` | 5 |
| ☐ | Joins across many tables | 6 |
| ☐ | Subqueries, `NOT EXISTS`, CTEs | 7 |
| ☐ | Window functions (`ROW_NUMBER`, `LAG`) | 8 |
| ☐ | The classic interview patterns | 9 |
| ☐ | Indexes and `EXPLAIN` | 14 |
| ☐ | Views and functions | 15 |
| ☐ | Backup and restore | 16 |

Every skill you cannot tick is a page to revisit.
