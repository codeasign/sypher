---
title: "Views"
order: 0
---

A **view** is a saved query that you use like a table. It stores no data of its own: every time you read from the view, MySQL runs the query behind it. Views hide complexity, give people a simpler picture of the data, and control which columns they can see.

## What you'll learn

- Creating, changing and dropping views
- Using a view like a table
- Updating data through a view, and `WITH CHECK OPTION`
- When a view cannot be updated

## Syntax

```sql show
CREATE VIEW view_name AS
SELECT ... ;

CREATE OR REPLACE VIEW view_name AS SELECT ... ;

DROP VIEW view_name;
```

## You have already used views

The DVD Rental database ships with several. `customer_list` and `film_list` are views, not tables:

```sql run
SHOW FULL TABLES WHERE Table_type = 'VIEW';
```

## Examples

### A view that hides a join

Customer contact details are spread over four tables. A view puts them in one place:

```sql run destructive
CREATE VIEW customer_contact AS
SELECT c.customer_id,
       CONCAT(c.first_name, ' ', c.last_name) AS name,
       c.email,
       a.phone,
       ci.city,
       co.country
FROM customer AS c
JOIN address AS a ON a.address_id = c.address_id
JOIN city AS ci ON ci.city_id = a.city_id
JOIN country AS co ON co.country_id = ci.country_id;

SELECT customer_id, name, city, country
FROM customer_contact
WHERE country = 'Canada'
ORDER BY customer_id;
```

The person writing the second query never needs to know about `address`, `city` or `country`.

### A view always shows current data

The view reads the base tables every time, so it never goes out of date:

```sql run destructive
UPDATE customer SET first_name = 'MARIA' WHERE customer_id = 1;

SELECT customer_id, name FROM customer_contact WHERE customer_id = 1;
```

### A view for safety: hide the sensitive columns

Give an analyst access to the view and not to the table, and they cannot see what the view leaves out. This one hides emails and addresses:

```sql run destructive
CREATE VIEW customer_public AS
SELECT customer_id, first_name, store_id, active
FROM customer;

SELECT customer_id, first_name FROM customer_public ORDER BY customer_id;
```

### A view of a summary

```sql run destructive
CREATE VIEW rating_summary AS
SELECT rating, COUNT(*) AS films, ROUND(AVG(length), 1) AS avg_length
FROM film
GROUP BY rating;

SELECT rating, films, avg_length FROM rating_summary ORDER BY rating;
```

### Changing and dropping a view

```sql run destructive
CREATE VIEW short_films AS SELECT film_id, title, length FROM film WHERE length < 60;

CREATE OR REPLACE VIEW short_films AS SELECT film_id, title, length FROM film WHERE length < 50;

SELECT COUNT(*) AS short_films_now FROM short_films;

DROP VIEW short_films;

SHOW FULL TABLES LIKE 'short_films';
```

## Updating through a view

A **simple** view (one table, no grouping) can be updated, and the change reaches the real table:

```sql run destructive
CREATE VIEW active_customer AS
SELECT customer_id, first_name, last_name, active
FROM customer
WHERE active = 1;

UPDATE active_customer SET last_name = 'RENAMED' WHERE customer_id = 2;

SELECT customer_id, last_name FROM customer WHERE customer_id = 2;
```

### WITH CHECK OPTION

Without it, an update can push a row *out* of the view. `WITH CHECK OPTION` refuses any change that would make the row disappear from the view:

```sql run error destructive
CREATE VIEW active_only AS
SELECT customer_id, first_name, last_name, active
FROM customer
WHERE active = 1
WITH CHECK OPTION;

UPDATE active_only SET active = 0 WHERE customer_id = 3;
```

## Try it yourself

Create a view of the films of one category (joining three tables) and query it with extra filters. Then look at its definition with `SHOW CREATE VIEW`.

## Watch out

### Complex views cannot be updated

A view with `GROUP BY`, `DISTINCT`, an aggregate, a `UNION` or certain joins is read-only:

```sql run error destructive
CREATE OR REPLACE VIEW rating_summary AS
SELECT rating, COUNT(*) AS films FROM film GROUP BY rating;

UPDATE rating_summary SET films = 0 WHERE rating = 'G';
```

### A view is not faster

It is only a saved query. A view of a slow query is slow. (MySQL merges the view into the outer query, so it also gets optimised together with it.)

### Views can hide expensive work

`SELECT * FROM customer_contact` looks innocent, but it joins four tables every time. Stacking views on views makes this worse.

### Changing the base table can break a view

Drop or rename a column that a view uses, and the view stops working (the error appears when you query it, not when you change the table).

### Permissions

A view can expose a slice of a table to a user who has no rights on the table itself. That is a common and useful pattern, but check who has access to what.

## Interview corner

**"What is a view, and why use one?"**
A named, saved `SELECT`. It simplifies complex queries, gives a stable interface when tables change, and restricts which columns or rows a user can see.

**"Does a view store data?"**
No. It runs its query each time. (A *materialised view*, which does store results, is not built in to MySQL.)

**"Can you insert or update through a view?"**
Yes, for simple views based on one table. Not when the view uses aggregates, `GROUP BY`, `DISTINCT` or `UNION`.

**"What does `WITH CHECK OPTION` do?"**
It stops updates or inserts through the view that would create rows the view itself could not show.

## Practice

### Warm-up: a view of one store

Create a view `store_1_customers` with `customer_id`, `first_name` and `last_name` of the customers of store 1, then return how many rows it has as `customers`.

```sql practice destructive
-- hint: `CREATE VIEW ... AS SELECT ... WHERE store_id = 1`.
DROP VIEW IF EXISTS store_1_customers;
CREATE VIEW store_1_customers AS
SELECT customer_id, first_name, last_name
FROM customer
WHERE store_id = 1;

SELECT COUNT(*) AS customers FROM store_1_customers;
```

### Core: a view over a join

Create a view `film_category_list` with `film_id`, `title` and the category `name` as `category`, then return the number of Horror films in it as `horror_films`.

```sql practice destructive
-- hint: Join `film`, `film_category` and `category` inside the view.
DROP VIEW IF EXISTS film_category_list;
CREATE VIEW film_category_list AS
SELECT f.film_id, f.title, c.name AS category
FROM film AS f
JOIN film_category AS fc ON fc.film_id = f.film_id
JOIN category AS c ON c.category_id = fc.category_id;

SELECT COUNT(*) AS horror_films FROM film_category_list WHERE category = 'Horror';
```

### Stretch: prove a view is live

Create a view `film_1_rate` showing `film_id` and `rental_rate` of film 1. **After** creating it, change film 1's `rental_rate` to `9.99` with an `UPDATE`. Then return the `rental_rate` shown by the view.

```sql practice destructive
-- hint: The view reads the base table each time, so it shows the new value.
DROP VIEW IF EXISTS film_1_rate;
CREATE VIEW film_1_rate AS SELECT film_id, rental_rate FROM film WHERE film_id = 1;

UPDATE film SET rental_rate = 9.99 WHERE film_id = 1;

SELECT rental_rate FROM film_1_rate;
```
