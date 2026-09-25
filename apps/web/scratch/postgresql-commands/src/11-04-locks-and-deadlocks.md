---
title: "Locks and Deadlocks"
order: 0
---

When two transactions want to change the same row, one has to wait. That waiting is done with **locks**. Locks keep data correct, but they also cause the slow queries, timeouts and **deadlocks** that show up in production. This page shows all three, with two live sessions.

## What you'll learn

- Row locks, and locking reads with `SELECT ... FOR UPDATE`
- `NOWAIT`, `SKIP LOCKED` and `lock_timeout`
- Advisory locks
- What a deadlock is, and how to handle one

## Set up

```sql run destructive
CREATE TABLE account (id int PRIMARY KEY, owner text NOT NULL, balance numeric NOT NULL);
INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100), (3, 'Chen', 100);

SHOW deadlock_timeout;
```

Each example shows two real sessions. A step marked "waited" was blocked by a lock until the other session finished. PostgreSQL never blocks a plain `SELECT` on a row someone is changing: readers do not wait for writers.

## Examples

### A write waits for a write

When one transaction updates a row, it locks it until it commits or rolls back. Anyone else who wants to change that row waits:

```sql timeline
A> BEGIN
A> UPDATE account SET balance = balance - 10 WHERE id = 1
B> UPDATE account SET balance = balance + 10 WHERE id = 1
A> COMMIT
B> SELECT balance FROM account WHERE id = 1
```

B's update sat and waited until A committed, and then it ran. Both changes were applied, one after the other: 100 - 10 + 10.

### A reader does not wait

While A holds the lock, a plain read of the same row still works. B sees the last committed value:

```sql timeline
A> BEGIN
A> UPDATE account SET balance = 0 WHERE id = 2
B> SELECT balance FROM account WHERE id = 2
A> ROLLBACK
```

### SELECT ... FOR UPDATE: lock before you change

Reading a row and then updating it is a trap: someone can change it in between. `FOR UPDATE` locks the row at the moment you read it:

```sql timeline
A> BEGIN
A> SELECT balance FROM account WHERE id = 3 FOR UPDATE
B> SELECT balance FROM account WHERE id = 3 FOR UPDATE
A> UPDATE account SET balance = balance - 25 WHERE id = 3
A> COMMIT
```

B's locking read waited for A, and then saw the balance A left behind. This is the safe way to do "read, decide, write".

### NOWAIT: fail instead of waiting

`NOWAIT` returns an error at once when the row is locked, so your application can decide what to do instead of hanging:

```sql timeline error
A> BEGIN
A> SELECT * FROM account WHERE id = 1 FOR UPDATE
B> SELECT * FROM account WHERE id = 1 FOR UPDATE NOWAIT
A> ROLLBACK
```

### SKIP LOCKED: take the next free row

A job queue is the classic case. Each worker wants a row nobody else is working on:

```sql timeline
A> BEGIN
A> SELECT id FROM account ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
B> SELECT id FROM account ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
A> ROLLBACK
```

A got row 1. B skipped the locked row and got row 2 instead, with no waiting.

### lock_timeout: give up after a while

Instead of waiting for ever, a session can say how long it is willing to wait:

```sql timeline error
A> BEGIN
A> UPDATE account SET balance = balance WHERE id = 1
B> SET lock_timeout = '500ms'
B> UPDATE account SET balance = 1 WHERE id = 1
A> ROLLBACK
```

### Advisory locks: locks you name yourself

An advisory lock is not tied to any row. Your application picks a number, and PostgreSQL makes sure only one session holds it. It is handy for "only one worker may run this job":

```sql timeline
A> SELECT pg_try_advisory_lock(42) AS got_it
B> SELECT pg_try_advisory_lock(42) AS got_it
A> SELECT pg_advisory_unlock(42) AS released
B> SELECT pg_try_advisory_lock(42) AS got_it
```

## Deadlocks

A **deadlock** is two transactions each holding a lock the other needs, so neither can ever continue. Session A locks row 1, session B locks row 2, then each asks for the other's row:

```sql timeline error
A> BEGIN
B> BEGIN
A> UPDATE account SET balance = balance + 1 WHERE id = 1
B> UPDATE account SET balance = balance + 1 WHERE id = 2
A> UPDATE account SET balance = balance + 1 WHERE id = 2
B> UPDATE account SET balance = balance + 1 WHERE id = 1
B> ROLLBACK
A> COMMIT
```

After `deadlock_timeout` (one second) PostgreSQL notices the cycle and **kills one transaction** (the error above). The other one is free to continue: A's waiting update ran as soon as B rolled back. The victim's whole transaction is rolled back.

## How to handle a deadlock

1. **Retry.** The error code is `40P01`. Catch it in your application, roll back, and run the whole transaction again.
2. **Lock in a consistent order.** If every transaction always touches rows in the same order (say, lowest id first), a cycle cannot form. In the example, both sessions should update row 1 and then row 2.
3. **Keep transactions short** and touch as few rows as possible.
4. **Use indexes**, so a statement locks only the rows it needs.
5. **See what happened.** With `log_lock_waits` on, PostgreSQL logs waits and deadlocks with both statements, and `pg_locks` shows who holds what right now.

```sql run
SELECT locktype, mode, granted FROM pg_locks WHERE pid = pg_backend_pid() ORDER BY 1, 2 LIMIT 3;
```

## Try it yourself

Open two terminals and reproduce the deadlock by hand. Then fix it by making both sessions update row 1 first and row 2 second.

## Watch out

### There are no gap locks

Unlike MySQL's InnoDB, PostgreSQL does not lock the space between rows at `REPEATABLE READ`. It prevents phantoms with snapshots instead, so inserting a row "into a locked range" does not wait.

### An open transaction holds its locks

The most common cause of "the database is stuck" is a session that started a transaction and never committed. Its locks stay until it ends. Set `idle_in_transaction_session_timeout` to kill such sessions.

### A lock wait can go on for ever

There is no default timeout on a normal lock wait (`lock_timeout` is off). Set it for anything user-facing.

### Foreign keys take locks too

Inserting a row that references a parent takes a light lock on the parent row, so heavy inserts into child tables can collide with updates of the parent.

### Deadlocks are normal at scale

They cannot always be avoided. What matters is that the application expects them and retries.

## Interview corner

**"What is a deadlock, and how do you resolve it?"**
Two transactions each waiting for a lock the other holds. PostgreSQL detects it after `deadlock_timeout` and cancels one. You handle it by retrying, by acquiring locks in the same order everywhere, and by keeping transactions short.

**"What does `SELECT ... FOR UPDATE` do?"**
It reads rows and locks them until the transaction ends, so nobody else can change them in the meantime. Add `NOWAIT` to fail immediately, or `SKIP LOCKED` to pass over locked rows.

**"How would you build a job queue in PostgreSQL?"**
`SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` inside a transaction, so many workers can each claim a different job without waiting.

**"Optimistic vs pessimistic locking?"**
Pessimistic locking locks first (`SELECT ... FOR UPDATE`). Optimistic locking does not lock: it adds a version number and updates with `WHERE id = ? AND version = ?`, retrying if no row was changed.

## Practice

These need two terminals. Try them by hand, then open "Check your result".

```sql run destructive
CREATE TABLE wallet (id int PRIMARY KEY, owner text NOT NULL, balance numeric NOT NULL);
INSERT INTO wallet VALUES (1, 'Asha', 100), (2, 'Ben', 100);
```

### Warm-up: who waits?

Session A starts a transaction and updates Asha's balance (id 1). Session B tries to update the **same** row, and then Session A commits. Which session waits, and what is Asha's final balance after both add 10?

```sql timeline reveal
A> BEGIN
A> UPDATE wallet SET balance = balance + 10 WHERE id = 1
B> UPDATE wallet SET balance = balance + 10 WHERE id = 1
A> COMMIT
A> SELECT balance FROM wallet WHERE id = 1
```

### Core: two different rows

Session A updates row 1 and Session B updates row 2, both in open transactions. Does anyone wait? Then both commit.

```sql timeline reveal
A> BEGIN
B> BEGIN
A> UPDATE wallet SET balance = balance + 1 WHERE id = 1
B> UPDATE wallet SET balance = balance + 1 WHERE id = 2
A> COMMIT
B> COMMIT
```

### Stretch: avoid the deadlock

Both sessions must add 1 to **both** rows. Make both update row 1 first and row 2 second, so no deadlock is possible. What is the order in which the statements finish?

```sql timeline reveal
A> BEGIN
B> BEGIN
A> UPDATE wallet SET balance = balance + 1 WHERE id = 1
B> UPDATE wallet SET balance = balance + 1 WHERE id = 1
A> UPDATE wallet SET balance = balance + 1 WHERE id = 2
A> COMMIT
B> UPDATE wallet SET balance = balance + 1 WHERE id = 2
B> COMMIT
```
