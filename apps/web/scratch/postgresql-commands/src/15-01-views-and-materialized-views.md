---
title: "Views and Materialized Views"
order: 0
---

A **view** is a saved query that you use like a table. It stores no data of its own: every time you read from the view, PostgreSQL runs the query behind it. A **materialized view** stores the result, so it is fast to read but has to be refreshed.

## What you'll learn

- Creating, changing and dropping views
- Using a view like a table, and updating through a simple one
- `WITH CHECK OPTION`
- Materialized views and `REFRESH`

## Syntax

```sql show
CREATE [OR REPLACE] VIEW view_name AS SELECT ...;
DROP VIEW [IF EXISTS] view_name;

CREATE MATERIALIZED VIEW mv_name AS SELECT ... WITH DATA;
REFRESH MATERIALIZED VIEW [CONCURRENTLY] mv_name;
```

## Examples

### You have already used views

The DVD Rental database ships with several. `customer_list` and `film_list` are views, not tables:

```sql run
SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name;
```

### A view that hides a join

Customer contact details are spread over four tables. A view puts them in one place:

```sql run destructive
CREATE VIEW customer_contact AS
SELECT c.customer_id, c.first_name, c.last_name, a.address, ci.city, co.country
FROM customer c
JOIN address a ON a.address_id = c.address_id
JOIN city ci ON ci.city_id = a.city_id
JOIN country co ON co.country_id = ci.country_id;

SELECT * FROM customer_contact WHERE country = 'Japan' ORDER BY customer_id LIMIT 3;
```

The person writing the second query never needs to know about `address`, `city` or `country`.

### A view always shows current data

The view reads the base tables every time, so it never goes out of date:

```sql run destructive
CREATE VIEW film_1_rate AS SELECT film_id, rental_rate FROM film WHERE film_id = 1;

UPDATE film SET rental_rate = 9.99 WHERE film_id = 1;

SELECT * FROM film_1_rate;
```

### A view for safety: hide the sensitive columns

Give an analyst access to the view and not to the table, and they cannot see what the view leaves out:

```sql run destructive
CREATE VIEW customer_public AS SELECT customer_id, first_name, last_name FROM customer;

SELECT * FROM customer_public ORDER BY customer_id LIMIT 2;
```

### Changing and dropping a view

`CREATE OR REPLACE VIEW` changes the query (you may add columns at the end, not remove or rename them). `DROP VIEW` removes it:

```sql run destructive
CREATE VIEW long_films AS SELECT film_id, title, length FROM film WHERE length > 180;
CREATE OR REPLACE VIEW long_films AS SELECT film_id, title, length, rating FROM film WHERE length > 180;
DROP VIEW customer_public;

SELECT COUNT(*) AS long_films, (SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'customer_public') AS customer_public_left FROM long_films;
```

## Updating through a view

A **simple** view (one table, no grouping) can be updated, and the change reaches the real table. `WITH CHECK OPTION` refuses any change that would make the row disappear from the view:

```sql run error destructive
CREATE VIEW g_films AS SELECT film_id, title, rating FROM film WHERE rating = 'G' WITH CHECK OPTION;

UPDATE g_films SET rating = 'R' WHERE film_id = 2;
```

Without the check option the update would succeed and the film would vanish from the view.

## Materialized views

A materialized view **stores the result** on disk, like a table you can refresh. The lab has one already, `nicer_but_slower_film_list`:

```sql run
SELECT matviewname, ispopulated FROM pg_matviews ORDER BY matviewname;
```

Build your own. Reading it is as fast as reading a table, but the data is a snapshot:

```sql run destructive
CREATE MATERIALIZED VIEW rating_summary AS
SELECT rating, COUNT(*) AS films, round(AVG(length), 1) AS avg_length
FROM film
GROUP BY rating;

SELECT * FROM rating_summary ORDER BY rating;
```

Change the data underneath, and the materialized view does **not** notice until you refresh it:

```sql run destructive
INSERT INTO language (name) VALUES ('Klingon');
CREATE MATERIALIZED VIEW mv_lang AS SELECT COUNT(*) AS languages FROM language;
INSERT INTO language (name) VALUES ('Elvish');

SELECT (SELECT languages FROM mv_lang) AS stale_count;

REFRESH MATERIALIZED VIEW mv_lang;

SELECT (SELECT languages FROM mv_lang) AS fresh_count;
```

## Try it yourself

Create a view of the films of one category (joining three tables) and query it with extra filters. Then look at its definition with `SELECT pg_get_viewdef('name'::regclass)`.

## Watch out

### A view is not faster

It is only a saved query. A view of a slow query is slow. (PostgreSQL merges the view into the outer query, so it also gets optimised together with it.)

### Views can hide expensive work

`SELECT * FROM customer_contact` looks innocent, but it joins four tables every time. Stacking views on views makes this worse.

### Complex views cannot be updated

A view with `GROUP BY`, `DISTINCT`, an aggregate, a `UNION` or certain joins is read-only for `INSERT`, `UPDATE` and `DELETE` (unless you add an `INSTEAD OF` trigger).

### Changing the base table can break a view

Dropping or renaming a column that a view uses is refused, unless you use `CASCADE`, which drops the view too.

### A materialized view is a snapshot

It shows the data as of the last `REFRESH`. `REFRESH MATERIALIZED VIEW CONCURRENTLY` updates it without blocking readers, but needs a unique index on the view.

### Permissions

A view can expose a slice of a table to a user who has no rights on the table itself. That is a common and useful pattern, but check who has access to what (`security_barrier` and `security_invoker` options control the details).

## Interview corner

**"What is a view, and why use one?"**
A named, saved `SELECT`. It simplifies complex queries, gives a stable interface when tables change, and restricts which columns or rows a user can see.

**"What is a materialized view?"**
A view whose result is stored on disk. It reads like a table, but must be refreshed to catch up with the base tables. It suits expensive reports that can be a little out of date.

**"Can you insert or update through a view?"**
Yes, for simple views based on one table. Not when the view uses aggregates, `GROUP BY`, `DISTINCT` or `UNION`, unless an `INSTEAD OF` trigger handles it.

**"What does `WITH CHECK OPTION` do?"**
It stops updates or inserts through the view that would create rows the view itself could not show.

## Practice

### Warm-up: a view of one store

Create a view `store_1_customers` with `customer_id`, `first_name` and `last_name` of the customers of store 1, then return how many rows it has as `customers`.

```sql practice destructive
-- hint: `CREATE VIEW ... AS SELECT ... WHERE store_id = 1`, then COUNT.
CREATE VIEW store_1_customers AS SELECT customer_id, first_name, last_name FROM customer WHERE store_id = 1;

SELECT COUNT(*) AS customers FROM store_1_customers;
```

### Core: a view over a join

Create a view `film_category_list` with `film_id`, `title` and the category `name` as `category`, then return the number of Horror films in it as `horror_films`.

```sql practice destructive
-- hint: Join film, film_category and category.
CREATE VIEW film_category_list AS
SELECT f.film_id, f.title, c.name AS category
FROM film f
JOIN film_category fc ON fc.film_id = f.film_id
JOIN category c ON c.category_id = fc.category_id;

SELECT COUNT(*) AS horror_films FROM film_category_list WHERE category = 'Horror';
```

### Stretch: a materialized snapshot

Create a materialized view `category_counts` with each category `name` and its number of films (`films`). Then add a new category `Zombie` to `category`, refresh the view, and return the number of rows in the view as `rows_after_refresh` (categories with no film still appear if you use a `LEFT JOIN`).

```sql practice destructive
-- hint: `LEFT JOIN film_category`, group by category, REFRESH after the INSERT.
CREATE MATERIALIZED VIEW category_counts AS
SELECT c.name, COUNT(fc.film_id) AS films
FROM category c
LEFT JOIN film_category fc ON fc.category_id = c.category_id
GROUP BY c.name;
INSERT INTO category (name) VALUES ('Zombie');
REFRESH MATERIALIZED VIEW category_counts;

SELECT COUNT(*) AS rows_after_refresh FROM category_counts;
```
