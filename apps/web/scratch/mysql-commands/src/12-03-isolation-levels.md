---
title: "Isolation Levels"
order: 0
---

Many people use a database at the same moment. **Isolation** decides how much one transaction can see of another's work while both are running. MySQL lets you choose from four **isolation levels**, trading strictness against speed.

## What you'll learn

- The three problems isolation prevents: dirty, non-repeatable and phantom reads
- The four levels, and which problems each allows
- How to see each one happen, with two sessions

## How to read the diagrams

Each example below runs **two real sessions**, A and B, in the order of the numbered steps. Each row of the table is one statement, shown in the column of the session that ran it, with the result it really returned.

## Set up

```sql run destructive
CREATE TABLE account (
  id INT PRIMARY KEY,
  owner VARCHAR(20) NOT NULL,
  balance INT NOT NULL
);

INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100);

SELECT @@transaction_isolation AS default_level;
```

The default level is `REPEATABLE-READ`.

## The problems

| Problem | What happens |
|---|---|
| **Dirty read** | you read a change another transaction has not committed yet (and may roll back) |
| **Non-repeatable read** | you read the same row twice in one transaction and get different values, because someone committed in between |
| **Phantom read** | you run the same query twice and get **new rows** the second time |

## The four levels

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| `READ UNCOMMITTED` | possible | possible | possible |
| `READ COMMITTED` | no | possible | possible |
| `REPEATABLE READ` (MySQL default) | no | no | mostly no (see below) |
| `SERIALIZABLE` | no | no | no |

## Examples

### READ UNCOMMITTED: a dirty read

Session B is allowed to see Session A's uncommitted change, and then A changes its mind:

```sql timeline
A> START TRANSACTION;
A> UPDATE account SET balance = 500 WHERE id = 1;
B> SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 1;
A> ROLLBACK;
B> SELECT balance FROM account WHERE id = 1;
B> COMMIT;
```

B saw `500`, a value that never really existed. This level is almost never a good idea.

### READ COMMITTED: no dirty reads, but rows change under you

B only sees **committed** data, so the dirty read is gone. But if A commits between B's two reads, B gets two different answers inside one transaction:

```sql timeline
B> SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 1;
A> UPDATE account SET balance = 200 WHERE id = 1;
B> SELECT balance FROM account WHERE id = 1;
B> COMMIT;
```

Session A ran outside a transaction, so its `UPDATE` committed at once. B's second read saw the new value. That is a **non-repeatable read**.

### REPEATABLE READ (the default): a stable snapshot

Reset the balance, then repeat the same story under the default level:

```sql run destructive
UPDATE account SET balance = 100 WHERE id = 1;
```

```sql timeline
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 1;
A> UPDATE account SET balance = 200 WHERE id = 1;
B> SELECT balance FROM account WHERE id = 1;
B> COMMIT;
B> SELECT balance FROM account WHERE id = 1;
```

B keeps seeing `100` for as long as its transaction lasts, even though A has committed `200`. InnoDB gives B a **snapshot** taken at its first read. Once B commits and starts fresh, it sees `200`.

### SERIALIZABLE: reads wait for writers

At the strictest level, a plain `SELECT` inside a transaction takes a lock, so it has to wait for any transaction that is changing the row:

```sql run destructive
UPDATE account SET balance = 100 WHERE id = 1;
```

```sql timeline
B> SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
A> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 1;
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 1;
A> COMMIT;
B> COMMIT;
```

B's `SELECT` waited until A committed, and then returned the new value. Correct and safe, but transactions queue up behind each other, so it is the slowest level.

## Setting the level

The first form changes only the **next** transaction, the second every transaction on this connection, and the third every new connection. Use the narrowest one that does the job.

```sql show
-- for the next transaction only
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- for the rest of this connection
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- for every new connection (needs privileges)
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Try it yourself

Open two terminals (see *Set Up Your Lab*) and repeat each example by hand, typing the statements in the order of the steps.

## Watch out

### InnoDB's REPEATABLE READ prevents most phantoms

The SQL standard allows phantom reads at this level, but InnoDB stops them for ordinary reads, because your snapshot never changes. Phantoms can still appear if you mix in locking reads or writes (`SELECT ... FOR UPDATE`, `UPDATE`), which see the **latest** data, not your snapshot.

### A snapshot starts at the first read, not at START TRANSACTION

Under `REPEATABLE READ`, the snapshot is taken when your transaction first reads a row. Until then, nothing is fixed.

### Stricter is not always better

`SERIALIZABLE` makes readers wait and increases lock conflicts. Many high-traffic systems prefer `READ COMMITTED`, accepting non-repeatable reads in exchange for less blocking.

### Long transactions hurt at REPEATABLE READ

A long-running transaction keeps its old snapshot alive, so the database cannot clean up old row versions, and it grows. Keep transactions short.

## Interview corner

**"What are the isolation levels in MySQL, and what is the default?"**
`READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ` (default in InnoDB) and `SERIALIZABLE`.

**"What is a dirty read? A non-repeatable read? A phantom read?"**
Dirty: reading uncommitted data. Non-repeatable: the same row returns different values within a transaction. Phantom: the same query returns different sets of rows.

**"How does InnoDB implement `REPEATABLE READ`?"**
With **MVCC**: each transaction reads from a consistent snapshot built from the undo log, so readers do not block writers. For locking reads and writes, InnoDB uses row locks and **gap locks** to stop phantoms.

**"Which level would you choose for a busy web application?"**
Often `READ COMMITTED` for fewer locks, or the default `REPEATABLE READ` if the code relies on stable snapshots. Explain the trade-off and name the anomalies you are accepting.

## Practice

These need two terminals, so try them by hand, then open "Check your result" to compare with what MySQL really did.

First, put both balances back to 100:

```sql run destructive
UPDATE account SET balance = 100;
```

### Warm-up: no dirty reads at READ COMMITTED

Session A starts a transaction and changes Asha's balance to 500 **without committing**. Session B, at `READ COMMITTED`, reads Asha's balance. What does B see? Then A rolls back.

```sql timeline reveal
A> START TRANSACTION;
A> UPDATE account SET balance = 500 WHERE id = 1;
B> SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 1;
A> ROLLBACK;
B> COMMIT;
```

### Core: the snapshot survives a commit

At the default level, B reads Ben's balance, A changes it and commits, and B reads again. What does B's second read return? And after B commits and reads once more?

```sql timeline reveal
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 2;
A> UPDATE account SET balance = balance + 50 WHERE id = 2;
B> SELECT balance FROM account WHERE id = 2;
B> COMMIT;
B> SELECT balance FROM account WHERE id = 2;
```
