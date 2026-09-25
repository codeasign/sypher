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

Look at the `rental` table. It records *which* customer rented *which* copy of a film, but it does not hold their names. It stores numbers instead:

```sql run
SELECT rental_id, inventory_id, customer_id, staff_id
FROM rental
ORDER BY rental_id
LIMIT 3;
```

`customer_id` is a **foreign key**. It points at the primary key of the `customer` table, where the name lives:

```sql run
SELECT customer_id, first_name, last_name
FROM customer
WHERE customer_id IN (130, 459, 408)
ORDER BY customer_id;
```

Storing the name once, in `customer`, and pointing at it everywhere else, means a name change happens in exactly one place. The cost is that a question such as "*who* rented copy 367?" needs both tables. Joins are how you ask it.

## The chain of tables

Follow the arrows to see how a customer's rental connects to a film:

```text
customer --< rental >-- inventory >-- film --< film_actor >-- actor
                                        |
                                        +--< film_category >-- category
```

So "which films did this customer rent?" travels `customer` → `rental` → `inventory` → `film`. Films connect to actors and categories through two link tables, `film_actor` and `film_category`, because one film has many actors and one actor is in many films.

## Seeing all the links

PostgreSQL records every foreign key. This query lists the ones that point at `film`, so you can read the map yourself:

```sql run
SELECT conrelid::regclass AS from_table, a.attname AS from_column, confrelid::regclass AS to_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
WHERE c.contype = 'f' AND c.confrelid = 'film'::regclass
ORDER BY 1, 2;
```

`\d film` in `psql` shows the same under "Referenced by". There are {{= SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public' }} foreign key constraints in this database (a partitioned table repeats its keys on every partition).

## Try it yourself

Use `\d rental`, `\d inventory` and `\d payment` in `psql` and find each foreign key.

## Watch out

### A foreign key must match a real row

PostgreSQL will refuse to store a rental for a customer that does not exist. That is the whole point of a foreign key:

```sql run error destructive
INSERT INTO rental (inventory_id, customer_id, staff_id, rental_period)
VALUES (1, 99999, 1, tsrange(now()::timestamp, NULL));
```

The message names the constraint that stopped the row. You will meet `INSERT` properly in Module 10.

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
-- hint: `WHERE customer_id = 1`.
SELECT first_name, last_name
FROM customer
WHERE customer_id = 1;
```

### Core: where does it point?

List the tables and columns that hold a foreign key pointing at the `customer` table, as `table_name` and `column_name`. Order by both. (Use `pg_constraint` as in the example, and show the table name with `conrelid::regclass::text`.)

```sql practice
-- hint: Change `film` to `customer` in the example, and cast the table name to text.
SELECT conrelid::regclass::text AS table_name, a.attname AS column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
WHERE c.contype = 'f' AND c.confrelid = 'customer'::regclass
ORDER BY 1, 2;
```

### Stretch: the many-to-many link

How many rows does the link table `film_actor` have? And how many different films and actors appear in it? Return `pairings`, `films` and `actors`.

```sql practice
-- hint: `COUNT(*)`, `COUNT(DISTINCT film_id)` and `COUNT(DISTINCT actor_id)`.
SELECT COUNT(*) AS pairings, COUNT(DISTINCT film_id) AS films, COUNT(DISTINCT actor_id) AS actors
FROM film_actor;
```
