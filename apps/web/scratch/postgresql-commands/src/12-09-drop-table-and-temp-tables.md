---
title: "DROP TABLE and Temporary Tables"
order: 0
---

`DROP TABLE` deletes a table completely: its rows, its structure and its indexes. A **temporary table** is the opposite kind of table, one that lives only for your own session and disappears by itself, which makes it a safe scratchpad.

## What you'll learn

- `DROP TABLE`, `IF EXISTS`, and dropping several tables
- The order in which related tables must be dropped (and `CASCADE`)
- Temporary tables
- `DELETE` vs `TRUNCATE` vs `DROP`

## Syntax

```sql show
DROP TABLE [IF EXISTS] table_name [, ...] [CASCADE | RESTRICT];

CREATE TEMPORARY TABLE table_name (...);
CREATE TEMP TABLE table_name AS SELECT ...;
```

## Examples

### Drop one table

```sql run destructive
CREATE TABLE scratch (x integer);
DROP TABLE scratch;

SELECT to_regclass('scratch') AS still_there;
```

### Drop several at once, safely

`IF EXISTS` turns "no such table" into a harmless notice, so a script can be run again and again:

```sql run notices destructive
CREATE TABLE a (x integer);
CREATE TABLE b (x integer);
DROP TABLE IF EXISTS a, b, does_not_exist;
```

### Related tables: children first

A parent table cannot be dropped while a child table still has a foreign key to it. Drop them in the order **child, then parent**, or drop both in one statement:

```sql run destructive
CREATE TABLE department (department_id integer PRIMARY KEY, name text);
CREATE TABLE employee (employee_id integer PRIMARY KEY, department_id integer REFERENCES department);

DROP TABLE employee, department;

SELECT COUNT(*) AS tables_left FROM information_schema.tables WHERE table_name IN ('department', 'employee');
```

### DROP ... CASCADE

`CASCADE` drops the parent and removes the foreign key constraints that depended on it, but it does **not** delete the child tables or their rows:

```sql run destructive
CREATE TABLE team (team_id integer PRIMARY KEY);
CREATE TABLE player (player_id integer PRIMARY KEY, team_id integer REFERENCES team);
INSERT INTO team VALUES (1);
INSERT INTO player VALUES (1, 1);

DROP TABLE team CASCADE;

SELECT COUNT(*) AS players_left FROM player;
```

### A temporary table

A `TEMPORARY` table is visible only to the session that created it, and is dropped automatically when the session ends. It is perfect for keeping an intermediate result while you work:

```sql run destructive
CREATE TEMP TABLE long_films AS
SELECT film_id, title, length FROM film WHERE length > 180;

SELECT COUNT(*) AS long_films, MAX(length) AS longest FROM long_films;
```

### ON COMMIT

A temp table can also vanish at the end of the transaction, or empty itself:

```sql run destructive
BEGIN;
CREATE TEMP TABLE work (n integer) ON COMMIT DROP;
INSERT INTO work VALUES (1), (2);
SELECT COUNT(*) AS rows_inside FROM work;
COMMIT;

SELECT to_regclass('pg_temp.work') AS after_commit;
```

## Try it yourself

Create a temporary table from a query, use it in a second query, and reconnect to see that it has gone.

## Watch out

### Dropping a missing table is an error

```sql run error destructive
DROP TABLE no_such_table;
```

### Drop the parent first, and it is refused

```sql run error destructive
CREATE TABLE team2 (team_id integer PRIMARY KEY);
CREATE TABLE player2 (player_id integer PRIMARY KEY, team_id integer REFERENCES team2);

DROP TABLE team2;
```

The error tells you which table depends on it. Drop the child first, or use `CASCADE` if you are sure.

### A temporary table vanishes with its session

Another connection cannot see it, and closing your session removes it. That is why a plain `SELECT` from `long_films` in a *new* session fails:

```sql run error
SELECT COUNT(*) FROM long_films;
```

### A temporary table can hide a real one

If a temporary table has the **same name** as a real table, your session sees the temporary one and the real one is hidden until it is dropped. Give temporary tables clearly different names.

### DROP TABLE is transactional

Unlike MySQL, PostgreSQL can roll back a `DROP TABLE` inside a transaction. Outside one, there is no recycle bin. Check the name, and make sure you have a backup of anything you care about.

## Interview corner

**"What is a temporary table, and when would you use one?"**
A table visible only to the current session and dropped when it ends (or at commit). It holds intermediate results in a multi-step calculation, or a working copy you do not want to leave behind.

**"What is the difference between `DROP TABLE` and `TRUNCATE TABLE`?"**
`DROP` removes the table itself. `TRUNCATE` keeps the table and empties it.

**"In what order do you drop tables that reference each other?"**
Children first, then parents, or use `DROP TABLE ... CASCADE`, or drop the foreign keys first.

**"Temporary table, derived table or CTE?"**
A CTE or derived table lives inside one statement. A temporary table lives for the session, can be indexed, and can be reused by many statements.

## Practice

### Warm-up: create and drop

Create a table `trash (id integer)`, drop it, and return the number of tables named `trash` in this database as `remaining`.

```sql practice destructive
-- hint: Query `information_schema.tables`.
CREATE TABLE trash (id integer);
DROP TABLE trash;

SELECT COUNT(*) AS remaining FROM information_schema.tables WHERE table_name = 'trash';
```

### Core: a temporary work table

Create a temporary table `long_films2` with the `film_id`, `title` and `length` of films longer than 180 minutes. Return how many rows it has as `rows_in_temp`.

```sql practice destructive
-- hint: `CREATE TEMP TABLE ... AS SELECT`.
CREATE TEMP TABLE long_films2 AS SELECT film_id, title, length FROM film WHERE length > 180;

SELECT COUNT(*) AS rows_in_temp FROM long_films2;
```

### Stretch: drop the child first

Create `dept` and `emp` (with a foreign key from `emp.dept_id`), then drop both in one statement, and return the number of tables named `dept` or `emp` as `remaining`.

```sql practice destructive
-- hint: `DROP TABLE emp, dept`.
CREATE TABLE dept (dept_id integer PRIMARY KEY);
CREATE TABLE emp (emp_id integer PRIMARY KEY, dept_id integer REFERENCES dept);
DROP TABLE emp, dept;

SELECT COUNT(*) AS remaining FROM information_schema.tables WHERE table_name IN ('dept', 'emp');
```
