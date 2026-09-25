---
title: "Locks and Deadlocks"
order: 0
---

When two transactions want to change the same row, one has to wait. That waiting is done with **locks**. Locks keep data correct, but they also cause the slow queries, timeouts and **deadlocks** that show up in production. This page shows all three, with two live sessions.

## What you'll learn

- Row locks, and locking reads with `SELECT ... FOR UPDATE`
- `NOWAIT` and `SKIP LOCKED`
- Gap locks
- What a deadlock is, and how to handle one

## Set up

```sql run destructive
CREATE TABLE account (
  id INT PRIMARY KEY,
  owner VARCHAR(20) NOT NULL,
  balance INT NOT NULL
);

INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100);

SELECT @@innodb_lock_wait_timeout AS lock_wait_timeout_seconds;
```

Each example shows two real sessions. A step marked "waited" was blocked by a lock until the other session finished.

## Examples

### A write waits for a write

When one transaction updates a row, it locks it until it commits or rolls back. Anyone else who wants to change that row waits:

```sql timeline
A> START TRANSACTION;
A> UPDATE account SET balance = balance - 10 WHERE id = 1;
B> START TRANSACTION;
B> UPDATE account SET balance = balance + 10 WHERE id = 1;
A> COMMIT;
B> COMMIT;
B> SELECT balance FROM account WHERE id = 1;
```

B's update sat and waited until A committed, and then it ran. Both changes were applied, one after the other: 100 - 10 + 10.

### SELECT ... FOR UPDATE: lock before you change

Reading a row and then updating it is a trap: someone can change it in between. `FOR UPDATE` locks the row at the moment you read it:

```sql run destructive
UPDATE account SET balance = 100 WHERE id = 1;
```

```sql timeline
A> START TRANSACTION;
A> SELECT balance FROM account WHERE id = 1 FOR UPDATE;
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 1 FOR UPDATE;
A> UPDATE account SET balance = balance - 30 WHERE id = 1;
A> COMMIT;
B> COMMIT;
```

B's locking read waited for A, and then saw the balance A left behind. This is the safe way to do "read, decide, write".

### NOWAIT: fail instead of waiting

```sql run destructive
UPDATE account SET balance = 100 WHERE id = 1;
```

```sql timeline error
A> START TRANSACTION;
A> SELECT balance FROM account WHERE id = 1 FOR UPDATE;
B> START TRANSACTION;
B> SELECT balance FROM account WHERE id = 1 FOR UPDATE NOWAIT;
A> ROLLBACK;
B> ROLLBACK;
```

`NOWAIT` returns an error at once when the row is locked, so your application can decide what to do instead of hanging.

### SKIP LOCKED: take the next free row

A job queue is the classic case. Each worker wants a row nobody else is working on:

```sql timeline
A> START TRANSACTION;
A> SELECT id FROM account ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED;
B> START TRANSACTION;
B> SELECT id FROM account ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED;
A> ROLLBACK;
B> ROLLBACK;
```

A got row 1. B skipped the locked row and got row 2 instead, with no waiting.

### Gap locks: locking the space between rows

At `REPEATABLE READ`, a locking read on a range also locks the **gaps** in it, so nobody can insert a row that would appear inside the range. A table with gaps in its ids:

```sql run destructive
CREATE TABLE slot (id INT PRIMARY KEY);
INSERT INTO slot VALUES (10), (20), (30);
```

```sql timeline
A> START TRANSACTION;
A> SELECT id FROM slot WHERE id BETWEEN 15 AND 25 FOR UPDATE;
B> START TRANSACTION;
B> INSERT INTO slot VALUES (12);
A> ROLLBACK;
B> ROLLBACK;
```

A's range read found one existing row in that range (`20`), but it also locked the **gaps** around it. B's insert of `12` (which is not even in 15 to 25) had to wait, because 12 falls inside the locked gap between 10 and 20. That is what stops phantom rows from appearing.

## Deadlocks

A **deadlock** is two transactions each holding a lock the other needs, so neither can ever continue. Session A locks row 1, session B locks row 2, then each asks for the other's row:

```sql run destructive
UPDATE account SET balance = 100;
```

```sql timeline error
A> START TRANSACTION;
B> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 1;
B> UPDATE account SET balance = balance + 1 WHERE id = 2;
A> UPDATE account SET balance = balance + 1 WHERE id = 2;
B> UPDATE account SET balance = balance + 1 WHERE id = 1;
A> ROLLBACK;
B> ROLLBACK;
```

MySQL notices the cycle straight away and **kills one transaction** (the error above). The other one is free to continue. The victim's whole transaction is rolled back.

## How to handle a deadlock

1. **Retry.** The error says "try restarting transaction". Catch it in your application, roll back, and run the whole transaction again.
2. **Lock in a consistent order.** If every transaction always touches rows in the same order (say, lowest id first), a cycle cannot form. In the example, both sessions should update row 1 and then row 2.
3. **Keep transactions short** and touch as few rows as possible.
4. **Use indexes**, so a statement locks only the rows it needs, not a whole range.
5. **See what happened.** `SHOW ENGINE INNODB STATUS` prints the latest deadlock, with both statements.

## Try it yourself

Open two terminals and reproduce the deadlock by hand. Then fix it by making both sessions update row 1 first and row 2 second.

## Watch out

### A lock wait can time out

If a lock is held too long, the waiter gives up after `innodb_lock_wait_timeout` seconds (50 by default, shown above) with an error. This is not a deadlock, just a very slow blocker, often a forgotten open transaction.

### An open transaction holds its locks

The most common cause of "the database is stuck" is a session that started a transaction and never committed. Its locks stay until it ends.

### Without an index, a statement can lock far more rows

An `UPDATE ... WHERE some_unindexed_column = ...` may have to scan (and lock) many rows, which raises the chance of waits and deadlocks.

### Deadlocks are normal at scale

They cannot always be avoided. What matters is that the application expects them and retries.

## Interview corner

**"What is a deadlock, and how do you resolve it?"**
Two transactions each waiting for a lock the other holds. InnoDB detects it and rolls one back. You handle it by retrying, by acquiring locks in the same order everywhere, and by keeping transactions short.

**"What does `SELECT ... FOR UPDATE` do?"**
It reads rows and locks them until the transaction ends, so nobody else can change them in the meantime.

**"What are gap locks?"**
Locks on the space between index records, used at `REPEATABLE READ` to prevent other transactions from inserting rows into a range you have locked (preventing phantoms).

**"Optimistic vs pessimistic locking?"**
Pessimistic locking locks first (`SELECT ... FOR UPDATE`). Optimistic locking does not lock: it adds a version number and updates with `WHERE id = ? AND version = ?`, retrying if no row was changed.

## Practice

These need two terminals. Try them by hand, then open "Check your result".

### Warm-up: who waits?

Session A starts a transaction and updates Asha's balance (id 1). Session B tries to update the **same** row, and then Session A commits. Which session waits, and what is Asha's final balance?

```sql timeline reveal
A> START TRANSACTION;
A> UPDATE account SET balance = 500 WHERE id = 1;
B> UPDATE account SET balance = 700 WHERE id = 1;
A> COMMIT;
B> SELECT balance FROM account WHERE id = 1;
```

### Core: two different rows

Session A updates row 1 and Session B updates row 2, both in open transactions. Does anyone wait? Then both commit.

```sql timeline reveal
A> START TRANSACTION;
B> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 1;
B> UPDATE account SET balance = balance + 1 WHERE id = 2;
A> COMMIT;
B> COMMIT;
```

### Stretch: avoid the deadlock

Both sessions must add 1 to **both** rows. Make both update row 1 first and row 2 second, so no deadlock is possible. What is the order in which the statements finish?

```sql timeline reveal
A> START TRANSACTION;
B> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 1;
B> UPDATE account SET balance = balance + 1 WHERE id = 1;
A> UPDATE account SET balance = balance + 1 WHERE id = 2;
A> COMMIT;
B> UPDATE account SET balance = balance + 1 WHERE id = 2;
B> COMMIT;
```
