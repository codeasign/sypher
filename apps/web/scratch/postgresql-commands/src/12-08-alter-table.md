---
title: "ALTER TABLE"
order: 0
---

Requirements change. `ALTER TABLE` modifies a table that already exists and holds data: add a column, change a type, rename something, add or remove a rule. It is one of the most-used (and most risky) commands in real projects. In PostgreSQL it can run inside a transaction, so you can try a change and roll it back.

## What you'll learn

- `ADD COLUMN`, `ALTER COLUMN` and `DROP COLUMN`
- Renaming columns and tables
- Adding and dropping constraints
- What can go wrong on big tables

## Syntax

```sql show
ALTER TABLE table_name ADD COLUMN column_name data_type [DEFAULT x];
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type [USING expression];
ALTER TABLE table_name ALTER COLUMN column_name SET NOT NULL;
ALTER TABLE table_name RENAME COLUMN old TO new;
ALTER TABLE table_name DROP COLUMN column_name;
```

## Set up a table with data

```sql run destructive
CREATE TABLE club_member (
  member_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  joined date NOT NULL
);
INSERT INTO club_member (name, joined) VALUES ('Asha', '2024-01-10'), ('Ben', '2024-02-20');
```

## Examples

### ADD COLUMN

New columns are added to every existing row, filled with the default (or `NULL`):

```sql run destructive
ALTER TABLE club_member ADD COLUMN level text NOT NULL DEFAULT 'bronze';

SELECT name, level FROM club_member ORDER BY member_id;
```

Adding a column with a constant default is instant in PostgreSQL 11 and later: it does not rewrite the table.

### ALTER COLUMN ... TYPE

Change a column's type. `USING` says how to convert the old values:

```sql run destructive
ALTER TABLE club_member ALTER COLUMN name TYPE varchar(60);
ALTER TABLE club_member ALTER COLUMN joined TYPE timestamp USING joined::timestamp;

SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'club_member' ORDER BY ordinal_position;
```

### SET / DROP NOT NULL and DEFAULT

```sql run destructive
ALTER TABLE club_member ALTER COLUMN level DROP NOT NULL;
ALTER TABLE club_member ALTER COLUMN level SET DEFAULT 'silver';

SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'club_member' AND column_name = 'level';
```

### RENAME

```sql run destructive
ALTER TABLE club_member RENAME COLUMN joined TO joined_at;
ALTER TABLE club_member RENAME TO member_list;

SELECT column_name FROM information_schema.columns WHERE table_name = 'member_list' ORDER BY ordinal_position;
```

### DROP COLUMN

```sql run destructive
ALTER TABLE member_list DROP COLUMN level;

SELECT column_name FROM information_schema.columns WHERE table_name = 'member_list' ORDER BY ordinal_position;
```

### Add and drop a constraint or index

```sql run destructive
ALTER TABLE member_list ADD CONSTRAINT name_unique UNIQUE (name);
ALTER TABLE member_list ADD CONSTRAINT name_not_blank CHECK (length(name) > 0);
ALTER TABLE member_list DROP CONSTRAINT name_not_blank;

SELECT conname, contype FROM pg_constraint WHERE conrelid = 'member_list'::regclass ORDER BY conname;
```

### Try it, then undo it

Because PostgreSQL can roll back DDL, you can test a risky change safely:

```sql run destructive
BEGIN;
ALTER TABLE member_list DROP COLUMN name;
SELECT COUNT(*) AS columns_inside FROM information_schema.columns WHERE table_name = 'member_list';
ROLLBACK;

SELECT COUNT(*) AS columns_after_rollback FROM information_schema.columns WHERE table_name = 'member_list';
```

## Try it yourself

On a table of your own, add a column with a default, then change its type, then rename it, then drop it. Run `\d` after each step.

## Watch out

### Dropping a column deletes its data

`DROP COLUMN` removes the column **and everything stored in it**. Only a backup, or a rollback of the same transaction, brings it back.

### Changing a type can fail or rewrite the table

If existing data does not fit the new type, the statement fails:

```sql run error destructive
ALTER TABLE member_list ALTER COLUMN name TYPE integer;
```

Even when it succeeds, many type changes rewrite the whole table and hold an exclusive lock while doing it.

### SET NOT NULL scans the table

Adding `NOT NULL` to a column that already has data makes PostgreSQL scan every row. On a huge table, add a `CHECK (col IS NOT NULL) NOT VALID` first, validate it, then set `NOT NULL`: the last step is then instant.

### Big tables and live systems

An `ALTER` can take an exclusive lock and block every other query on the table. Always set a `lock_timeout` in migrations, so a blocked `ALTER` gives up instead of queueing everyone behind it:

```sql show
SET lock_timeout = '2s';
ALTER TABLE big_table ADD COLUMN flag boolean;
```

### Test on a copy first

Run the `ALTER` on a copy of the table (or a staging server) before you touch production.

## Interview corner

**"How do you add a column to a table?"**
`ALTER TABLE t ADD COLUMN c datatype [DEFAULT ...]`.

**"How do you change a column's type?"**
`ALTER TABLE t ALTER COLUMN c TYPE newtype USING c::newtype`. The `USING` clause tells PostgreSQL how to convert existing values.

**"How do you change the schema of a huge live table without downtime?"**
Prefer changes that do not rewrite the table (adding a nullable column or one with a constant default), set `lock_timeout`, add constraints as `NOT VALID` then `VALIDATE`, create indexes `CONCURRENTLY`, and split big changes into small steps.

**"Can you roll back an `ALTER TABLE`?"**
In PostgreSQL, yes, if it ran inside a transaction. That is one of its advantages over MySQL.

## Practice

### Warm-up: add a column

Create `gadget (gadget_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL)`, insert `Lamp`, add a column `colour text DEFAULT 'white'`, and return `name` and `colour`.

```sql practice destructive
-- hint: `ALTER TABLE gadget ADD COLUMN colour text DEFAULT 'white'`.
CREATE TABLE gadget (gadget_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL);
INSERT INTO gadget (name) VALUES ('Lamp');
ALTER TABLE gadget ADD COLUMN colour text DEFAULT 'white';

SELECT name, colour FROM gadget;
```

### Core: rename and widen

Create `gadget2` again, rename `name` to `title` and change its type to `varchar(100)`, then return the `column_name` and `data_type` of the `title` column from `information_schema.columns`.

```sql practice destructive
-- hint: `RENAME COLUMN`, then `ALTER COLUMN ... TYPE varchar(100)`.
CREATE TABLE gadget2 (gadget_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL);
ALTER TABLE gadget2 RENAME COLUMN name TO title;
ALTER TABLE gadget2 ALTER COLUMN title TYPE varchar(100);

SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'gadget2' AND column_name = 'title';
```

### Stretch: add a rule afterwards

Create `gadget3` with a `weight_kg numeric(5,2)` column, insert weight `2.50`, then add a `CHECK (weight_kg > 0)` named `weight_positive` afterwards and return the constraint's definition (`pg_get_constraintdef(oid)`) as `rule`.

```sql practice destructive
-- hint: `ALTER TABLE ... ADD CONSTRAINT weight_positive CHECK (weight_kg > 0)`, then look in `pg_constraint`.
CREATE TABLE gadget3 (gadget_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, weight_kg numeric(5,2));
INSERT INTO gadget3 (weight_kg) VALUES (2.50);
ALTER TABLE gadget3 ADD CONSTRAINT weight_positive CHECK (weight_kg > 0);

SELECT pg_get_constraintdef(oid) AS rule FROM pg_constraint WHERE conname = 'weight_positive';
```
