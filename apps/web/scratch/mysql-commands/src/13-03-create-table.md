---
title: "CREATE TABLE"
order: 0
---

`CREATE TABLE` defines a new table: its name, its columns, and the type of each. It is where a design on paper becomes something you can store data in.

## What you'll learn

- Writing a `CREATE TABLE` statement
- Column options: `NOT NULL`, `DEFAULT`, `AUTO_INCREMENT`
- Inspecting the result with `DESCRIBE` and `SHOW CREATE TABLE`

## Syntax

```sql show
CREATE TABLE table_name (
  column1 datatype options,
  column2 datatype options,
  PRIMARY KEY (column1)
);
```

Columns are separated by commas, and the whole list sits in one pair of brackets.

## Examples

### A first table

An `author` table for a bookshop. The `id` fills itself in, and `name` must always be given:

```sql run destructive
CREATE TABLE author (
  author_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  country VARCHAR(40)
);

DESCRIBE author;
```

### A table with defaults

A `DEFAULT` is the value used when you do not supply one:

```sql run destructive
CREATE TABLE book (
  book_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  price DECIMAL(8, 2) NOT NULL DEFAULT 9.99,
  pages SMALLINT UNSIGNED,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  added_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DESCRIBE book;
```

`CURRENT_TIMESTAMP` fills in the moment the row is inserted.

### Insert and read back

Give only the columns that have no default, and let MySQL fill in the rest:

```sql run destructive
INSERT INTO author (name, country) VALUES ('Terry Pratchett', 'United Kingdom');
INSERT INTO book (title, author_id, pages) VALUES ('Small Gods', 1, 384);

SELECT book_id, title, author_id, price, pages, in_stock FROM book;
```

The `price` and `in_stock` columns took their default values.

### See the full definition

`SHOW CREATE TABLE` prints the exact statement MySQL stored, including options you did not spell out:

```sql run destructive raw
SHOW CREATE TABLE author;
```

## Try it yourself

Create a `customer_note` table with an id, a note (text, required) and a `created_at` that fills itself in, then insert a note.

## Watch out

### The table must not already exist

```sql run error destructive
CREATE TABLE author (id INT);
```

`CREATE TABLE IF NOT EXISTS author (...)` skips it quietly when it exists. Drop the old one first if you want to recreate it.

### Give every table a primary key

A table without one has no reliable way to point at a single row, and many features (replication, foreign keys) work badly. Even a link table needs a key, often made of its two columns.

### Choose names you will not regret

Use lower-case words with underscores (`order_item`), singular or plural consistently, and avoid reserved words (`order`, `group`, `key`) as names. A good name saves a lot of explaining.

### DEFAULT must be a fixed value or a simple expression

You can use `CURRENT_TIMESTAMP` and, in MySQL 8, expressions in brackets, for example `DEFAULT (UUID())`. Most other functions are not allowed as defaults.

## Interview corner

**"What is the difference between `CREATE TABLE` and `CREATE TABLE IF NOT EXISTS`?"**
The first errors if the table exists. The second does nothing in that case.

**"What does `AUTO_INCREMENT` do?"**
It gives each new row the next number in a sequence automatically, usually for the primary key.

**"How would you see the exact definition of an existing table?"**
`SHOW CREATE TABLE table_name`, or `DESCRIBE table_name` for a quick column list.

## Practice

### Warm-up: a small table

Create `genre` with `genre_id INT AUTO_INCREMENT PRIMARY KEY` and `name VARCHAR(30) NOT NULL`. Insert `Fantasy` and `Mystery`, and return both rows.

```sql practice destructive
-- hint: Let `genre_id` fill itself in; insert only the names.
DROP TABLE IF EXISTS genre;
CREATE TABLE genre (
  genre_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL
);
INSERT INTO genre (name) VALUES ('Fantasy'), ('Mystery');

SELECT genre_id, name FROM genre ORDER BY genre_id;
```

### Core: defaults at work

Create `member` with `member_id INT AUTO_INCREMENT PRIMARY KEY`, `name VARCHAR(40) NOT NULL`, and `level VARCHAR(10) NOT NULL DEFAULT 'bronze'`. Insert two members giving only names, and return `name` and `level`.

```sql practice destructive
-- hint: Both rows should get the default level.
DROP TABLE IF EXISTS member;
CREATE TABLE member (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  level VARCHAR(10) NOT NULL DEFAULT 'bronze'
);
INSERT INTO member (name) VALUES ('Asha'), ('Ben');

SELECT name, level FROM member ORDER BY member_id;
```

### Stretch: describe it

Create `event` with `event_id INT AUTO_INCREMENT PRIMARY KEY`, `title VARCHAR(80) NOT NULL`, `starts_on DATE`, and `capacity SMALLINT UNSIGNED DEFAULT 50`. Return `DESCRIBE event` output.

```sql practice destructive
-- hint: `DESCRIBE event;` as the final statement.
DROP TABLE IF EXISTS event;
CREATE TABLE event (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  starts_on DATE,
  capacity SMALLINT UNSIGNED DEFAULT 50
);

DESCRIBE event;
```
