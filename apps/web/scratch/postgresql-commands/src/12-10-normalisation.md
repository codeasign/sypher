---
title: "Normalisation: 1NF, 2NF and 3NF"
order: 0
---

**Normalisation** is the process of organising tables so that each fact is stored **once**. It is the reason the DVD Rental database has a `customer` table and a `rental` table instead of one giant sheet. It prevents a whole family of bugs that show up when the same fact is copied in many places.

## What you'll learn

- The problems of a single "flat" table
- The first three normal forms, with examples
- How to split a flat table into related tables
- When denormalising is fine

## The problem: everything in one table

An online shop that keeps every order in one table:

```sql run destructive
CREATE TABLE orders_flat (
  order_id integer,
  customer_name text,
  customer_city text,
  product_id integer,
  product_name text,
  unit_price numeric(6, 2),
  qty integer
);

INSERT INTO orders_flat VALUES
  (1, 'Asha', 'Pune', 10, 'Notebook', 4.50, 2),
  (1, 'Asha', 'Pune', 20, 'Stapler', 12.00, 1),
  (2, 'Asha', 'Pune', 10, 'Notebook', 4.50, 5),
  (3, 'Ben', 'Delhi', 10, 'Notebook', 4.50, 1);

SELECT * FROM orders_flat ORDER BY order_id, product_id;
```

Asha's city is stored in **three** rows, and the notebook's name and price in **three**. That repetition causes three kinds of trouble, called *anomalies*.

### Update anomaly

Asha moves to Mumbai. If you update only one of her rows, the data now disagrees with itself:

```sql run destructive
UPDATE orders_flat SET customer_city = 'Mumbai' WHERE order_id = 1 AND product_id = 10;

SELECT DISTINCT customer_name, customer_city FROM orders_flat WHERE customer_name = 'Asha' ORDER BY 2;
```

Asha now lives in two cities.

### Delete anomaly

Delete the only order that contains the stapler, and the stapler (its name and price) vanishes from the database too.

### Insert anomaly

You cannot record a new customer, or a new product, until they appear in an order, because every row must have an order and a product.

## The normal forms

### First normal form: one value per cell

A column holding a comma-separated list is not atomic, and it is painful to query:

```sql run
SELECT 'paper,office' AS tags, string_to_array('paper,office', ',') AS as_array, unnest(string_to_array('paper,office', ',')) AS one_per_row;
```

The fix is a separate row per tag (or, in PostgreSQL, a real array column when the list belongs with the row).

### Second normal form: depend on the whole key

In `orders_flat` the key is `(order_id, product_id)`. But `product_name` and `unit_price` depend on `product_id` **alone**, and `customer_name` on `order_id` alone. Those are partial dependencies. The cure is to give each their own table.

### Third normal form: depend only on the key

If an order row stored `customer_id`, `customer_city` and the customer's postcode, the city would depend on `customer_id`, not on the order. That is a transitive dependency. Again the cure is a separate `customer` table.

## Splitting the flat table

Each fact goes into the table it belongs to, and the tables link with keys:

```sql run destructive
CREATE TABLE customer_n (customer_id integer PRIMARY KEY, name text NOT NULL, city text NOT NULL);
CREATE TABLE product_n (product_id integer PRIMARY KEY, name text NOT NULL, unit_price numeric(6, 2) NOT NULL);
CREATE TABLE order_n (order_id integer PRIMARY KEY, customer_id integer NOT NULL REFERENCES customer_n);
CREATE TABLE order_line_n (
  order_id integer REFERENCES order_n,
  product_id integer REFERENCES product_n,
  qty integer NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO customer_n VALUES (1, 'Asha', 'Pune'), (2, 'Ben', 'Delhi');
INSERT INTO product_n VALUES (10, 'Notebook', 4.50), (20, 'Stapler', 12.00);
INSERT INTO order_n VALUES (1, 1), (2, 1), (3, 2);
INSERT INTO order_line_n VALUES (1, 10, 2), (1, 20, 1), (2, 10, 5), (3, 10, 1);

SELECT c.name, c.city FROM customer_n c ORDER BY c.customer_id;
```

Asha's city, the notebook's price and the stapler's name are now each stored **once**.

### The same report, by joining

Nothing was lost. Joining the tables gives back exactly what the flat table showed:

```sql run destructive
SELECT o.order_id, c.name AS customer, p.name AS product, p.unit_price, l.qty
FROM order_line_n l
JOIN order_n o ON o.order_id = l.order_id
JOIN customer_n c ON c.customer_id = o.customer_id
JOIN product_n p ON p.product_id = l.product_id
ORDER BY o.order_id, p.product_id;
```

### The anomalies are gone

Moving Asha is one update, in one place. And a new product can exist without any order:

```sql run destructive
UPDATE customer_n SET city = 'Mumbai' WHERE customer_id = 1;
INSERT INTO product_n VALUES (30, 'Pencil', 0.50);

SELECT (SELECT city FROM customer_n WHERE customer_id = 1) AS asha_city, (SELECT COUNT(*) FROM product_n) AS products;
```

## Try it yourself

Design tables for a library (books, authors, members, loans) on paper. For each, ask: what does this column depend on? Is it the whole key, and only the key?

## Watch out

### Normalising too far

Splitting into dozens of tiny tables makes every query a long chain of joins. For most application data, **3NF is the goal**.

### Denormalise on purpose, and only when you must

Reporting tables and read-heavy caches are often deliberately denormalised: the customer's city is copied into each order row so reports run fast without joins. That is a trade-off you make knowingly, and you accept the update problem, usually by rebuilding the copy from the clean tables.

### "Normal" does not mean "correct"

Normalisation removes redundancy. It does not decide whether your design matches the business, so a design still needs to be checked against real questions.

### Prices in an order line

A real shop keeps the **price at the time of sale** in the order line, because a product's price changes later. That is a deliberate copy, not an anomaly.

### Arrays and jsonb are not a licence to skip normal forms

PostgreSQL lets you store lists and JSON in a column. That is fine for data that belongs with its row (a few tags), but not for facts you need to join, count or keep consistent.

## Interview corner

**"What is normalisation, and why do it?"**
Organising data so each fact is stored once, to avoid update, insert and delete anomalies and to save space.

**"Explain 1NF, 2NF and 3NF."**
1NF: atomic values, no repeating groups. 2NF: every non-key column depends on the whole primary key. 3NF: non-key columns depend only on the key, not on each other. A short way to remember: "the key, the whole key, and nothing but the key."

**"When would you denormalise?"**
For read performance in reporting and analytics, or to keep a historical value (such as a price at the time of an order), accepting the extra work to keep copies consistent.

**"Design a schema for an online shop on a whiteboard."**
Customers, products, orders, order lines (link table with quantity and price), maybe addresses and categories. Say which columns are keys, which relationships are one-to-many and many-to-many.

## Practice

### Warm-up: spot the anomaly

Using a flat table `orders_flat2` (copy of the one above with the three Asha rows), update **one** of Asha's rows to city `Mumbai`, then return the number of **different cities** on file for the customer `Asha` as `cities_for_asha`.

```sql practice destructive
-- hint: Create the flat table, update one row, then `COUNT(DISTINCT customer_city)`.
CREATE TABLE orders_flat2 (order_id integer, customer_name text, customer_city text, product_id integer);
INSERT INTO orders_flat2 VALUES (1, 'Asha', 'Pune', 10), (1, 'Asha', 'Pune', 20), (2, 'Asha', 'Pune', 10);
UPDATE orders_flat2 SET customer_city = 'Mumbai' WHERE order_id = 1 AND product_id = 10;

SELECT COUNT(DISTINCT customer_city) AS cities_for_asha FROM orders_flat2 WHERE customer_name = 'Asha';
```

### Core: split out the customers

From a flat table with columns `(order_id, customer_name, customer_city)` and rows `(1,'Asha','Pune')`, `(2,'Asha','Pune')`, `(3,'Ben','Delhi')`, create a `customer_split` table with the **distinct** name and city pairs, and return the number of rows in it as `customer_rows`.

```sql practice destructive
-- hint: `CREATE TABLE customer_split AS SELECT DISTINCT customer_name, customer_city FROM ...`.
CREATE TABLE flat3 (order_id integer, customer_name text, customer_city text);
INSERT INTO flat3 VALUES (1, 'Asha', 'Pune'), (2, 'Asha', 'Pune'), (3, 'Ben', 'Delhi');
CREATE TABLE customer_split AS SELECT DISTINCT customer_name, customer_city FROM flat3;

SELECT COUNT(*) AS customer_rows FROM customer_split;
```

### Stretch: one row per tag

A table stores `(1, 'paper,office')` and `(2, 'office,writing')` in a `tags` column. Split it into one row per tag with `unnest(string_to_array(...))`, and return each product with its tag, ordered by product and tag.

```sql practice destructive
-- hint: `SELECT product_id, unnest(string_to_array(tags, ',')) AS tag FROM ...`.
CREATE TABLE tagged (product_id integer, tags text);
INSERT INTO tagged VALUES (1, 'paper,office'), (2, 'office,writing');

SELECT product_id, unnest(string_to_array(tags, ',')) AS tag FROM tagged ORDER BY product_id, tag;
```
