---
title: "What Is PostgreSQL?"
order: 0
---

PostgreSQL (often just "Postgres") is a free, open-source database that stores data in organised tables and lets you ask questions about that data using a language called **SQL**.

Banks, shops and streaming services keep their information in databases like this one. Learning PostgreSQL means learning to talk to that database: to read from it, change it, and design it well.

## What you'll learn

- What a relational database (RDBMS) is
- What tables, rows and columns are
- How keys link one table to another
- What the DVD Rental database is and what it contains
- What makes PostgreSQL different from other databases

## The idea in plain English

Think of a spreadsheet, but stricter. A relational database management system (**RDBMS**) keeps information in **tables**. Each table is about one kind of thing, such as films, customers or rentals.

- A **column** is one property, such as `title` or `rental_rate`. Every column has a fixed **data type**: text, whole number, date, and so on.
- A **row** is one item: one film, one customer, one rental.
- A **primary key** is a column (often an ID number) that is different for every row, so each row can be pointed at without confusion.
- A **foreign key** is a column that holds another table's primary key. That is how tables are linked. A rental holds a `customer_id`, which points at one row in the `customer` table.

Splitting data across tables means each fact is stored **once**. A customer's name lives in one place, not copied onto every one of their rentals. When the name changes, you change it once.

## What makes PostgreSQL special

PostgreSQL follows the SQL standard closely and adds a lot on top of it. Things you will meet in this course:

- **Rich data types:** arrays, ranges, enums, JSON, and full-text search values, all usable in ordinary columns.
- **Strong transactions:** every change is all-or-nothing, and readers never block writers.
- **Powerful queries:** window functions, recursive queries, and `LATERAL` joins.
- **Extensible:** you can add functions, operators, index types and whole extensions.

## The DVD Rental database

This whole course uses one sample database, **DVD Rental**, the records of a DVD-rental company. It has {{= SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE 'payment\_p%' }} main tables (the `payment` table is stored in several monthly pieces, called *partitions*, which you will meet later). Here are the ones we will use most:

| Table | What one row is |
|---|---|
| `film` | A film (title, rating, length, rental price) |
| `actor` | An actor |
| `category` | A genre, such as Comedy |
| `customer` | A person who rents films |
| `rental` | One rental: who took which copy, and when |
| `payment` | One payment for a rental |
| `inventory` | One physical copy of a film in a store |
| `store`, `staff` | The two stores and their employees |
| `address`, `city`, `country` | Where customers and stores are |

## Seeing it for real

Here is a whole (small) table: the languages a film can be in. Each row has a primary key, `language_id`.

```sql run
SELECT language_id, trim(name) AS name FROM language;
```

And here are the first films, each pointing at a language with a foreign key:

```sql run
SELECT film_id, title, language_id
FROM film
ORDER BY film_id
LIMIT 5;
```

Every film says `language_id = 1`. That number is a link to the row in the `language` table where `language_id = 1`, which is English. The film table stores just the number, and the name `English` is stored once.

## Watch out

- **A table is not ordered.** Unless you ask for an order (you will learn `ORDER BY` soon), PostgreSQL is free to return rows in any order.
- **PostgreSQL, SQL and "the database" are different things.** PostgreSQL is the program, SQL is the language you speak to it, and the database is the collection of tables inside it.

## Interview corner

**"What is the difference between SQL and PostgreSQL?"**
SQL is the standard language for talking to relational databases. PostgreSQL is one product that understands SQL, along with MySQL, SQL Server, Oracle and others. They share most of the language and differ in details.

**"What is a relational database?"**
One that stores data in tables and links the tables through keys, so each fact is stored once and combined when needed.

**"What is the difference between a primary key and a foreign key?"**
A primary key uniquely identifies a row in its own table. A foreign key is a column that holds the primary key of a row in another table.

Next you will set up your own copy of this database.
