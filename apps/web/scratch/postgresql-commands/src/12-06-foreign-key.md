---
title: "FOREIGN KEY"
order: 0
---

A **foreign key** makes a column in one table point at the primary key of another, and the database then refuses any row that points at nothing. It is what keeps a relational database consistent: no book without an author, no rental for a customer who does not exist.

## What you'll learn

- Creating a foreign key
- What `ON DELETE` and `ON UPDATE` rules do
- The errors a foreign key produces
- Deferrable constraints, and indexing foreign keys

## Syntax

```sql show
CREATE TABLE child (
  child_id integer PRIMARY KEY,
  parent_id integer NOT NULL REFERENCES parent (parent_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);
```

The **parent** table holds the key being pointed at. The **child** table holds the foreign key column.

## Set up a parent and a child

```sql run destructive
CREATE TABLE author (
  author_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE book (
  book_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  author_id integer NOT NULL,
  CONSTRAINT fk_book_author FOREIGN KEY (author_id) REFERENCES author (author_id)
);

INSERT INTO author (name) VALUES ('Ursula K. Le Guin'), ('Terry Pratchett');
INSERT INTO book (title, author_id) VALUES ('A Wizard of Earthsea', 1), ('Small Gods', 2);

SELECT b.title, a.name AS author FROM book b JOIN author a ON a.author_id = b.author_id ORDER BY b.book_id;
```

## The rules that stop bad data

### A child must point at a real parent

```sql run error destructive
INSERT INTO book (title, author_id) VALUES ('Orphan Book', 99);
```

There is no author with `author_id` 99, so the foreign key refuses the book.

### A parent with children cannot be deleted

By default (`NO ACTION`, which behaves like `RESTRICT`), you cannot remove an author who still has books:

```sql run error destructive
DELETE FROM author WHERE author_id = 1;
```

## ON DELETE and ON UPDATE actions

You choose what happens to the children when a parent is deleted or its key is changed:

| Action | Effect on the children |
|---|---|
| `NO ACTION` (default) | Refuse if any child exists (checked at the end of the statement) |
| `RESTRICT` | Refuse immediately |
| `CASCADE` | Delete (or update) the children too |
| `SET NULL` | Set the foreign key column to `NULL` |
| `SET DEFAULT` | Set the column to its default value |

### CASCADE: children go with the parent

```sql run destructive
CREATE TABLE review (
  review_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id integer NOT NULL REFERENCES book (book_id) ON DELETE CASCADE,
  stars integer NOT NULL
);
INSERT INTO review (book_id, stars) VALUES (1, 5), (1, 4), (2, 5);

DELETE FROM book WHERE book_id = 1;

SELECT book_id, stars FROM review ORDER BY review_id;
```

Deleting book 1 removed its two reviews automatically.

### SET NULL: keep the child, forget the link

```sql run destructive
CREATE TABLE loan (
  loan_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id integer REFERENCES book (book_id) ON DELETE SET NULL
);
INSERT INTO loan (book_id) VALUES (2);

DELETE FROM book WHERE book_id = 2;

SELECT loan_id, book_id FROM loan;
```

## Seeing the rules

PostgreSQL keeps every rule in the catalogue:

```sql run
SELECT conname, confdeltype AS on_delete, confupdtype AS on_update
FROM pg_constraint
WHERE contype = 'f' AND conrelid = 'film_category'::regclass
ORDER BY conname;
```

`a` means no action, `r` restrict, `c` cascade, `n` set null, `d` set default.

## Try it yourself

Add a foreign key from a new `publisher_id` column on `book` to a `publisher` table, and test both a good and a bad insert.

## Watch out

### The two columns must have compatible types

The foreign key column and the key it points to must have compatible types (an `integer` cannot point at a `text` key):

```sql run error destructive
CREATE TABLE bad_child (author_ref text REFERENCES author (author_id));
```

### You cannot drop a parent that is still referenced

Drop the child tables first (or drop the foreign key, or use `DROP TABLE ... CASCADE`, which removes the constraint but not the child rows). The order of creation and deletion follows the arrows of the design:

```sql run error destructive
DROP TABLE author;
```

### CASCADE is powerful, and dangerous

One delete can remove thousands of rows in other tables, silently. Use `CASCADE` only where children truly have no meaning without the parent (order lines without an order), and `RESTRICT` where losing them would be a mistake.

### Foreign keys are NOT indexed automatically

PostgreSQL indexes the **parent's** key (it is a primary key) but **not** the child's foreign key column. Deleting a parent, or joining, scans the whole child table unless you add an index on the foreign key column yourself. (MySQL creates it for you.)

```sql run destructive
CREATE INDEX idx_review_book_id ON review (book_id);

SELECT indexname FROM pg_indexes WHERE tablename = 'review' ORDER BY indexname;
```

### Foreign keys cost a little

Every insert into a child checks the parent, so foreign keys have a small cost. The safety is almost always worth it.

## Interview corner

**"What is a foreign key?"**
A column (or columns) whose values must match a primary (or unique) key in another table, enforcing referential integrity.

**"What does `ON DELETE CASCADE` do?"**
When the parent row is deleted, the child rows that reference it are deleted automatically.

**"What is the difference between `CASCADE`, `SET NULL` and `RESTRICT`?"**
Delete the children, set their key to `NULL`, or refuse to delete the parent.

**"Are foreign key columns indexed automatically?"**
Not in PostgreSQL. Add an index on every foreign key column that you join or delete on.

## Practice

### Warm-up: a child table

Create `writer` and `novel` as above (`novel.writer_id` a foreign key to `writer`), insert one writer and one novel, and return the novel's `title` with the writer's `name` as `writer`.

```sql practice destructive
-- hint: `REFERENCES writer (writer_id)`.
CREATE TABLE writer (writer_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL);
CREATE TABLE novel (novel_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text NOT NULL, writer_id integer NOT NULL REFERENCES writer (writer_id));
INSERT INTO writer (name) VALUES ('Iain M. Banks');
INSERT INTO novel (title, writer_id) VALUES ('Consider Phlebas', 1);

SELECT n.title, w.name AS writer FROM novel n JOIN writer w ON w.writer_id = n.writer_id;
```

### Core: cascade

Make a `chapter` table whose foreign key to `novel` is `ON DELETE CASCADE`. Insert 1 novel (with its writer) and 3 chapters, delete the novel, and return the number of chapters left as `chapters_left`.

```sql practice destructive
-- hint: `ON DELETE CASCADE` on the foreign key.
CREATE TABLE writer2 (writer_id integer PRIMARY KEY, name text);
CREATE TABLE novel2 (novel_id integer PRIMARY KEY, title text, writer_id integer REFERENCES writer2);
CREATE TABLE chapter (chapter_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, novel_id integer REFERENCES novel2 (novel_id) ON DELETE CASCADE);
INSERT INTO writer2 VALUES (1, 'X');
INSERT INTO novel2 VALUES (1, 'Y', 1);
INSERT INTO chapter (novel_id) VALUES (1), (1), (1);
DELETE FROM novel2 WHERE novel_id = 1;

SELECT COUNT(*) AS chapters_left FROM chapter;
```

### Stretch: set null

Make the foreign key `ON DELETE SET NULL` (the column must allow `NULL`). Insert 1 parent and 2 children, delete the parent, and return `child_id` and `parent_id` for both children, ordered by `child_id`.

```sql practice destructive
-- hint: `parent_id integer REFERENCES parent (parent_id) ON DELETE SET NULL`.
CREATE TABLE parent (parent_id integer PRIMARY KEY);
CREATE TABLE child (child_id integer PRIMARY KEY, parent_id integer REFERENCES parent (parent_id) ON DELETE SET NULL);
INSERT INTO parent VALUES (1);
INSERT INTO child VALUES (1, 1), (2, 1);
DELETE FROM parent WHERE parent_id = 1;

SELECT child_id, parent_id FROM child ORDER BY child_id;
```
