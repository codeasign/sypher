---
title: "Why Tables Are Split: Keys and Relationships"
order: 0
---

Real data is split across many tables. To answer most questions you have to bring the pieces back together, and that is what a **join** does. First, a look at how the pieces are linked.

## What you'll learn

- Why a database splits data into several tables
- How a foreign key points at a primary key
- How to see the links in the DVD Rental database

## The idea in plain English

Look at the `rental` table. It records *which* customer rented *which* film, but it does not hold their names. It stores two numbers instead:

```sql run
SELECT rental_id, rental_date, inventory_id, customer_id
FROM rental
ORDER BY rental_id;
```

`customer_id` is a **foreign key**. It points at the primary key of the `customer` table, where the name lives:

```sql run
SELECT customer_id, first_name, last_name
FROM customer
WHERE customer_id = 130;
```

Storing the name once, in `customer`, and pointing at it everywhere else, means a name change happens in exactly one place. The cost is that a question such as "*who* rented film 1?" needs both tables. Joins are how you ask it.

## The chain of tables

Follow the arrows to see how a customer's rental connects to a film:

| Step | Table | Key linking to the next |
|---|---|---|
| a person | `customer` | `customer_id` |
| rents a copy | `rental` | `inventory_id` |
| a physical copy | `inventory` | `film_id` |
| of a film | `film` | |

So "which films did this customer rent?" travels `customer` → `rental` → `inventory` → `film`. Films connect to actors and categories through two link tables, `film_actor` and `film_category`, because one film has many actors and one actor is in many films.

## Seeing all the links

MySQL records every foreign key. This query lists them, so you can read the map yourself:

```sql run rows=8
SELECT table_name AS table_with_the_key,
       column_name AS key_column,
       referenced_table_name AS points_to,
       referenced_column_name AS points_to_column
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND referenced_table_name IS NOT NULL
ORDER BY table_name, column_name;
```

There are {{= SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL }} foreign keys in this database.

## Try it yourself

Use `DESCRIBE` on `rental`, `inventory` and `payment` and find each foreign key (the `MUL` marker in the `Key` column often marks one).

## Watch out

### A foreign key must match a real row

MySQL will refuse to store a rental for a customer that does not exist. That is the whole point of a foreign key:

```sql run error
INSERT INTO rental (rental_date, inventory_id, customer_id, staff_id)
VALUES ('2005-06-01 10:00:00', 1, 60000, 1);
```

The message names the constraint that stopped the row. You will meet `INSERT` properly in Module 11.

### Similar names, different meaning

Both `film` and `inventory` have a `film_id`, and `customer` and `rental` both have `customer_id`. When you join tables, columns with the same name will need to be told apart. The next pages show how.

## Interview corner

**"What is a foreign key, and why use one?"**
A column that refers to the primary key of another table. It links the tables and lets the database enforce **referential integrity**: you cannot point at a row that does not exist.

**"Why not put everything in one big table?"**
Repeating the same facts in many rows wastes space and invites inconsistency, since you have to change every copy. Splitting the data (normalisation) stores each fact once.

**"How does a many-to-many relationship work, like films and actors?"**
Through a **link table** (`film_actor`) holding one row per pairing, with a foreign key to each side.

## Practice

### Warm-up: find a customer

Show the `first_name` and `last_name` of the customer with `customer_id = 1`.

```sql practice
-- hint: A plain `WHERE customer_id = 1` on the `customer` table.
SELECT first_name, last_name
FROM customer
WHERE customer_id = 1;
```

### Core: where does it point?

List the tables and columns that point at the `film` table (the ones holding a foreign key to `film`), as `table_name` and `column_name`. Order by both.

```sql practice
-- hint: In `information_schema.key_column_usage`, filter on `referenced_table_name = 'film'`.
SELECT table_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND referenced_table_name = 'film'
ORDER BY table_name, column_name;
```

### Stretch: the many-to-many link

How many rows does the link table `film_actor` have? And how many different films and actors appear in it? Return `pairings`, `films` and `actors`.

```sql practice
-- hint: `COUNT(*)`, `COUNT(DISTINCT film_id)` and `COUNT(DISTINCT actor_id)`.
SELECT COUNT(*) AS pairings,
       COUNT(DISTINCT film_id) AS films,
       COUNT(DISTINCT actor_id) AS actors
FROM film_actor;
```
