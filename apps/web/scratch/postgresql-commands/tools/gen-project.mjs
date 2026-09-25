// Generates src/18-01-final-project.md and src/18-02-project-solutions.md from ONE list of questions,
// so the question text, the expected result and the solution can never disagree.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

const Q = [
  {
    title: 'Which store earns the most?',
    text: 'Management wants to know how much money each store has taken in. Show each `store_id` and its total revenue (`revenue`), highest first. (A payment belongs to the store of the staff member who took it.)',
    skills: 'joins, `SUM`, `GROUP BY` (Modules 5 and 6)',
    hint: 'Join `payment` to `staff` to reach the store.',
    how: 'Each payment is joined to the staff member who took it, and their store is the payment\'s store. `SUM` adds the payments per store.',
    rows: 5,
    sql: `SELECT s.store_id, SUM(p.amount) AS revenue
FROM payment p
JOIN staff s ON s.staff_id = p.staff_id
GROUP BY s.store_id
ORDER BY revenue DESC;`,
  },
  {
    title: 'Who are our five best customers?',
    text: 'Show the five customers who have paid the most: their `customer_id`, full name as `customer`, and `total_spent`. Break ties by `customer_id`.',
    skills: 'joins, `||`, `SUM`, `ORDER BY`, `LIMIT` (Modules 2, 4, 5, 6)',
    hint: 'Group the payments per customer, then sort and limit.',
    how: 'Group the payments per customer, sort by the total and keep the top five. The `customer_id` as a tiebreaker makes the order repeatable.',
    rows: 5,
    sql: `SELECT c.customer_id, c.first_name || ' ' || c.last_name AS customer, SUM(p.amount) AS total_spent
FROM payment p
JOIN customer c ON c.customer_id = p.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_spent DESC, c.customer_id
LIMIT 5;`,
  },
  {
    title: 'Which film categories make the most money?',
    text: 'Show the five categories that have brought in the most revenue, with the `category` name and its `revenue`. (Follow each payment to its rental, then to the film and its category.)',
    skills: 'a long join chain, `SUM`, `GROUP BY` (Modules 5 and 6)',
    hint: 'payment, rental, inventory, film_category, category.',
    how: 'A payment knows its rental, a rental knows the inventory copy, the copy knows the film, and a film links to a category through `film_category`. Six tables, one chain.',
    rows: 5,
    sql: `SELECT c.name AS category, SUM(p.amount) AS revenue
FROM payment p
JOIN rental r ON r.rental_id = p.rental_id
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film_category fc ON fc.film_id = i.film_id
JOIN category c ON c.category_id = fc.category_id
GROUP BY c.name
ORDER BY revenue DESC, c.name
LIMIT 5;`,
  },
  {
    title: 'Which films have never been rented?',
    text: 'List the films that no customer has ever rented (including films with no copies at all): `film_id` and `title`, alphabetical by title.',
    skills: '`NOT EXISTS` or an anti-join (Modules 6, 7 and 9)',
    hint: 'A film is never rented if none of its copies has a rental.',
    how: '`NOT EXISTS` keeps a film only if no rental of any of its copies exists. It is safe with `NULL`s, unlike `NOT IN`.',
    rows: 5,
    sql: `SELECT f.film_id, f.title
FROM film f
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory i
  JOIN rental r ON r.inventory_id = i.inventory_id
  WHERE i.film_id = f.film_id
)
ORDER BY f.title;`,
  },
  {
    title: 'Which months are busiest?',
    text: 'Count the rentals that started in each month, busiest first. Return `month` (as `YYYY-MM`) and `rentals`. Break ties by month.',
    skills: '`lower()` on a range, `to_char`, `GROUP BY` (Modules 4 and 5)',
    hint: 'The start of a rental is `lower(rental_period)`.',
    how: 'Take the start of each rental period, turn it into a `YYYY-MM` label, group by it and count.',
    rows: 5,
    sql: `SELECT to_char(lower(rental_period), 'YYYY-MM') AS month, COUNT(*) AS rentals
FROM rental
GROUP BY 1
ORDER BY rentals DESC, month;`,
  },
  {
    title: 'How long do customers keep films, by category?',
    text: 'For rentals that have been returned, show each `category` and the average number of days a film was kept (`avg_days_kept`, 1 decimal), longest first, then by category name. (Days kept = the length of `rental_period` in days, fractions included.)',
    skills: 'ranges, `EXTRACT(epoch ...)`, `AVG`, joins (Modules 4, 5, 6)',
    hint: '`EXTRACT(epoch FROM upper(rental_period) - lower(rental_period)) / 86400`.',
    how: 'Unreturned rentals have no end to their range, so they are excluded with `NOT upper_inf`. The length of the range in seconds, divided by 86400, is the days kept. `AVG` then averages it per category.',
    rows: 5,
    sql: `SELECT c.name AS category,
       round(AVG(EXTRACT(epoch FROM upper(r.rental_period) - lower(r.rental_period)) / 86400)::numeric, 1) AS avg_days_kept
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film_category fc ON fc.film_id = i.film_id
JOIN category c ON c.category_id = fc.category_id
WHERE NOT upper_inf(r.rental_period)
GROUP BY c.name
ORDER BY avg_days_kept DESC, c.name;`,
  },
  {
    title: 'What are the top 3 films in each store?',
    text: 'For each store, show its three most-rented films: `store_id`, `rank_in_store` (1 to 3), `title` and `rentals`. A store is the one that owns the copy that was rented. Break ties by title so there are exactly three per store.',
    skills: 'CTEs, `ROW_NUMBER() OVER (PARTITION BY ...)` (Modules 7, 8 and 9)',
    hint: 'Count rentals per store and film first, then rank inside each store.',
    how: 'Count rentals per store and film, number the films within each store from most to least rented, and keep numbers 1 to 3. This is the top-N-per-group pattern.',
    rows: 6,
    sql: `WITH counts AS (
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
ORDER BY store_id, rank_in_store;`,
  },
  {
    title: 'Who returns films late most often?',
    text: 'A rental is **late** when the film was kept for longer than its `rental_duration` (in days). Show the five customers with the most late returns: `customer_id`, `customer` (full name) and `late_returns`. Break ties by `customer_id`.',
    skills: 'ranges, intervals, comparing columns from two tables, `COUNT` (Modules 4, 5 and 6)',
    hint: 'Compare `upper(rental_period) - lower(rental_period)` with `rental_duration * interval \'1 day\'`.',
    how: 'The film\'s allowed duration lives in `film`, the time kept comes from the rental\'s range, so the `WHERE` compares a value from each. Only returned rentals can be judged late.',
    rows: 5,
    sql: `SELECT c.customer_id, c.first_name || ' ' || c.last_name AS customer, COUNT(*) AS late_returns
FROM rental r
JOIN customer c ON c.customer_id = r.customer_id
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film f ON f.film_id = i.film_id
WHERE NOT upper_inf(r.rental_period)
  AND upper(r.rental_period) - lower(r.rental_period) > f.rental_duration * interval '1 day'
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY late_returns DESC, c.customer_id
LIMIT 5;`,
  },
  {
    title: 'How is revenue changing month to month?',
    text: 'For each month that has payments, show the `month` (`YYYY-MM`), its `revenue`, and `change_percent` compared with the previous month (1 decimal, `NULL` for the first month), in month order.',
    skills: 'CTEs, `LAG`, `NULLIF`, percentage arithmetic (Modules 4, 7, 8 and 9)',
    hint: 'Aggregate to one row per month, then `LAG(revenue)`.',
    how: 'Aggregate to one row per month first, then `LAG` looks at the previous month\'s revenue. `NULLIF` protects against dividing by zero, and the first month has no previous month, so its change is `NULL`.',
    rows: 5,
    sql: `WITH monthly AS (
  SELECT to_char(payment_date, 'YYYY-MM') AS month, SUM(amount) AS revenue
  FROM payment
  GROUP BY 1
)
SELECT month, revenue,
       round(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS change_percent
FROM monthly
ORDER BY month;`,
  },
  {
    title: 'Which countries bring in the most revenue?',
    text: 'Show the five countries with the highest revenue: `country`, the number of paying `customers`, their `revenue`, and `revenue_per_customer` (2 decimals). Break ties by country name.',
    skills: 'a five-table join, `COUNT(DISTINCT ...)`, `SUM`, `round` (Modules 5 and 6)',
    hint: 'payment, customer, address, city, country.',
    how: 'Follow the customer\'s address up to the country. `COUNT(DISTINCT customer_id)` counts each customer once, however many payments they made.',
    rows: 5,
    sql: `SELECT co.country,
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
LIMIT 5;`,
  },
];

let p = `---
title: "Final Project: Sypher DVD Rentals Analyst"
order: 0
---

Time to use everything. In this project you are the new data analyst at **Sypher DVD Rentals**, a small chain with two stores. The owner has ten questions, and you have the whole rental database to answer them with.

There is no lesson to read and no hand-holding. For each question you get the question in plain business language, the tables it involves, and **what your result should look like**. You write the query. When you are done, compare your result with the expected one, and only then open the *Project Solutions* page.

## How to work

1. Make sure your lab is running (*Set Up Your Lab*) and connect to the DVD Rental database.
2. Do the questions in any order, but try each before you look at a hint.
3. For each question, run your query and compare with the **Expected result**: same columns, same order, same first rows, same total number of rows.
4. If your numbers differ, \`EXPLAIN\` and \`SELECT\` pieces of the query separately, and find where it goes wrong. (That is the real skill.)
5. When you have tried all ten, do the stretch goals, then read the solutions.

## The ten questions

`;
Q.forEach((q, i) => {
  p += `### Question ${i + 1}: ${q.title}\n\n${q.text}\n\nSkills you need: ${q.skills}.\n\n<details>\n<summary>Hint: where to look</summary>\n\n${q.hint}\n\n</details>\n\n\`\`\`sql expect rows=${q.rows}\n${q.sql}\n\`\`\`\n\n`;
});
p += `## Stretch goals

Once all ten queries match:

1. **Make the slowest one fast.** Pick your slowest query. Look at its plan with \`EXPLAIN (ANALYZE)\` (see *Tuning a Slow Query*), add a suitable index on a copy of the table, and measure again. Write down the before and after.
2. **Make it reusable.** Turn question 2 into a **view**, and question 1 into a **function** that takes the number of rows to return.
3. **Back it up.** Take a \`pg_dump\` of your work, restore it into a scratch database, and check the row counts match.
4. **Explain it out loud.** Pick three of your queries and explain each one to an imaginary interviewer: what it does, why you joined those tables, what would go wrong without the \`NULLIF\` or the tiebreaker.

## Self-check

Tick off the skills you used (copy this table into your notes and mark each row):

| Done | Skill | Module |
|:---:|---|---|
| ☐ | Filtering, sorting, limiting | 2 and 3 |
| ☐ | Functions on dates and text | 4 |
| ☐ | Aggregates, \`GROUP BY\`, \`HAVING\` | 5 |
| ☐ | Joins across many tables | 6 |
| ☐ | Subqueries, \`NOT EXISTS\`, CTEs | 7 |
| ☐ | Window functions (\`ROW_NUMBER\`, \`LAG\`) | 8 |
| ☐ | The classic interview patterns | 9 |
| ☐ | Indexes and \`EXPLAIN\` | 14 |
| ☐ | Views and functions | 15 |
| ☐ | Backup and restore | 16 |

Every skill you cannot tick is a page to revisit.
`;
fs.writeFileSync(path.join(SRC, '18-01-final-project.md'), p);

let s = `---
title: "Project Solutions"
order: 0
---

Only open this page after you have tried all ten questions yourself. Each solution shows a full query, the real result, and a short explanation. There are many correct ways to write a query; yours may look different and still be right, as long as the result matches.

Every query below was run against the database to produce the result shown.

`;
Q.forEach((q, i) => {
  s += `## Question ${i + 1}: ${q.title}\n\n${q.text}\n\n\`\`\`sql run rows=${q.rows}\n${q.sql}\n\`\`\`\n\n**How it works.** ${q.how}\n\n`;
});
s += `## Stretch goals: solutions

### 1. Make the slowest one fast

Take a lookup that a report would run again and again, such as the payments of one customer. On a copy of \`payment\` with no indexes, PostgreSQL reads every row:

\`\`\`sql run destructive
CREATE TABLE payment_project AS SELECT * FROM payment;
ANALYZE payment_project;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT SUM(amount) AS customer_3_total FROM payment_project WHERE customer_id = 3;
\`\`\`

Add an index on the column the query filters on, and measure again:

\`\`\`sql run destructive
CREATE INDEX idx_project_customer ON payment_project (customer_id);
ANALYZE payment_project;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT SUM(amount) AS customer_3_total FROM payment_project WHERE customer_id = 3;
\`\`\`

The full scan disappeared: the same answer, from an index lookup. Write down both plans (rows read, plan node), since "the plan changed from a sequential scan to an index scan and the rows removed by the filter dropped to zero" is exactly the sort of result that impresses in an interview.

### 2. Make it reusable

A view for question 2, and a function for question 1:

\`\`\`sql run destructive
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
\`\`\`

\`\`\`sql run destructive
CREATE FUNCTION top_stores2(p_limit integer) RETURNS TABLE (store_id integer, revenue numeric)
LANGUAGE sql STABLE AS $$
  SELECT s.store_id::integer, SUM(p.amount)
  FROM payment p JOIN staff s ON s.staff_id = p.staff_id
  GROUP BY s.store_id ORDER BY 2 DESC LIMIT p_limit
$$;

SELECT * FROM top_stores2(1);
\`\`\`

### 3. Back it up

Dump a table, restore it into a scratch database, and compare (the commands are in *Backup and Restore*):

\`\`\`bash run
docker compose exec -T postgres psql -X -q -U sypher -d sypher-postgresql-DvdRental -c 'CREATE TABLE backup_demo_copy AS SELECT * FROM category'
docker compose exec -T postgres pg_dump -U sypher -d sypher-postgresql-DvdRental -t backup_demo_copy --no-owner > backup_demo_copy.sql
docker compose exec -T postgres createdb -U sypher scratch_project
docker compose exec -T postgres psql -X -q -U sypher -d scratch_project < backup_demo_copy.sql > /dev/null
docker compose exec -T postgres psql -X -At -U sypher -d scratch_project -c 'SELECT COUNT(*) FROM backup_demo_copy'
docker compose exec -T postgres dropdb -U sypher scratch_project
\`\`\`

### 4. Explain it out loud

A good explanation of question 7 sounds like this: "First I count the rentals per store and film. Then I number the films inside each store, most rented first, using \`ROW_NUMBER\` partitioned by store. I break ties by title so the numbering is repeatable. Finally I keep the first three per store. I used a window function because \`LIMIT\` cannot work per group."

## What next?

You have worked through the ideas behind almost every PostgreSQL interview question: reading and shaping data, joining, summarising, window functions, changing data safely, transactions, design, speed, security and backup, and the PostgreSQL-only tools (arrays, ranges, JSON, full-text search, \`LATERAL\`, \`DISTINCT ON\`). Keep going by writing your own questions about a dataset you care about, and answering them with queries.
`;
fs.writeFileSync(path.join(SRC, '18-02-project-solutions.md'), s);
console.log('generated 18-01 and 18-02');
