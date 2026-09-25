"""
Generates the two final-project pages from ONE list of questions, so the
expected results shown to learners and the solutions can never disagree.

    python tools/gen-project.py     ->  src/18-01-final-project.md
                                        src/18-02-project-solutions.md
Then render both with: node render.mjs src/18-01-final-project.md src/18-02-project-solutions.md
"""
import io, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'src')

QUESTIONS = [
    dict(
        title='Which store earns the most?',
        ask='Management wants to know how much money each store has taken in. Show each `store_id` and its total revenue, highest first. (A payment belongs to the store of the staff member who took it.)',
        tables='`payment`, `staff`',
        skills='joins, `SUM`, `GROUP BY` (Modules 6 and 7)',
        rows=5,
        sql='''SELECT s.store_id, SUM(p.amount) AS revenue
FROM payment AS p
JOIN staff AS s ON s.staff_id = p.staff_id
GROUP BY s.store_id
ORDER BY revenue DESC, s.store_id;''',
        why='Each payment is joined to the staff member who took it, and their store is the payment\'s store. `SUM` adds the payments per store.',
    ),
    dict(
        title='Who are our five best customers?',
        ask='Show the five customers who have paid the most: their `customer_id`, full name as `customer`, and `total_spent`. Break ties by `customer_id`.',
        tables='`customer`, `payment`',
        skills='joins, `CONCAT`, `SUM`, `ORDER BY`, `LIMIT` (Modules 2, 4, 6, 7)',
        rows=5,
        sql='''SELECT c.customer_id,
       CONCAT(c.first_name, ' ', c.last_name) AS customer,
       SUM(p.amount) AS total_spent
FROM customer AS c
JOIN payment AS p ON p.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_spent DESC, c.customer_id
LIMIT 5;''',
        why='Group the payments per customer, sort by the total and keep the top five. The `customer_id` as a tiebreaker makes the order repeatable.',
    ),
    dict(
        title='Which film categories make the most money?',
        ask='Show the five categories that have brought in the most revenue, with the `category` name and its `revenue`. (Follow each payment to its rental, then to the film and its category.)',
        tables='`payment`, `rental`, `inventory`, `film_category`, `category`',
        skills='a long join chain, `SUM`, `GROUP BY` (Modules 6 and 7)',
        rows=5,
        sql='''SELECT cat.name AS category, SUM(p.amount) AS revenue
FROM payment AS p
JOIN rental AS r ON r.rental_id = p.rental_id
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film_category AS fc ON fc.film_id = i.film_id
JOIN category AS cat ON cat.category_id = fc.category_id
GROUP BY cat.category_id, cat.name
ORDER BY revenue DESC, cat.name
LIMIT 5;''',
        why='A payment knows its rental, a rental knows the inventory copy, the copy knows the film, and a film links to a category through `film_category`. Five tables, one chain.',
    ),
    dict(
        title='Which films have never been rented?',
        ask='List the films that no customer has ever rented (including films with no copies at all): `film_id` and `title`, alphabetical by title.',
        tables='`film`, `inventory`, `rental`',
        skills='`NOT EXISTS` or an anti-join (Modules 7, 8 and 10)',
        rows=5,
        sql='''SELECT f.film_id, f.title
FROM film AS f
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory AS i
  JOIN rental AS r ON r.inventory_id = i.inventory_id
  WHERE i.film_id = f.film_id
)
ORDER BY f.title;''',
        why='`NOT EXISTS` keeps a film only if no rental of any of its copies exists. It is safe with `NULL`s, unlike `NOT IN`.',
    ),
    dict(
        title='Which months are busiest?',
        ask='Count the rentals in each month, busiest first. Return `month` (as `YYYY-MM`) and `rentals`. Break ties by month.',
        tables='`rental`',
        skills='`DATE_FORMAT`, `GROUP BY` (Modules 4 and 6)',
        rows=5,
        sql='''SELECT DATE_FORMAT(rental_date, '%Y-%m') AS month, COUNT(*) AS rentals
FROM rental
GROUP BY DATE_FORMAT(rental_date, '%Y-%m')
ORDER BY rentals DESC, month;''',
        why='Turn each date into a `YYYY-MM` label, group by it and count.',
    ),
    dict(
        title='How long do customers keep films, by category?',
        ask='For rentals that have been returned, show each `category` and the average number of days a film was kept (`avg_days_kept`, 1 decimal), longest first, then by category name.',
        tables='`rental`, `inventory`, `film_category`, `category`',
        skills='`DATEDIFF`, `AVG`, joins, filtering `NULL` (Modules 3, 4, 6, 7)',
        rows=5,
        sql='''SELECT cat.name AS category,
       ROUND(AVG(DATEDIFF(r.return_date, r.rental_date)), 1) AS avg_days_kept
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film_category AS fc ON fc.film_id = i.film_id
JOIN category AS cat ON cat.category_id = fc.category_id
WHERE r.return_date IS NOT NULL
GROUP BY cat.category_id, cat.name
ORDER BY avg_days_kept DESC, cat.name;''',
        why='Unreturned rentals have no `return_date`, so they are excluded with `IS NOT NULL`; otherwise `DATEDIFF` would give `NULL`. `AVG` then averages the days per category.',
    ),
    dict(
        title='What are the top 3 films in each store?',
        ask='For each store, show its three most-rented films: `store_id`, `rank_in_store` (1 to 3), `title` and `rentals`. A store is the one that owns the copy that was rented. Break ties by title so there are exactly three per store.',
        tables='`rental`, `inventory`, `film`',
        skills='CTEs, `ROW_NUMBER() OVER (PARTITION BY ...)` (Modules 8, 9 and 10)',
        rows=6,
        sql='''WITH film_rentals AS (
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
ORDER BY store_id, rank_in_store;''',
        why='Count rentals per store and film, number the films within each store from most to least rented, and keep numbers 1 to 3. This is the top-N-per-group pattern.',
    ),
    dict(
        title='Who returns films late most often?',
        ask='A rental is **late** when the number of days kept is more than the film\'s `rental_duration`. Show the five customers with the most late returns: `customer_id`, `customer` (full name) and `late_returns`. Break ties by `customer_id`.',
        tables='`rental`, `inventory`, `film`, `customer`',
        skills='`DATEDIFF`, comparing columns from two tables, `COUNT` (Modules 4, 6 and 7)',
        rows=5,
        sql='''SELECT c.customer_id,
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
LIMIT 5;''',
        why='The film\'s allowed duration lives in `film`, the days kept come from `rental`, so the `WHERE` compares a value from each. Only returned rentals can be judged late.',
    ),
    dict(
        title='How is revenue changing month to month?',
        ask='For each month that has payments, show the `month`, its `revenue`, and `change_percent` compared with the previous month (1 decimal, `NULL` for the first month), in month order.',
        tables='`payment`',
        skills='CTEs, `LAG`, `NULLIF`, percentage arithmetic (Modules 4, 8, 9 and 10)',
        rows=8,
        sql='''WITH monthly AS (
  SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
)
SELECT month,
       revenue,
       ROUND(100 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS change_percent
FROM monthly
ORDER BY month;''',
        why='Aggregate to one row per month first, then `LAG` looks at the previous month\'s revenue. `NULLIF` protects against dividing by zero, and the first month has no previous month, so its change is `NULL`.',
    ),
    dict(
        title='Which countries bring in the most revenue?',
        ask='Show the five countries with the highest revenue: `country`, the number of paying `customers`, their `revenue`, and `revenue_per_customer` (2 decimals). Break ties by country name.',
        tables='`payment`, `customer`, `address`, `city`, `country`',
        skills='a five-table join, `COUNT(DISTINCT ...)`, `SUM`, `ROUND` (Modules 6 and 7)',
        rows=5,
        sql='''SELECT co.country,
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
LIMIT 5;''',
        why='Follow the customer\'s address up to the country. `COUNT(DISTINCT customer_id)` counts each customer once, however many payments they made.',
    ),
]

# ------------------------------------------------------------------ project page
p = []
p.append('''---
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
''')
for n, q in enumerate(QUESTIONS, 1):
    p.append(f'''### Question {n}: {q['title']}

{q['ask']}

<details>
<summary>Hint: where to look</summary>

Tables: {q['tables']}.

Skills you need: {q['skills']}.

</details>

```sql expect rows={q['rows']}
{q['sql']}
```
''')
p.append('''## Stretch goals

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
''')
io.open(os.path.join(SRC, '18-01-final-project.md'), 'w', encoding='utf-8', newline='').write('\n'.join(p))

# ---------------------------------------------------------------- solutions page
s = []
s.append('''---
title: "Project Solutions"
order: 0
---

Only open this page after you have tried all ten questions yourself. Each solution shows a full query, the real result, and a short explanation. There are many correct ways to write a query; yours may look different and still be right, as long as the result matches.

Every query below was run against the database to produce the result shown.
''')
for n, q in enumerate(QUESTIONS, 1):
    s.append(f'''## Question {n}: {q['title']}

{q['ask']}

```sql run rows={q['rows']}
{q['sql']}
```

**How it works.** {q['why']}
''')
s.append('''## Stretch goals: solutions

### 1. Make the slowest one fast

Take a lookup that a report would run again and again, such as the total spent by one customer. On a copy of `payment` with no indexes, MySQL reads every row:

```sql run as=root destructive
CREATE TABLE payment_project AS SELECT * FROM payment;

FLUSH STATUS;

SELECT SUM(amount) AS customer_3_total FROM payment_project WHERE customer_id = 3;

SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_key', 'Handler_read_next', 'Handler_read_rnd_next');
```

Add an index on the column the query filters on, and measure again:

```sql run as=root destructive
CREATE INDEX idx_customer ON payment_project (customer_id);

FLUSH STATUS;

SELECT SUM(amount) AS customer_3_total FROM payment_project WHERE customer_id = 3;

SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_key', 'Handler_read_next', 'Handler_read_rnd_next');
```

The full scan disappeared: the same answer, from one index lookup and 26 rows instead of 16045. Write down both numbers, since "reduced the rows read from 16045 to 26" is exactly the sort of result that impresses in an interview.

### 2. Make it reusable

A view for question 2, and a procedure for question 1:

```sql run destructive
CREATE VIEW customer_spend AS
SELECT c.customer_id,
       CONCAT(c.first_name, ' ', c.last_name) AS customer,
       SUM(p.amount) AS total_spent
FROM customer AS c
JOIN payment AS p ON p.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name;

SELECT customer_id, customer, total_spent
FROM customer_spend
ORDER BY total_spent DESC, customer_id
LIMIT 3;
```

```sql run destructive
DELIMITER $$
CREATE PROCEDURE store_revenue(IN p_rows INT)
BEGIN
  SELECT s.store_id, SUM(p.amount) AS revenue
  FROM payment AS p
  JOIN staff AS s ON s.staff_id = p.staff_id
  GROUP BY s.store_id
  ORDER BY revenue DESC, s.store_id
  LIMIT p_rows;
END$$
DELIMITER ;

CALL store_revenue(1);
```

### 3. Back it up

Dump a table, restore it into a scratch database, and compare:

```bash run
docker compose exec -T mysql mysqldump -uroot -ppassword --single-transaction sypher-mysql-DvdRental category > backup_demo_category.sql

docker compose exec -T mysql mysql -uroot -ppassword -e "DROP DATABASE IF EXISTS project_restore; CREATE DATABASE project_restore"

docker compose exec -T mysql mysql -uroot -ppassword project_restore < backup_demo_category.sql

docker compose exec -T mysql mysql -uroot -ppassword -N -e "SELECT CONCAT('original: ', COUNT(*)) FROM \\`sypher-mysql-DvdRental\\`.category UNION ALL SELECT CONCAT('restored: ', COUNT(*)) FROM project_restore.category"
```

```sql run as=root destructive
DROP DATABASE project_restore;

SELECT COUNT(*) AS scratch_databases_left FROM information_schema.schemata WHERE schema_name = 'project_restore';
```

### 4. Explain it out loud

A good explanation of question 7 sounds like this: "First I count the rentals per store and film. Then I number the films inside each store, most rented first, using `ROW_NUMBER` partitioned by store. I break ties by title so the numbering is repeatable. Finally I keep the first three per store. I used a window function because `LIMIT` cannot work per group."

## What next?

You have worked through the ideas behind almost every MySQL interview question: reading and shaping data, joining, summarising, window functions, changing data safely, transactions, design, speed, security and backup. Keep going by writing your own questions about a dataset you care about, and answering them with queries.
''')
io.open(os.path.join(SRC, '18-02-project-solutions.md'), 'w', encoding='utf-8', newline='').write('\n'.join(s))
print('generated', len(QUESTIONS), 'questions')
