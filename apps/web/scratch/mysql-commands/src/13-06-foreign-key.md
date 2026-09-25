---
title: "FOREIGN KEY"
order: 0
---

A **foreign key** makes a column in one table point at the primary key of another, and the database then refuses any row that points at nothing. It is what keeps a relational database consistent: no book without an author, no rental for a customer who does not exist.

## What you'll learn

- Creating a foreign key
- What `ON DELETE` and `ON UPDATE` rules do
- The errors a foreign key produces
- The requirements a foreign key has

## Syntax

```sql show
CREATE TABLE child (
  child_id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  CONSTRAINT fk_child_parent
    FOREIGN KEY (parent_id) REFERENCES parent (parent_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
```

The **parent** table holds the key being pointed at. The **child** table holds the foreign key column.

## Set up a parent and a child

```sql run destructive
CREATE TABLE author (
  author_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE book (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  author_id INT NOT NULL,
  CONSTRAINT fk_book_author FOREIGN KEY (author_id) REFERENCES author (author_id)
);

INSERT INTO author (name) VALUES ('Ursula Le Guin'), ('Terry Pratchett');
INSERT INTO book (title, author_id) VALUES ('A Wizard of Earthsea', 1), ('Small Gods', 2);

SELECT b.title, a.name AS author
FROM book AS b
JOIN author AS a ON a.author_id = b.author_id
ORDER BY b.book_id;
```

## The rules that stop bad data

### A child must point at a real parent

```sql run error destructive
INSERT INTO book (title, author_id) VALUES ('Orphan Book', 99);
```

There is no author with `author_id` 99, so the foreign key refuses the book (error 1452). A child row cannot point at a parent that does not exist.

### A parent with children cannot be deleted

By default (`RESTRICT`), you cannot remove an author who still has books:

```sql run error destructive
DELETE FROM author WHERE author_id = 1;
```

## ON DELETE and ON UPDATE actions

You choose what happens to the children when a parent is deleted or its key is changed:

| Action | On deleting the parent |
|---|---|
| `RESTRICT` (default) | refuse the delete |
| `CASCADE` | delete the children too |
| `SET NULL` | set the child's key to `NULL` (the column must allow it) |
| `NO ACTION` | same as `RESTRICT` in MySQL |

### CASCADE: children go with the parent

```sql run destructive
CREATE TABLE review (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  stars TINYINT NOT NULL,
  CONSTRAINT fk_review_book FOREIGN KEY (book_id) REFERENCES book (book_id) ON DELETE CASCADE
);

INSERT INTO review (book_id, stars) VALUES (1, 5), (1, 4), (2, 5);

DELETE FROM book WHERE book_id = 1;

SELECT COUNT(*) AS reviews_left FROM review;
```

Deleting book 1 removed its two reviews automatically.

### SET NULL: keep the child, forget the link

```sql run destructive
CREATE TABLE loan (
  loan_id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NULL,
  borrower VARCHAR(30) NOT NULL,
  CONSTRAINT fk_loan_book FOREIGN KEY (book_id) REFERENCES book (book_id) ON DELETE SET NULL
);

INSERT INTO loan (book_id, borrower) VALUES (2, 'Asha');

DELETE FROM book WHERE book_id = 2;

SELECT loan_id, book_id, borrower FROM loan;
```

## Seeing the rules

MySQL keeps every rule in `information_schema`:

```sql run
SELECT table_name, constraint_name, delete_rule, update_rule
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE()
  AND table_name IN ('book', 'review', 'loan')
ORDER BY table_name;
```

## Try it yourself

Add a foreign key from a new `publisher_id` column on `book` to a `publisher` table, and test both a good and a bad insert.

## Watch out

### The two columns must match exactly

The foreign key column and the key it points to must have the same type (including `UNSIGNED`):

```sql run error destructive
CREATE TABLE bad_child (
  id INT PRIMARY KEY,
  author_id BIGINT NOT NULL,
  CONSTRAINT fk_bad FOREIGN KEY (author_id) REFERENCES author (author_id)
);
```

### You cannot drop a parent that is still referenced

```sql run error destructive
DROP TABLE author;
```

Drop the child tables first (or drop the foreign key). The order of creation and deletion follows the arrows of the design.

### CASCADE is powerful, and dangerous

One delete can remove thousands of rows in other tables, silently. Use `CASCADE` only where children truly have no meaning without the parent (order lines without an order), and `RESTRICT` where losing them would be a mistake.

### Foreign keys need InnoDB

Only InnoDB enforces them. Other engines accept the syntax and ignore it.

### Foreign keys cost a little

Every insert into a child checks the parent, so foreign keys have a small cost, and they need an index on the column (MySQL creates one for you). The safety is almost always worth it.

## Interview corner

**"What is a foreign key?"**
A column (or columns) whose values must match a primary (or unique) key in another table, enforcing referential integrity.

**"What does `ON DELETE CASCADE` do?"**
When the parent row is deleted, the child rows that reference it are deleted automatically.

**"What is the difference between `CASCADE`, `SET NULL` and `RESTRICT`?"**
Delete the children, set their key to `NULL`, or refuse to delete the parent.

**"Why might a team avoid foreign keys?"**
Some very large systems drop them for write speed or because of sharding, and enforce integrity in the application. That is a trade-off, and for most systems the constraint is worth having.

## Practice

### Warm-up: a child table

Create `author` and `book` as above (with the foreign key), insert one author and one book, and return the book's `title` with the author's `name` as `author`.

```sql practice destructive
-- hint: Create the parent first, then the child with the FOREIGN KEY, then join.
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS loan;
DROP TABLE IF EXISTS book;
DROP TABLE IF EXISTS author;
CREATE TABLE author (author_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL);
CREATE TABLE book (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  author_id INT NOT NULL,
  CONSTRAINT fk_book_author FOREIGN KEY (author_id) REFERENCES author (author_id)
);
INSERT INTO author (name) VALUES ('N. K. Jemisin');
INSERT INTO book (title, author_id) VALUES ('The Fifth Season', 1);

SELECT b.title, a.name AS author FROM book AS b JOIN author AS a ON a.author_id = b.author_id;
```

### Core: cascade

Make a `book` table whose foreign key is `ON DELETE CASCADE`. Insert 1 author and 3 books, delete the author, and return the number of books left as `books_left`.

```sql practice destructive
-- hint: Add `ON DELETE CASCADE` to the FOREIGN KEY definition.
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS loan;
DROP TABLE IF EXISTS book;
DROP TABLE IF EXISTS author;
CREATE TABLE author (author_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL);
CREATE TABLE book (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  author_id INT NOT NULL,
  CONSTRAINT fk_book_author FOREIGN KEY (author_id) REFERENCES author (author_id) ON DELETE CASCADE
);
INSERT INTO author (name) VALUES ('A. Writer');
INSERT INTO book (title, author_id) VALUES ('One', 1), ('Two', 1), ('Three', 1);

DELETE FROM author WHERE author_id = 1;

SELECT COUNT(*) AS books_left FROM book;
```

### Stretch: set null

Make the foreign key `ON DELETE SET NULL` (the column must allow `NULL`). Insert 1 author and 2 books, delete the author, and return `title` and `author_id` for both books, ordered by `book_id`.

```sql practice destructive
-- hint: `author_id INT NULL` and `ON DELETE SET NULL`.
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS loan;
DROP TABLE IF EXISTS book;
DROP TABLE IF EXISTS author;
CREATE TABLE author (author_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL);
CREATE TABLE book (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  author_id INT NULL,
  CONSTRAINT fk_book_author FOREIGN KEY (author_id) REFERENCES author (author_id) ON DELETE SET NULL
);
INSERT INTO author (name) VALUES ('A. Writer');
INSERT INTO book (title, author_id) VALUES ('One', 1), ('Two', 1);

DELETE FROM author WHERE author_id = 1;

SELECT title, author_id FROM book ORDER BY book_id;
```
