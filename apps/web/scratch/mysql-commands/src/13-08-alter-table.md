---
title: "ALTER TABLE"
order: 0
---

Requirements change. `ALTER TABLE` modifies a table that already exists and holds data: add a column, change a type, rename something, add or remove a rule. It is one of the most-used (and most risky) commands in real projects.

## What you'll learn

- Adding, changing, renaming and dropping columns
- Adding and dropping constraints and indexes
- Renaming a table
- What can go wrong

## Syntax

```sql show
ALTER TABLE table_name ADD COLUMN column_name datatype;
ALTER TABLE table_name MODIFY COLUMN column_name new_datatype;
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;
ALTER TABLE table_name DROP COLUMN column_name;
ALTER TABLE table_name RENAME TO new_table_name;
```

## Set up a table with data

```sql run destructive
CREATE TABLE member (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  joined DATE NOT NULL
);

INSERT INTO member (name, joined) VALUES ('Asha', '2024-01-15'), ('Ben', '2024-03-02');

DESCRIBE member;
```

## Examples

### ADD COLUMN

New columns are added to every existing row, filled with the default (or `NULL`):

```sql run destructive
ALTER TABLE member ADD COLUMN email VARCHAR(80);

ALTER TABLE member ADD COLUMN level VARCHAR(10) NOT NULL DEFAULT 'bronze' AFTER name;

SELECT member_id, name, level, email FROM member ORDER BY member_id;
```

`AFTER name` puts the column in a chosen position.

### MODIFY COLUMN: change a type or option

```sql run destructive
ALTER TABLE member MODIFY COLUMN name VARCHAR(60) NOT NULL;

DESCRIBE member;
```

`MODIFY` restates the **whole** column definition, so include `NOT NULL` and any default you want to keep.

### RENAME COLUMN

```sql run destructive
ALTER TABLE member RENAME COLUMN joined TO joined_on;

DESCRIBE member;
```

### DROP COLUMN

```sql run destructive
ALTER TABLE member ADD COLUMN nickname VARCHAR(20);
ALTER TABLE member DROP COLUMN nickname;

DESCRIBE member;
```

### Add and drop a constraint or index

```sql run destructive
ALTER TABLE member ADD CONSTRAINT unique_member_name UNIQUE (name);
ALTER TABLE member ADD INDEX idx_joined (joined_on);

SHOW INDEX FROM member;
```

```sql run destructive
ALTER TABLE member DROP INDEX unique_member_name;
ALTER TABLE member DROP INDEX idx_joined;

SELECT COUNT(*) AS extra_indexes
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'member' AND index_name <> 'PRIMARY';
```

### Rename the table

```sql run destructive
ALTER TABLE member RENAME TO club_member;

SELECT COUNT(*) AS members FROM club_member;
```

`RENAME TABLE old TO new` does the same.

## Try it yourself

On a table of your own, add a column with a default, then change its type, then rename it, then drop it. Run `DESCRIBE` after each step.

## Watch out

### Dropping a column deletes its data

`DROP COLUMN` removes the column **and everything stored in it**, immediately. There is no undo apart from a backup.

### Shrinking a type can fail or lose data

MySQL refuses to cut existing data in strict mode:

```sql run error destructive
CREATE TABLE note (body VARCHAR(50));
INSERT INTO note VALUES ('this text is longer than ten characters');
ALTER TABLE note MODIFY COLUMN body VARCHAR(10);
```

### MODIFY overwrites the definition

If you write `MODIFY COLUMN name VARCHAR(60)` and forget `NOT NULL`, the column silently becomes nullable. Always restate everything you want to keep. `SHOW CREATE TABLE` first is a good habit.

### Big tables and live systems

An `ALTER` on a table with millions of rows can take minutes and, depending on the operation, block other work. MySQL can do some changes instantly (adding a column at the end, for example):

```sql run destructive
ALTER TABLE club_member ADD COLUMN newsletter BOOLEAN NOT NULL DEFAULT FALSE, ALGORITHM = INSTANT;

SELECT COUNT(*) AS rows_still_there FROM club_member;
```

Naming `ALGORITHM = INSTANT` makes MySQL **refuse** rather than fall back to a slow method, which is a safe way to find out. For changes that cannot be instant on very large tables, teams use online schema change tools.

### Test on a copy first

Run the `ALTER` on a copy of the table (or a staging server) before you touch production.

## Interview corner

**"How do you add a column to a table?"**
`ALTER TABLE t ADD COLUMN c datatype [DEFAULT ...]`.

**"What is the difference between `MODIFY` and `CHANGE`?"**
`MODIFY` changes a column's definition. `CHANGE old_name new_name definition` renames it and changes the definition together (`RENAME COLUMN` renames only).

**"How do you change the schema of a huge live table without downtime?"**
Use an online method: `ALGORITHM=INPLACE/INSTANT` where MySQL supports it, or a tool such as gh-ost or pt-online-schema-change that copies the table in the background and swaps it in.

**"What happens to existing rows when you add a `NOT NULL` column?"**
They get the column's default. If you give no default, MySQL uses the type's implicit one (`0` for numbers, `''` for text), so adding a `NOT NULL` column to a table that already has rows succeeds. What fails is the opposite change: turning an existing nullable column into `NOT NULL` while some rows still hold `NULL`.

## Practice

### Warm-up: add a column

Create `gadget (gadget_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(30) NOT NULL)`, insert `Lamp`, add a column `color VARCHAR(15) DEFAULT 'white'`, and return `name` and `color`.

```sql practice destructive
-- hint: The existing row gets the default value.
DROP TABLE IF EXISTS gadget;
CREATE TABLE gadget (gadget_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(30) NOT NULL);
INSERT INTO gadget (name) VALUES ('Lamp');

ALTER TABLE gadget ADD COLUMN color VARCHAR(15) DEFAULT 'white';

SELECT name, color FROM gadget;
```

### Core: rename and widen

Create `gadget` again, rename `name` to `title` and widen it to `VARCHAR(100) NOT NULL`, then return the `column_name` and `column_type` of the `title` column from `information_schema.columns`.

```sql practice destructive
-- hint: `RENAME COLUMN` and `MODIFY COLUMN` (two statements), then query information_schema.columns.
DROP TABLE IF EXISTS gadget;
CREATE TABLE gadget (gadget_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(30) NOT NULL);

ALTER TABLE gadget RENAME COLUMN name TO title;
ALTER TABLE gadget MODIFY COLUMN title VARCHAR(100) NOT NULL;

SELECT column_name, column_type
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'gadget' AND column_name = 'title';
```

### Stretch: add a rule afterwards

Create `gadget` with a `weight_kg DECIMAL(5,2)` column, insert weight `2.50`, then add a `CHECK (weight_kg > 0)` afterwards and return the constraint's `check_clause` from `information_schema.check_constraints` where the name is `weight_positive`.

```sql practice destructive
-- hint: `ALTER TABLE ... ADD CONSTRAINT weight_positive CHECK (...)`.
DROP TABLE IF EXISTS gadget;
CREATE TABLE gadget (gadget_id INT AUTO_INCREMENT PRIMARY KEY, weight_kg DECIMAL(5, 2));
INSERT INTO gadget (weight_kg) VALUES (2.50);

ALTER TABLE gadget ADD CONSTRAINT weight_positive CHECK (weight_kg > 0);

SELECT check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = DATABASE() AND constraint_name = 'weight_positive';
```
