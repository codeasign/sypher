---
title: "Scenario: Design a Schema on a Whiteboard"
order: 0
---

> "Design the database for an online bookshop. Take your time and talk me through it."

Nobody expects a perfect answer. The interviewer wants to see **how you think**: do you ask questions, find the entities, choose keys, think about relationships and about the queries the system will run? This page gives a repeatable method and then builds the design for real, so you can see it work.

## What you'll learn

- A five-step method for schema design questions
- How to turn requirements into tables, keys and relationships
- Where indexes and constraints go
- How to check the design with real queries

## The method

1. **Clarify the requirements.** What must the system do? Who uses it? How big will it get?
2. **Find the entities** (the nouns): customers, books, authors, orders.
3. **Find the relationships** between them: one-to-many, many-to-many.
4. **Choose keys and columns**, and normalise to about 3NF.
5. **Add constraints and indexes** that the important queries need, then test the design with sample data and queries.

## Step 1: clarify

Questions worth asking aloud: Can a book have several authors? Can a customer have several addresses? Do we need to keep the price at the time of purchase? Do we track stock? Do we store reviews? Is it thousands of orders a day or millions? The answers change the design.

Our assumptions: a book has **one or more authors**, an order has **several lines**, prices change over time, and we track stock.

## Steps 2 and 3: entities and relationships

| Entity | Relationship |
|---|---|
| customer | places many orders (one-to-many) |
| order | has many order lines (one-to-many) |
| book | appears in many order lines (one-to-many) |
| book and author | **many-to-many**, so it needs a link table |
| publisher | publishes many books (one-to-many) |

## Steps 4 and 5: build it

We use a scratch database called `bookshop` so nothing here touches the DVD Rental data:

```sql run as=root destructive
DROP DATABASE IF EXISTS bookshop;
CREATE DATABASE bookshop CHARACTER SET utf8mb4;
USE bookshop;

CREATE TABLE publisher (
  publisher_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE author (
  author_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL
);

CREATE TABLE book (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  isbn CHAR(13) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  publisher_id INT NOT NULL,
  price DECIMAL(8, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  CONSTRAINT price_positive CHECK (price > 0),
  CONSTRAINT stock_not_negative CHECK (stock >= 0),
  CONSTRAINT fk_book_publisher FOREIGN KEY (publisher_id) REFERENCES publisher (publisher_id),
  INDEX idx_book_title (title)
);

CREATE TABLE book_author (
  book_id INT NOT NULL,
  author_id INT NOT NULL,
  PRIMARY KEY (book_id, author_id),
  CONSTRAINT fk_ba_book FOREIGN KEY (book_id) REFERENCES book (book_id) ON DELETE CASCADE,
  CONSTRAINT fk_ba_author FOREIGN KEY (author_id) REFERENCES author (author_id)
);

CREATE TABLE customer (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL
);

CREATE TABLE customer_order (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  ordered_on DATE NOT NULL,
  status ENUM('new', 'paid', 'shipped', 'cancelled') NOT NULL DEFAULT 'new',
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id),
  INDEX idx_order_customer_date (customer_id, ordered_on)
);

CREATE TABLE order_line (
  order_id INT NOT NULL,
  book_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(8, 2) NOT NULL,
  PRIMARY KEY (order_id, book_id),
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT fk_line_order FOREIGN KEY (order_id) REFERENCES customer_order (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_line_book FOREIGN KEY (book_id) REFERENCES book (book_id)
);

SHOW TABLES;
```

### Why each choice

| Choice | Reason |
|---|---|
| `book_author` link table | a book can have several authors, an author several books |
| `unit_price` **in the order line** | the price at purchase time must not change when the catalogue price does |
| `UNIQUE` on `isbn` and `email` | real-world identifiers must not repeat |
| `CHECK` on price, stock, quantity | impossible values are refused by the database |
| `ON DELETE CASCADE` on lines and links | a line has no meaning without its order |
| index `(customer_id, ordered_on)` | "a customer's orders by date" is a very common query |
| index on `title` | searching by title |

## Test it with data and real questions

A design is only good if it answers the questions. Add sample data:

```sql run as=root destructive
USE bookshop;

INSERT INTO publisher (name) VALUES ('Orbit'), ('Tor');
INSERT INTO author (name) VALUES ('Ursula K. Le Guin'), ('Terry Pratchett'), ('Neil Gaiman');
INSERT INTO book (isbn, title, publisher_id, price, stock) VALUES
  ('9780000000011', 'A Wizard of Earthsea', 1, 12.50, 20),
  ('9780000000028', 'Small Gods', 1, 9.99, 5),
  ('9780000000035', 'Good Omens', 2, 11.00, 0);
INSERT INTO book_author VALUES (1, 1), (2, 2), (3, 2), (3, 3);
INSERT INTO customer (email, name) VALUES ('asha@example.com', 'Asha'), ('ben@example.com', 'Ben');
INSERT INTO customer_order (customer_id, ordered_on, status) VALUES (1, '2025-01-10', 'paid'), (1, '2025-02-03', 'shipped'), (2, '2025-02-15', 'paid');
INSERT INTO order_line VALUES (1, 1, 1, 12.50), (1, 2, 2, 9.99), (2, 3, 1, 11.00), (3, 2, 1, 9.99);

SELECT (SELECT COUNT(*) FROM book) AS books,
       (SELECT COUNT(*) FROM customer_order) AS orders,
       (SELECT COUNT(*) FROM order_line) AS order_lines;
```

**Question 1: revenue per customer**

```sql run as=root destructive
USE bookshop;

SELECT c.name, SUM(l.quantity * l.unit_price) AS spent
FROM customer AS c
JOIN customer_order AS o ON o.customer_id = c.customer_id
JOIN order_line AS l ON l.order_id = o.order_id
GROUP BY c.customer_id, c.name
ORDER BY spent DESC;
```

**Question 2: a book with all its authors** (this needs the link table)

```sql run as=root destructive
USE bookshop;

SELECT b.title, GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR ', ') AS authors
FROM book AS b
JOIN book_author AS ba ON ba.book_id = b.book_id
JOIN author AS a ON a.author_id = ba.author_id
GROUP BY b.book_id, b.title
ORDER BY b.title;
```

**Question 3: what is out of stock but has been ordered?**

```sql run as=root destructive
USE bookshop;

SELECT b.title, b.stock, SUM(l.quantity) AS ordered
FROM book AS b
JOIN order_line AS l ON l.book_id = b.book_id
WHERE b.stock < 1
GROUP BY b.book_id, b.title;
```

The constraints protect the data too. A negative price is refused, and so is a line for a book that does not exist:

```sql run as=root error destructive
USE bookshop;

INSERT INTO book (isbn, title, publisher_id, price) VALUES ('9780000000042', 'Free Book', 1, -5.00);
```

Finally, clean up the scratch database:

```sql run as=root destructive
DROP DATABASE bookshop;

SELECT COUNT(*) AS bookshop_databases FROM information_schema.schemata WHERE schema_name = 'bookshop';
```

## What to say out loud

1. "Before designing, I would ask what the system must do and roughly how big it gets."
2. "The entities are customer, order, book, author and publisher. Book to author is many-to-many, so I need a link table."
3. "Each table gets a surrogate primary key. I would keep `isbn` and `email` as `UNIQUE`. I would store the **price at the time of sale** in the order line."
4. "I would normalise to 3NF, and add foreign keys, and `CHECK` constraints on things like price and quantity."
5. "Indexes follow the queries: orders by customer and date, and book search by title. I would look at the real queries before adding more."
6. "If reporting becomes heavy I would consider summary tables or a read replica, and only then denormalise."

## Try it yourself

Extend the design on paper: add **reviews** (a customer reviews a book, once), **addresses** (a customer has many), and **categories** (a book can be in several). Which are one-to-many and which are many-to-many?

## Watch out

### Do not skip the questions

Jumping straight to tables shows you did not think about the requirements. Asking about scale, edge cases (several authors, price changes) and the main queries is part of the answer.

### Do not over-normalise, and do not under-normalise

Splitting everything into tiny tables makes every query a maze. Repeating the customer's name in every order is an update problem. Aim for 3NF, and know when to bend it.

### Money and time

Use `DECIMAL` for money, and store the price actually charged on the order line. Use `DATETIME` or `TIMESTAMP` with a clear time zone policy for moments.

### Think about deletion

What happens to orders if a customer is deleted? (Here the foreign key refuses it, which is usually right: you keep financial history. Some systems "soft delete" with an `is_active` flag.)

## Interview corner

**"How do you model a many-to-many relationship?"**
With a link table holding the two foreign keys, usually as a composite primary key.

**"Why store the price in the order line?"**
The catalogue price changes, but an order must always show what the customer actually paid.

**"How would this design change at ten times the size?"**
Check the indexes against real query plans, consider partitioning very large tables (orders by date), add read replicas for reporting, and cache hot reads.

**"Surrogate or natural primary keys?"**
Surrogate (generated integer) primary keys, plus `UNIQUE` constraints on natural identifiers such as ISBN and email.

## Practice

### Warm-up: count the constraints

Build the schema above (you can copy the statements), and then return how many `CHECK` constraints the `bookshop` database has, as `checks`. (Look in `information_schema.check_constraints`.)

```sql practice as=root destructive
-- hint: `SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_schema = 'bookshop'`.
DROP DATABASE IF EXISTS bookshop;
CREATE DATABASE bookshop;
USE bookshop;
CREATE TABLE book (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  price DECIMAL(8, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  CONSTRAINT price_positive CHECK (price > 0),
  CONSTRAINT stock_not_negative CHECK (stock >= 0)
);
CREATE TABLE order_line (
  order_id INT NOT NULL,
  book_id INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (order_id, book_id),
  CONSTRAINT quantity_positive CHECK (quantity > 0)
);

SELECT COUNT(*) AS checks FROM information_schema.check_constraints WHERE constraint_schema = 'bookshop';
DROP DATABASE bookshop;
```

### Core: add reviews

In a fresh `bookshop` with `customer` and `book` tables, add a `review` table: `review_id`, `book_id`, `customer_id`, `stars TINYINT` (1 to 5 with a `CHECK`), with a **unique pair** so a customer can review a book only once. Insert two reviews for book 1 (from customers 1 and 2) and return the average stars as `avg_stars`.

```sql practice as=root destructive
-- hint: `UNIQUE (book_id, customer_id)` and `CHECK (stars BETWEEN 1 AND 5)`.
DROP DATABASE IF EXISTS bookshop;
CREATE DATABASE bookshop;
USE bookshop;
CREATE TABLE customer (customer_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(40) NOT NULL);
CREATE TABLE book (book_id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(80) NOT NULL);
CREATE TABLE review (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  customer_id INT NOT NULL,
  stars TINYINT NOT NULL,
  CONSTRAINT stars_1_to_5 CHECK (stars BETWEEN 1 AND 5),
  CONSTRAINT one_review_each UNIQUE (book_id, customer_id),
  FOREIGN KEY (book_id) REFERENCES book (book_id),
  FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
);
INSERT INTO customer (name) VALUES ('Asha'), ('Ben');
INSERT INTO book (title) VALUES ('Small Gods');
INSERT INTO review (book_id, customer_id, stars) VALUES (1, 1, 5), (1, 2, 4);

SELECT AVG(stars) AS avg_stars FROM review WHERE book_id = 1;
DROP DATABASE bookshop;
```

### Stretch: a many-to-many category link

Add `category (category_id, name)` and a link table `book_category (book_id, category_id)` with a composite primary key. Give book 1 two categories, and return each category name of book 1 in alphabetical order (`name`).

```sql practice as=root destructive
-- hint: A link table with PRIMARY KEY (book_id, category_id), then join to category.
DROP DATABASE IF EXISTS bookshop;
CREATE DATABASE bookshop;
USE bookshop;
CREATE TABLE book (book_id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(80) NOT NULL);
CREATE TABLE category (category_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(40) NOT NULL);
CREATE TABLE book_category (
  book_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (book_id, category_id),
  FOREIGN KEY (book_id) REFERENCES book (book_id),
  FOREIGN KEY (category_id) REFERENCES category (category_id)
);
INSERT INTO book (title) VALUES ('Good Omens');
INSERT INTO category (name) VALUES ('Fantasy'), ('Humour'), ('Crime');
INSERT INTO book_category VALUES (1, 1), (1, 2);

SELECT c.name
FROM book_category AS bc
JOIN category AS c ON c.category_id = bc.category_id
WHERE bc.book_id = 1
ORDER BY c.name;
DROP DATABASE bookshop;
```
