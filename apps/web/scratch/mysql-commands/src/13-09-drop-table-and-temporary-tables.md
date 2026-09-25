---
title: "DROP TABLE and Temporary Tables"
order: 0
---

`DROP TABLE` deletes a table completely: its rows, its structure and its indexes. A **temporary table** is the opposite kind of table, one that lives only for your own connection and disappears by itself, which makes it a safe scratchpad.

## What you'll learn

- `DROP TABLE`, `IF EXISTS`, and dropping several tables
- The order in which related tables must be dropped
- Temporary tables

## Syntax

```sql show
DROP TABLE table_name;
DROP TABLE IF EXISTS table_name1, table_name2;

CREATE TEMPORARY TABLE table_name (column1 datatype);
```

## Examples

### Drop one table

```sql run destructive
CREATE TABLE scratch_a (id INT);
CREATE TABLE scratch_b (id INT);

DROP TABLE scratch_a;

SHOW TABLES LIKE 'scratch%';
```

### Drop several at once, safely

`IF EXISTS` turns "no such table" into a harmless notice, so a script can be run again and again:

```sql run destructive
DROP TABLE IF EXISTS scratch_a, scratch_b;

SHOW TABLES LIKE 'scratch%';
```

### Related tables: children first

A parent table cannot be dropped while a child table still has a foreign key to it. Drop them in the order **child, then parent**:

```sql run destructive
CREATE TABLE team (team_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(30) NOT NULL);
CREATE TABLE player (
  player_id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  name VARCHAR(30) NOT NULL,
  CONSTRAINT fk_player_team FOREIGN KEY (team_id) REFERENCES team (team_id)
);

DROP TABLE player, team;

SHOW TABLES LIKE 'team';
```

### A temporary table

A `TEMPORARY` table is visible only to the connection that created it, and is dropped automatically when the connection ends. It is perfect for keeping an intermediate result while you work:

```sql run destructive
CREATE TEMPORARY TABLE big_payments AS
SELECT payment_id, customer_id, amount
FROM payment
WHERE amount > 10;

SELECT COUNT(*) AS big_payments_found FROM big_payments;

SELECT customer_id, COUNT(*) AS big_payments
FROM big_payments
GROUP BY customer_id
ORDER BY big_payments DESC, customer_id;
```

## DELETE, TRUNCATE and DROP

| Command | Removes | Keeps the table |
|---|---|---|
| `DELETE FROM t` | rows (one by one, can use `WHERE`) | yes |
| `TRUNCATE TABLE t` | every row (fast, resets the counter) | yes |
| `DROP TABLE t` | the table and its data | no |

## Try it yourself

Create a temporary table from a query, use it in a second query, and reconnect to see that it has gone.

## Watch out

### Dropping a missing table is an error

```sql run error destructive
DROP TABLE no_such_table;
```

The table does not exist, so MySQL reports error 1051. Add `IF EXISTS` (above) when a missing table should not stop your script.

### Drop the parent first, and it is refused

```sql run error destructive
CREATE TABLE team (team_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(30) NOT NULL);
CREATE TABLE player (
  player_id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  name VARCHAR(30) NOT NULL,
  CONSTRAINT fk_player_team FOREIGN KEY (team_id) REFERENCES team (team_id)
);

DROP TABLE team;
```

`player` has a foreign key that points at `team`, so MySQL refuses to drop `team` while `player` exists (error 3730). Drop the child table first.

### A temporary table vanishes with its connection

Another connection cannot see it. Here a fresh connection looks for the temporary table we created above, and does not find it:

```sql run error
SELECT COUNT(*) FROM big_payments;
```

### A temporary table can hide a real one

If a temporary table has the **same name** as a real table, your connection sees the temporary one and the real one is hidden until it is dropped. Give temporary tables clearly different names.

### DROP TABLE cannot be undone

Like `DROP DATABASE`, there is no recycle bin, and it does not wait for you to confirm. Check the name, and make sure you have a backup of anything you care about.

## Interview corner

**"What is a temporary table, and when would you use one?"**
A table visible only to the current session and dropped when it ends. It holds intermediate results in a multi-step calculation, or a working copy you do not want to leave behind.

**"What is the difference between `DROP TABLE` and `TRUNCATE TABLE`?"**
`DROP` removes the table itself. `TRUNCATE` keeps the table and empties it.

**"In what order do you drop tables that reference each other?"**
Children first, then parents, or drop the foreign keys first.

**"Temporary table, derived table or CTE?"**
A CTE or derived table lives inside one statement. A temporary table lives for the session, can be indexed, and can be reused by many statements.

## Practice

### Warm-up: create and drop

Create a table `trash (id INT)`, drop it, and return the number of tables named `trash` in this database as `remaining`.

```sql practice destructive
-- hint: Count rows in `information_schema.tables` where `table_name = 'trash'`.
DROP TABLE IF EXISTS trash;
CREATE TABLE trash (id INT);
DROP TABLE trash;

SELECT COUNT(*) AS remaining
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'trash';
```

### Core: a temporary work table

Create a temporary table `long_films` with the `film_id`, `title` and `length` of films longer than 180 minutes. Return how many rows it has as `long_films`.

```sql practice destructive
-- hint: `CREATE TEMPORARY TABLE ... AS SELECT ...`.
DROP TEMPORARY TABLE IF EXISTS long_films;
CREATE TEMPORARY TABLE long_films AS
SELECT film_id, title, length
FROM film
WHERE length > 180;

SELECT COUNT(*) AS long_films FROM long_films;
```

### Stretch: drop the child first

Create `department` and `employee` (with a foreign key from `employee.department_id`), then drop both in a valid order in one statement, and return the number of tables named `department` or `employee` as `remaining`.

```sql practice destructive
-- hint: `DROP TABLE employee, department;` lists the child first.
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS department;
CREATE TABLE department (department_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(30) NOT NULL);
CREATE TABLE employee (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES department (department_id)
);

DROP TABLE employee, department;

SELECT COUNT(*) AS remaining
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name IN ('department', 'employee');
```
