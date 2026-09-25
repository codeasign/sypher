---
title: "Scenario: The Database Is Stuck"
order: 0
---

> "Everything is hanging. Requests are timing out. Is the database down?"

Very often the database is **not** down. It is healthy, but one transaction is holding a lock and everyone else is queueing behind it. This scenario shows how to prove that, in a live incident, in under a minute.

## What you'll learn

- How to tell "slow" from "blocked"
- The diagnostic queries that show who is waiting on whom
- The options for resolving it, and their risks
- How to stop it recurring

## Step 1: is it blocked, or just slow?

If simple queries on *other* tables are fast but one table's queries hang, or many sessions are stuck in a "waiting" state, suspect locks. If everything is uniformly slow, suspect load or a bad query (the previous scenario).

## Step 2: a real blockage, and the admin's view

Here is a stuck system on a small table. Session **A** started a transaction, changed a row and then went idle (maybe the app crashed, or someone left a terminal open). Session **B** wants to change the same row, so it waits. Session **R** is the administrator investigating from a third connection:

```sql run destructive
CREATE TABLE account (
  id INT PRIMARY KEY,
  owner VARCHAR(20) NOT NULL,
  balance INT NOT NULL
);

INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100);
```

```sql timeline
A> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 1;
B> UPDATE account SET balance = balance + 5 WHERE id = 1;
R> SELECT COUNT(*) AS transactions_open FROM information_schema.innodb_trx;
R> SELECT COUNT(*) AS transactions_waiting FROM information_schema.innodb_trx WHERE trx_state = 'LOCK WAIT';
R> SELECT locked_table_name, waiting_query, blocking_query FROM sys.innodb_lock_waits;
A> ROLLBACK;
```

Read the diagnosis:

- **Two open transactions**, one of them in `LOCK WAIT`. That is the smoking gun.
- `sys.innodb_lock_waits` names the **table**, shows the **waiting statement** (B's update), and the **blocking** statement. Here `blocking_query` is empty (`NULL`): the blocker is *idle*, not running anything. It just has not committed. That is the classic case of a forgotten open transaction.
- Session B ran as soon as A rolled back.

## Step 3: find the culprit

In a real incident you also need to know **who** holds the lock. The same view has the connection ids, and `performance_schema` shows what each connection is (user, host, and how long it has been idle). Ids and ages differ every time, so we do not print them here, but the columns to look for are `blocking_pid`, `waiting_pid`, and `wait_age_secs`:

```sql run as=root noout
SELECT waiting_pid, blocking_pid, wait_age_secs, locked_table_name
FROM sys.innodb_lock_waits;
```

(With nothing blocked right now, this returns no rows.) The full picture of everything MySQL is doing is `SHOW FULL PROCESSLIST`, and the last deadlock, with both statements, is inside `SHOW ENGINE INNODB STATUS`.

## Step 4: resolve it

| Option | When | Risk |
|---|---|---|
| **Ask the owner** to `COMMIT` or `ROLLBACK` | a person or app you can reach | none |
| **`KILL <blocking_pid>`** | the blocker is stuck or abandoned | its transaction is rolled back, so its uncommitted work is lost |
| **Wait**: the waiter times out after `innodb_lock_wait_timeout` (50 s by default) | only if the block will end soon | the app sees an error |
| **Restart the application** that holds the connection | app crashed but the connection lingers | brief outage |

Killing the *blocker* frees everyone else. Killing a waiter does not help.

## Step 5: stop it happening again

- **Keep transactions short.** Never wait for a person or a network call while a transaction is open.
- **Commit or roll back in a `finally` block** so an error cannot leave a transaction open.
- **Set sensible timeouts:** a lower `innodb_lock_wait_timeout`, and client-side timeouts, so a problem becomes an error quickly and not a hang.
- **Update rows in a consistent order** to avoid deadlocks.
- **Monitor** for long-running transactions (`information_schema.innodb_trx` where `trx_started` is old) and alert on them.

## What to say out loud

1. "I would check whether it is really the database: are other tables fast, are queries waiting?"
2. "I would look for **lock waits** in `information_schema.innodb_trx` and `sys.innodb_lock_waits`, to see who blocks whom."
3. "Usually the blocker is an **open transaction that went idle**. I would find its owner, and ask them to finish it, or `KILL` it if it is abandoned."
4. "Afterwards: short transactions, timeouts, and monitoring."

## Try it yourself

Use two terminals: start a transaction in one, update a row and leave it open, then try to update the same row in the other. From a third terminal, run the diagnostic queries as `root`.

## Watch out

### KILL is not free

It rolls back the blocker's uncommitted work, which may be a large operation that takes time to undo. Check what it was doing first.

### Do not restart MySQL as the first move

A restart clears the symptom and destroys the evidence, and startup recovery can take a while. Diagnose first.

### A deadlock is different

In a deadlock MySQL detects the cycle and rolls one transaction back by itself (*Locks and Deadlocks*). What you see here is a plain **wait**: nothing is wrong with the design, one session is just holding on.

### Metadata locks can block too

A long transaction that has *read* a table can block an `ALTER TABLE` on it (a metadata lock), and then everything queues behind the `ALTER`. The symptom is "waiting for table metadata lock" in the process list.

## Interview corner

**"The application is timing out. How do you find out whether locking is the cause?"**
Look at `information_schema.innodb_trx` for transactions in `LOCK WAIT` and long-running open transactions, and at `sys.innodb_lock_waits` for who is blocking whom. `SHOW ENGINE INNODB STATUS` shows recent deadlocks.

**"You find one session blocking many others. What do you do?"**
Find out what it is and whether it is still needed. Ask the owner to commit or roll back, or `KILL` its connection if it is abandoned, then find the root cause (a leaked transaction, a slow job holding locks).

**"How do you prevent this class of incident?"**
Short transactions, always committing or rolling back, sensible timeouts, consistent lock order, and alerts for long-running transactions.

## Practice

These need two or three terminals. Try them by hand, then open "Check your result".

### Warm-up: who is waiting?

Session A opens a transaction and updates Ben's balance (id 2) but does not commit. Session B tries to update the same row. Session R counts the transactions in `LOCK WAIT`. What does R see? Then A rolls back.

```sql timeline reveal
A> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 2;
B> UPDATE account SET balance = balance + 1 WHERE id = 2;
R> SELECT COUNT(*) AS transactions_waiting FROM information_schema.innodb_trx WHERE trx_state = 'LOCK WAIT';
A> ROLLBACK;
```

### Core: which table is locked?

With the same set-up, Session R asks `sys.innodb_lock_waits` which table the wait is on.

```sql timeline reveal
A> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 2;
B> UPDATE account SET balance = balance + 1 WHERE id = 2;
R> SELECT locked_table_name, waiting_lock_mode FROM sys.innodb_lock_waits;
A> ROLLBACK;
```

### Stretch: nothing is blocked

If two sessions update **different** rows, does anything wait? Session R counts transactions in `LOCK WAIT`.

```sql timeline reveal
A> START TRANSACTION;
A> UPDATE account SET balance = balance + 1 WHERE id = 1;
B> START TRANSACTION;
B> UPDATE account SET balance = balance + 1 WHERE id = 2;
R> SELECT COUNT(*) AS transactions_waiting FROM information_schema.innodb_trx WHERE trx_state = 'LOCK WAIT';
A> ROLLBACK;
B> ROLLBACK;
```
