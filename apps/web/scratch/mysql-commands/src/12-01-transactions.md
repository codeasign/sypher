---
title: "Transactions: START TRANSACTION, COMMIT and ROLLBACK"
order: 0
---

A **transaction** groups several statements into one all-or-nothing unit. Either every statement takes effect, or none does. It is how a bank moves money without ever losing it halfway.

## What you'll learn

- `START TRANSACTION`, `COMMIT` and `ROLLBACK`
- What `autocommit` is
- Undoing part of a transaction with `SAVEPOINT`
- What ends a transaction by surprise

## Syntax

```sql show
START TRANSACTION;
-- one or more statements
COMMIT;      -- make them permanent

-- or, instead of COMMIT:
ROLLBACK;    -- undo them all
```

## Set up a small bank

A tiny `account` table to work with. (It is a scratch table, so the real data is untouched, and the lab is restored at the end of the page.)

```sql run destructive
CREATE TABLE account (
  id INT PRIMARY KEY,
  owner VARCHAR(20) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL
);

INSERT INTO account VALUES (1, 'Asha', 500.00), (2, 'Ben', 200.00);

SELECT id, owner, balance FROM account ORDER BY id;
```

## Examples

### A transfer: both updates or neither

Moving 100 from Asha to Ben is **two** updates. If the server crashed between them, money would vanish. A transaction prevents that:

```sql run destructive
START TRANSACTION;

UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;

SELECT id, owner, balance FROM account ORDER BY id;

COMMIT;

SELECT id, owner, balance FROM account ORDER BY id;
```

Until `COMMIT`, the changes are visible only inside your own transaction. After `COMMIT`, they are permanent and visible to everyone.

### ROLLBACK: change your mind

```sql run destructive
START TRANSACTION;

UPDATE account SET balance = 0;

SELECT id, balance FROM account ORDER BY id;

ROLLBACK;

SELECT id, balance FROM account ORDER BY id;
```

Everything since `START TRANSACTION` was undone. This is what saves you when an `UPDATE` without a `WHERE` was a mistake.

### Autocommit

By default, MySQL runs in **autocommit** mode: every single statement is its own tiny transaction, committed the moment it finishes. That is why an `UPDATE` outside a transaction cannot be undone.

```sql run
SELECT @@autocommit AS autocommit_is_on;
```

`START TRANSACTION` switches autocommit off until you `COMMIT` or `ROLLBACK`.

### SAVEPOINT: undo only part of it

A savepoint is a bookmark inside a transaction. You can roll back to it and keep everything before it:

```sql run destructive
START TRANSACTION;

UPDATE account SET balance = balance + 10 WHERE id = 1;
SAVEPOINT after_asha;

UPDATE account SET balance = balance + 10 WHERE id = 2;
ROLLBACK TO SAVEPOINT after_asha;

COMMIT;

SELECT id, owner, balance FROM account ORDER BY id;
```

Only Asha's +10 survived, because Ben's update came after the savepoint.

## Try it yourself

Start a transaction, delete a row, look at the table, then roll back. Then repeat with `COMMIT` and compare.

## Watch out

### An error does not undo the whole transaction

If one statement fails, MySQL undoes only **that statement**. The transaction stays open, and the earlier statements are still pending. It is your job to `ROLLBACK`:

```sql run error destructive
START TRANSACTION;

INSERT INTO account VALUES (3, 'Chen', 50.00);
INSERT INTO account VALUES (3, 'Duplicate', 10.00);

COMMIT;

SELECT id, owner FROM account ORDER BY id;
```

The duplicate insert failed, but Chen's row was still committed. Real code checks for errors and rolls back.

### Some statements commit by themselves

Statements that change the structure of the database (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `TRUNCATE`) cause an **implicit commit**. Everything before them in the transaction is committed, and a later `ROLLBACK` cannot undo it:

```sql run destructive
SELECT balance AS asha_before FROM account WHERE id = 1;

START TRANSACTION;
UPDATE account SET balance = balance + 1000 WHERE id = 1;
CREATE TABLE scratch_note (n INT);
ROLLBACK;

SELECT balance AS asha_after_rollback FROM account WHERE id = 1;
```

The +1000 stayed, even though we called `ROLLBACK`, because the `CREATE TABLE` committed it.

### Only some storage engines have transactions

`InnoDB`, MySQL's default, supports them. The old `MyISAM` engine does not: there `ROLLBACK` silently does nothing.

### Keep transactions short

An open transaction holds locks and keeps old row versions alive. Do the work, commit, and move on. Never leave one open while waiting for a person.

## Interview corner

**"What is a transaction?"**
A group of statements treated as one unit: they all take effect (`COMMIT`) or none does (`ROLLBACK`).

**"What is autocommit?"**
The default mode where each statement is committed automatically. `START TRANSACTION` temporarily turns it off.

**"Does `ROLLBACK` undo a `CREATE TABLE`?"**
No. DDL statements cause an implicit commit.

**"What is a savepoint?"**
A named point inside a transaction that you can roll back to, undoing only the later statements.

## Practice

### Warm-up: a rolled-back delete

Create an `account` table with rows `(1, 'Asha', 500)` and `(2, 'Ben', 200)`. In a transaction, delete all rows, then roll back. Return the number of rows as `rows_after`.

```sql practice destructive
-- hint: `START TRANSACTION; DELETE FROM account; ROLLBACK;` then `SELECT COUNT(*)`.
DROP TABLE IF EXISTS account;
CREATE TABLE account (id INT PRIMARY KEY, owner VARCHAR(20) NOT NULL, balance DECIMAL(10, 2) NOT NULL);
INSERT INTO account VALUES (1, 'Asha', 500.00), (2, 'Ben', 200.00);

START TRANSACTION;
DELETE FROM account;
ROLLBACK;

SELECT COUNT(*) AS rows_after FROM account;
```

### Core: a committed transfer

With the same table, transfer 150 from Ben to Asha in a transaction and commit. Return `owner` and `balance` for both, ordered by `id`.

```sql practice destructive
-- hint: Two updates between START TRANSACTION and COMMIT.
DROP TABLE IF EXISTS account;
CREATE TABLE account (id INT PRIMARY KEY, owner VARCHAR(20) NOT NULL, balance DECIMAL(10, 2) NOT NULL);
INSERT INTO account VALUES (1, 'Asha', 500.00), (2, 'Ben', 200.00);

START TRANSACTION;
UPDATE account SET balance = balance - 150 WHERE id = 2;
UPDATE account SET balance = balance + 150 WHERE id = 1;
COMMIT;

SELECT owner, balance FROM account ORDER BY id;
```

### Stretch: keep only the first change

In one transaction: add 50 to Asha, set a savepoint, then subtract 500 from Ben (a mistake!), roll back to the savepoint, and commit. Return `owner` and `balance`, ordered by `id`.

```sql practice destructive
-- hint: SAVEPOINT between the two updates, then `ROLLBACK TO SAVEPOINT name`, then COMMIT.
DROP TABLE IF EXISTS account;
CREATE TABLE account (id INT PRIMARY KEY, owner VARCHAR(20) NOT NULL, balance DECIMAL(10, 2) NOT NULL);
INSERT INTO account VALUES (1, 'Asha', 500.00), (2, 'Ben', 200.00);

START TRANSACTION;
UPDATE account SET balance = balance + 50 WHERE id = 1;
SAVEPOINT good_part;
UPDATE account SET balance = balance - 500 WHERE id = 2;
ROLLBACK TO SAVEPOINT good_part;
COMMIT;

SELECT owner, balance FROM account ORDER BY id;
```
