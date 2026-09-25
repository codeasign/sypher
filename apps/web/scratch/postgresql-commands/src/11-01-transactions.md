---
title: "Transactions: BEGIN, COMMIT and ROLLBACK"
order: 0
---

A **transaction** groups several statements into one all-or-nothing unit. Either every statement takes effect, or none does. It is how a bank moves money without ever losing it halfway. In PostgreSQL even table changes (`CREATE TABLE`, `ALTER TABLE`) can be part of a transaction.

## What you'll learn

- `BEGIN`, `COMMIT` and `ROLLBACK`
- What autocommit is
- Undoing part of a transaction with `SAVEPOINT`
- What happens after an error inside a transaction

## Syntax

```sql show
BEGIN;
  -- statements
COMMIT;      -- make them permanent
-- or
ROLLBACK;    -- undo them all

SAVEPOINT name;
ROLLBACK TO SAVEPOINT name;
```

## Set up a small bank

A tiny `account` table to work with. (It is a scratch table, so the real data is untouched, and the lab is restored at the end of the page.)

```sql run destructive
CREATE TABLE account (
  id int PRIMARY KEY,
  owner text NOT NULL,
  balance numeric NOT NULL CHECK (balance >= 0)
);

INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100);

SELECT * FROM account ORDER BY id;
```

## Examples

### A transfer: both updates or neither

Moving 30 from Asha to Ben is **two** updates. If the server crashed between them, money would vanish. A transaction prevents that:

```sql run destructive
BEGIN;
UPDATE account SET balance = balance - 30 WHERE owner = 'Asha';
UPDATE account SET balance = balance + 30 WHERE owner = 'Ben';
COMMIT;

SELECT * FROM account ORDER BY id;
```

Until `COMMIT`, the changes are visible only inside your own transaction. After `COMMIT`, they are permanent and visible to everyone.

### ROLLBACK: change your mind

```sql run destructive
BEGIN;
DELETE FROM account;
SELECT COUNT(*) AS rows_inside_transaction FROM account;
ROLLBACK;

SELECT COUNT(*) AS rows_after_rollback FROM account;
```

Everything since `BEGIN` was undone. This is what saves you when an `UPDATE` without a `WHERE` was a mistake.

### Autocommit

By default, `psql` (and most drivers) run in **autocommit** mode: every single statement is its own tiny transaction, committed the moment it finishes. That is why an `UPDATE` outside a transaction cannot be undone. `BEGIN` switches to explicit mode until `COMMIT` or `ROLLBACK`.

### SAVEPOINT: undo only part of it

A savepoint is a bookmark inside a transaction. You can roll back to it and keep everything before it:

```sql run destructive
BEGIN;
UPDATE account SET balance = balance + 10 WHERE owner = 'Asha';
SAVEPOINT after_asha;
UPDATE account SET balance = balance - 20 WHERE owner = 'Ben';
ROLLBACK TO SAVEPOINT after_asha;
COMMIT;

SELECT * FROM account ORDER BY id;
```

Only Asha's +10 survived, because Ben's update came after the savepoint.

### Table changes are transactional too

Unlike MySQL, PostgreSQL can roll back `CREATE TABLE`, `ALTER TABLE` and `DROP TABLE`:

```sql run destructive
BEGIN;
CREATE TABLE temp_experiment (x int);
ALTER TABLE account ADD COLUMN nickname text;
ROLLBACK;

SELECT to_regclass('temp_experiment') AS table_after_rollback,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'nickname') AS nickname_column;
```

Both the new table and the new column are gone. This makes schema changes safe to test.

## Try it yourself

Start a transaction, delete a row, look at the table, then roll back. Then repeat with `COMMIT` and compare.

## Watch out

### After an error the whole transaction is poisoned

If one statement fails, PostgreSQL marks the transaction as **aborted**. Every later statement is refused until you `ROLLBACK`:

```sql run error destructive
BEGIN;
INSERT INTO account VALUES (1, 'Duplicate', 5);
SELECT COUNT(*) FROM account;
ROLLBACK;
```

MySQL would let you carry on; PostgreSQL does not. To recover from an error and continue, wrap the risky statement in a savepoint and `ROLLBACK TO` it.

### A savepoint rescues a failed statement

```sql run error destructive
BEGIN;
UPDATE account SET balance = balance + 1 WHERE owner = 'Asha';
SAVEPOINT risky;
INSERT INTO account VALUES (1, 'Duplicate', 5);
ROLLBACK TO SAVEPOINT risky;
UPDATE account SET balance = balance + 1 WHERE owner = 'Ben';
COMMIT;

SELECT * FROM account ORDER BY id;
```

The duplicate insert failed (the error is shown above the table), was rolled back to the savepoint, and the transaction carried on: both balances went up by 1.

### Some things cannot be rolled back

Sequence values (`nextval`), and anything sent outside the database (an email, a file), are not undone by `ROLLBACK`. Numbers taken from a sequence stay used.

### Keep transactions short

An open transaction holds locks and keeps old row versions alive. Do the work, commit, and move on. Never leave one open while waiting for a person.

## Interview corner

**"What is a transaction?"**
A group of statements treated as one unit: they all take effect (`COMMIT`) or none does (`ROLLBACK`).

**"What is autocommit?"**
The default mode where each statement is committed automatically. `BEGIN` switches it off until the transaction ends.

**"Does `ROLLBACK` undo a `CREATE TABLE`?"**
In PostgreSQL, yes: DDL is transactional. (In MySQL it is not.)

**"What is a savepoint?"**
A named point inside a transaction that you can roll back to, undoing only the later statements. It is also how you survive an error without abandoning the whole transaction.

## Practice

### Warm-up: a rolled-back delete

Create an `account` table (`id int PRIMARY KEY, owner text, balance numeric`) with rows `(1, 'Asha', 500)` and `(2, 'Ben', 200)`. In a transaction, delete all rows, then roll back. Return the number of rows as `rows_after`.

```sql practice destructive
-- hint: Create and fill the table first, then BEGIN; DELETE; ROLLBACK; then COUNT.
CREATE TABLE account2 (id int PRIMARY KEY, owner text, balance numeric);
INSERT INTO account2 VALUES (1, 'Asha', 500), (2, 'Ben', 200);

BEGIN;
DELETE FROM account2;
ROLLBACK;

SELECT COUNT(*) AS rows_after FROM account2;
```

### Core: a committed transfer

With the same table, transfer 150 from Ben to Asha in a transaction and commit. Return `owner` and `balance` for both, ordered by `id`.

```sql practice destructive
-- hint: Two UPDATEs between BEGIN and COMMIT.
CREATE TABLE account3 (id int PRIMARY KEY, owner text, balance numeric);
INSERT INTO account3 VALUES (1, 'Asha', 500), (2, 'Ben', 200);

BEGIN;
UPDATE account3 SET balance = balance + 150 WHERE owner = 'Asha';
UPDATE account3 SET balance = balance - 150 WHERE owner = 'Ben';
COMMIT;

SELECT owner, balance FROM account3 ORDER BY id;
```

### Stretch: keep only the first change

In one transaction: add 50 to Asha, set a savepoint, then subtract 500 from Ben (a mistake!), roll back to the savepoint, and commit. Return `owner` and `balance`, ordered by `id`.

```sql practice destructive
-- hint: SAVEPOINT after the first UPDATE; ROLLBACK TO SAVEPOINT before COMMIT.
CREATE TABLE account4 (id int PRIMARY KEY, owner text, balance numeric);
INSERT INTO account4 VALUES (1, 'Asha', 500), (2, 'Ben', 200);

BEGIN;
UPDATE account4 SET balance = balance + 50 WHERE owner = 'Asha';
SAVEPOINT keep_this;
UPDATE account4 SET balance = balance - 500 WHERE owner = 'Ben';
ROLLBACK TO SAVEPOINT keep_this;
COMMIT;

SELECT owner, balance FROM account4 ORDER BY id;
```
