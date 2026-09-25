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

Management wants to know how much money each store has taken in. Show each `store_id` and its total revenue, highest first. (A payment belongs to the store of the staff member who took it.)

<details>
<summary>Hint: where to look</summary>

Tables: `payment`, `staff`.

Skills you need: joins, `SUM`, `GROUP BY` (Modules 6 and 7).

</details>

```sql expect rows=5
SELECT s.store_id, SUM(p.amount) AS revenue
FROM payment AS p
JOIN staff AS s ON s.staff_id = p.staff_id
GROUP BY s.store_id
ORDER BY revenue DESC, s.store_id;
```

### Question 2: Who are our five best customers?

Show the five customers who have paid the most: their `customer_id`, full name as `customer`, and `total_spent`. Break ties by `customer_id`.

<details>
<summary>Hint: where to look</summary>

Tables: `customer`, `payment`.

Skills you need: joins, `CONCAT`, `SUM`, `ORDER BY`, `LIMIT` (Modules 2, 4, 6, 7).

</details>

```sql expect rows=5
SELECT c.customer_id,
       CONCAT(c.first_name, ' ', c.last_name) AS customer,
       SUM(p.amount) AS total_spent
FROM customer AS c
JOIN payment AS p ON p.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_spent DESC, c.customer_id
LIMIT 5;
```

### Question 3: Which film categories make the most money?

Show the five categories that have brought in the most revenue, with the `category` name and its `revenue`. (Follow each payment to its rental, then to the film and its category.)

<details>
<summary>Hint: where to look</summary>

Tables: `payment`, `rental`, `inventory`, `film_category`, `category`.

Skills you need: a long join chain, `SUM`, `GROUP BY` (Modules 6 and 7).

</details>

```sql expect rows=5
SELECT cat.name AS category, SUM(p.amount) AS revenue
FROM payment AS p
JOIN rental AS r ON r.rental_id = p.rental_id
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film_category AS fc ON fc.film_id = i.film_id
JOIN category AS cat ON cat.category_id = fc.category_id
GROUP BY cat.category_id, cat.name
ORDER BY revenue DESC, cat.name
LIMIT 5;
```

### Question 4: Which films have never been rented?

List the films that no customer has ever rented (including films with no copies at all): `film_id` and `title`, alphabetical by title.

<details>
<summary>Hint: where to look</summary>

Tables: `film`, `inventory`, `rental`.

Skills you need: `NOT EXISTS` or an anti-join (Modules 7, 8 and 10).

</details>

```sql expect rows=5
SELECT f.film_id, f.title
FROM film AS f
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory AS i
  JOIN rental AS r ON r.inventory_id = i.inventory_id
  WHERE i.film_id = f.film_id
)
ORDER BY f.title;
```

### Question 5: Which months are busiest?

Count the rentals in each month, busiest first. Return `month` (as `YYYY-MM`) and `rentals`. Break ties by month.

<details>
<summary>Hint: where to look</summary>

Tables: `rental`.

Skills you need: `DATE_FORMAT`, `GROUP BY` (Modules 4 and 6).

</details>

```sql expect rows=5
SELECT DATE_FORMAT(rental_date, '%Y-%m') AS month, COUNT(*) AS rentals
FROM rental
GROUP BY DATE_FORMAT(rental_date, '%Y-%m')
ORDER BY rentals DESC, month;
```

### Question 6: How long do customers keep films, by category?

For rentals that have been returned, show each `category` and the average number of days a film was kept (`avg_days_kept`, 1 decimal), longest first, then by category name.

<details>
<summary>Hint: where to look</summary>

Tables: `rental`, `inventory`, `film_category`, `category`.

Skills you need: `DATEDIFF`, `AVG`, joins, filtering `NULL` (Modules 3, 4, 6, 7).

</details>

```sql expect rows=5
SELECT cat.name AS category,
       ROUND(AVG(DATEDIFF(r.return_date, r.rental_date)), 1) AS avg_days_kept
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film_category AS fc ON fc.film_id = i.film_id
JOIN category AS cat ON cat.category_id = fc.category_id
WHERE r.return_date IS NOT NULL
GROUP BY cat.category_id, cat.name
ORDER BY avg_days_kept DESC, cat.name;
```

### Question 7: What are the top 3 films in each store?

For each store, show its three most-rented films: `store_id`, `rank_in_store` (1 to 3), `title` and `rentals`. A store is the one that owns the copy that was rented. Break ties by title so there are exactly three per store.

<details>
<summary>Hint: where to look</summary>

Tables: `rental`, `inventory`, `film`.

Skills you need: CTEs, `ROW_NUMBER() OVER (PARTITION BY ...)` (Modules 8, 9 and 10).

</details>

```sql expect rows=6
WITH film_rentals AS (
  SELECT i.store_id, f.film_id, f.title, COUNT(*) AS rentals
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  JOIN film AS f ON f.film_id = i.film_id
  GROUP BY i.store_id, f.film_id, f.title
),
ranked AS (
  SELECT store_id, title, rentals,
         ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY rentals DESC, title) AS rank_in_store
  FROM film_rentals
)
SELECT store_id, rank_in_store, title, rentals
FROM ranked
WHERE rank_in_store <= 3
ORDER BY store_id, rank_in_store;
```

### Question 8: Who returns films late most often?

A rental is **late** when the number of days kept is more than the film's `rental_duration`. Show the five customers with the most late returns: `customer_id`, `customer` (full name) and `late_returns`. Break ties by `customer_id`.

<details>
<summary>Hint: where to look</summary>

Tables: `rental`, `inventory`, `film`, `customer`.

Skills you need: `DATEDIFF`, comparing columns from two tables, `COUNT` (Modules 4, 6 and 7).

</details>

```sql expect rows=5
SELECT c.customer_id,
       CONCAT(c.first_name, ' ', c.last_name) AS customer,
       COUNT(*) AS late_returns
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film AS f ON f.film_id = i.film_id
JOIN customer AS c ON c.customer_id = r.customer_id
WHERE r.return_date IS NOT NULL
  AND DATEDIFF(r.return_date, r.rental_date) > f.rental_duration
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY late_returns DESC, c.customer_id
LIMIT 5;
```

### Question 9: How is revenue changing month to month?

For each month that has payments, show the `month`, its `revenue`, and `change_percent` compared with the previous month (1 decimal, `NULL` for the first month), in month order.

<details>
<summary>Hint: where to look</summary>

Tables: `payment`.

Skills you need: CTEs, `LAG`, `NULLIF`, percentage arithmetic (Modules 4, 8, 9 and 10).

</details>

```sql expect rows=8
WITH monthly AS (
  SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
)
SELECT month,
       revenue,
       ROUND(100 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS change_percent
FROM monthly
ORDER BY month;
```

### Question 10: Which countries bring in the most revenue?

Show the five countries with the highest revenue: `country`, the number of paying `customers`, their `revenue`, and `revenue_per_customer` (2 decimals). Break ties by country name.

<details>
<summary>Hint: where to look</summary>

Tables: `payment`, `customer`, `address`, `city`, `country`.

Skills you need: a five-table join, `COUNT(DISTINCT ...)`, `SUM`, `ROUND` (Modules 6 and 7).

</details>

```sql expect rows=5
SELECT co.country,
       COUNT(DISTINCT c.customer_id) AS customers,
       SUM(p.amount) AS revenue,
       ROUND(SUM(p.amount) / COUNT(DISTINCT c.customer_id), 2) AS revenue_per_customer
FROM payment AS p
JOIN customer AS c ON c.customer_id = p.customer_id
JOIN address AS a ON a.address_id = c.address_id
JOIN city AS ci ON ci.city_id = a.city_id
JOIN country AS co ON co.country_id = ci.country_id
GROUP BY co.country_id, co.country
ORDER BY revenue DESC, co.country
LIMIT 5;
```

## Stretch goals

Once all ten queries match:

1. **Make the slowest one fast.** Pick your slowest query. Measure how many rows it reads (see *Tuning a Slow Query*), find the plan with `EXPLAIN`, add a suitable index on a copy of the table, and measure again. Write down the before and after.
2. **Make it reusable.** Turn question 2 into a **view**, and question 1 into a stored procedure that takes the number of rows to return.
3. **Back it up.** Take a `mysqldump` of your work, restore it into a scratch database, and check the row counts match.
4. **Explain it out loud.** Pick three of your queries and explain each one to an imaginary interviewer: what it does, why you joined those tables, what would go wrong without the `NULLIF` or the tiebreaker.

## Self-check

Tick off the skills you used (copy this table into your notes and mark each row):

| Done | Skill | Module |
|:---:|---|---|
| ☐ | Filtering, sorting, limiting | 2 and 3 |
| ☐ | Functions on dates and text | 4 |
| ☐ | Aggregates, `GROUP BY`, `HAVING` | 6 |
| ☐ | Joins across many tables | 7 |
| ☐ | Subqueries, `NOT EXISTS`, CTEs | 8 |
| ☐ | Window functions (`ROW_NUMBER`, `LAG`) | 9 |
| ☐ | The classic interview patterns | 10 |
| ☐ | Indexes and `EXPLAIN` | 14 |
| ☐ | Views and procedures | 15 |
| ☐ | Backup and restore | 16 |

Every skill you cannot tick is a page to revisit.
