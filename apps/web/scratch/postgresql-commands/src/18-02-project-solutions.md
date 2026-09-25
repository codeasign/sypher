---
title: "Project Solutions"
order: 0
---

Only open this page after you have tried all ten questions yourself. Each solution shows a full query, the real result, and a short explanation. There are many correct ways to write a query; yours may look different and still be right, as long as the result matches.

Every query below was run against the database to produce the result shown.

## Question 1: Which store earns the most?

Management wants to know how much money each store has taken in. Show each `store_id` and its total revenue (`revenue`), highest first. (A payment belongs to the store of the staff member who took it.)

```sql run rows=5
SELECT s.store_id, SUM(p.amount) AS revenue
FROM payment p
JOIN staff s ON s.staff_id = p.staff_id
GROUP BY s.store_id
ORDER BY revenue DESC;
```

**How it works.** Each payment is joined to the staff member who took it, and their store is the payment's store. `SUM` adds the payments per store.

## Question 2: Who are our five best customers?

Show the five customers who have paid the most: their `customer_id`, full name as `customer`, and `total_spent`. Break ties by `customer_id`.

```sql run rows=5
SELECT c.customer_id, c.first_name || ' ' || c.last_name AS customer, SUM(p.amount) AS total_spent
FROM payment p
JOIN customer c ON c.customer_id = p.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_spent DESC, c.customer_id
LIMIT 5;
```

**How it works.** Group the payments per customer, sort by the total and keep the top five. The `customer_id` as a tiebreaker makes the order repeatable.

## Question 3: Which film categories make the most money?

Show the five categories that have brought in the most revenue, with the `category` name and its `revenue`. (Follow each payment to its rental, then to the film and its category.)

```sql run rows=5
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

**How it works.** A payment knows its rental, a rental knows the inventory copy, the copy knows the film, and a film links to a category through `film_category`. Six tables, one chain.

## Question 4: Which films have never been rented?

List the films that no customer has ever rented (including films with no copies at all): `film_id` and `title`, alphabetical by title.

```sql run rows=5
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

**How it works.** `NOT EXISTS` keeps a film only if no rental of any of its copies exists. It is safe with `NULL`s, unlike `NOT IN`.

## Question 5: Which months are busiest?

Count the rentals that started in each month, busiest first. Return `month` (as `YYYY-MM`) and `rentals`. Break ties by month.

```sql run rows=5
SELECT to_char(lower(rental_period), 'YYYY-MM') AS month, COUNT(*) AS rentals
FROM rental
GROUP BY 1
ORDER BY rentals DESC, month;
```

**How it works.** Take the start of each rental period, turn it into a `YYYY-MM` label, group by it and count.

## Question 6: How long do customers keep films, by category?

For rentals that have been returned, show each `category` and the average number of days a film was kept (`avg_days_kept`, 1 decimal), longest first, then by category name. (Days kept = the length of `rental_period` in days, fractions included.)

```sql run rows=5
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

**How it works.** Unreturned rentals have no end to their range, so they are excluded with `NOT upper_inf`. The length of the range in seconds, divided by 86400, is the days kept. `AVG` then averages it per category.

## Question 7: What are the top 3 films in each store?

For each store, show its three most-rented films: `store_id`, `rank_in_store` (1 to 3), `title` and `rentals`. A store is the one that owns the copy that was rented. Break ties by title so there are exactly three per store.

```sql run rows=6
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

**How it works.** Count rentals per store and film, number the films within each store from most to least rented, and keep numbers 1 to 3. This is the top-N-per-group pattern.

## Question 8: Who returns films late most often?

A rental is **late** when the film was kept for longer than its `rental_duration` (in days). Show the five customers with the most late returns: `customer_id`, `customer` (full name) and `late_returns`. Break ties by `customer_id`.

```sql run rows=5
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

**How it works.** The film's allowed duration lives in `film`, the time kept comes from the rental's range, so the `WHERE` compares a value from each. Only returned rentals can be judged late.

## Question 9: How is revenue changing month to month?

For each month that has payments, show the `month` (`YYYY-MM`), its `revenue`, and `change_percent` compared with the previous month (1 decimal, `NULL` for the first month), in month order.

```sql run rows=5
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

**How it works.** Aggregate to one row per month first, then `LAG` looks at the previous month's revenue. `NULLIF` protects against dividing by zero, and the first month has no previous month, so its change is `NULL`.

## Question 10: Which countries bring in the most revenue?

Show the five countries with the highest revenue: `country`, the number of paying `customers`, their `revenue`, and `revenue_per_customer` (2 decimals). Break ties by country name.

```sql run rows=5
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

**How it works.** Follow the customer's address up to the country. `COUNT(DISTINCT customer_id)` counts each customer once, however many payments they made.

## Stretch goals: solutions

### 1. Make the slowest one fast

Take a lookup that a report would run again and again, such as the payments of one customer. On a copy of `payment` with no indexes, PostgreSQL reads every row:

```sql run destructive
CREATE TABLE payment_project AS SELECT * FROM payment;
ANALYZE payment_project;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT SUM(amount) AS customer_3_total FROM payment_project WHERE customer_id = 3;
```

Add an index on the column the query filters on, and measure again:

```sql run destructive
CREATE INDEX idx_project_customer ON payment_project (customer_id);
ANALYZE payment_project;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT SUM(amount) AS customer_3_total FROM payment_project WHERE customer_id = 3;
```

The full scan disappeared: the same answer, from an index lookup. Write down both plans (rows read, plan node), since "the plan changed from a sequential scan to an index scan and the rows removed by the filter dropped to zero" is exactly the sort of result that impresses in an interview.

### 2. Make it reusable

A view for question 2, and a function for question 1:

```sql run destructive
CREATE VIEW best_customers AS
SELECT c.customer_id, c.first_name || ' ' || c.last_name AS customer, SUM(p.amount) AS total_spent
FROM payment p
JOIN customer c ON c.customer_id = p.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name;

CREATE FUNCTION top_stores(p_limit integer) RETURNS TABLE (store_id integer, revenue numeric)
LANGUAGE sql STABLE AS $$
  SELECT s.store_id::integer, SUM(p.amount)
  FROM payment p JOIN staff s ON s.staff_id = p.staff_id
  GROUP BY s.store_id ORDER BY 2 DESC LIMIT p_limit
$$;

SELECT * FROM best_customers ORDER BY total_spent DESC, customer_id LIMIT 3;
```

```sql run destructive
CREATE FUNCTION top_stores2(p_limit integer) RETURNS TABLE (store_id integer, revenue numeric)
LANGUAGE sql STABLE AS $$
  SELECT s.store_id::integer, SUM(p.amount)
  FROM payment p JOIN staff s ON s.staff_id = p.staff_id
  GROUP BY s.store_id ORDER BY 2 DESC LIMIT p_limit
$$;

SELECT * FROM top_stores2(1);
```

### 3. Back it up

Dump a table, restore it into a scratch database, and compare (the commands are in *Backup and Restore*):

```bash run
docker compose exec -T postgres psql -X -q -U sypher -d sypher-postgresql-DvdRental -c 'CREATE TABLE backup_demo_copy AS SELECT * FROM category'
docker compose exec -T postgres pg_dump -U sypher -d sypher-postgresql-DvdRental -t backup_demo_copy --no-owner > backup_demo_copy.sql
docker compose exec -T postgres createdb -U sypher scratch_project
docker compose exec -T postgres psql -X -q -U sypher -d scratch_project < backup_demo_copy.sql > /dev/null
docker compose exec -T postgres psql -X -At -U sypher -d scratch_project -c 'SELECT COUNT(*) FROM backup_demo_copy'
docker compose exec -T postgres dropdb -U sypher scratch_project
```

### 4. Explain it out loud

A good explanation of question 7 sounds like this: "First I count the rentals per store and film. Then I number the films inside each store, most rented first, using `ROW_NUMBER` partitioned by store. I break ties by title so the numbering is repeatable. Finally I keep the first three per store. I used a window function because `LIMIT` cannot work per group."

## What next?

You have worked through the ideas behind almost every PostgreSQL interview question: reading and shaping data, joining, summarising, window functions, changing data safely, transactions, design, speed, security and backup, and the PostgreSQL-only tools (arrays, ranges, JSON, full-text search, `LATERAL`, `DISTINCT ON`). Keep going by writing your own questions about a dataset you care about, and answering them with queries.
