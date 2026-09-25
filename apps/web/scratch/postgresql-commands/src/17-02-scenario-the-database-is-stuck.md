---
title: "Scenario: The Database Is Stuck"
order: 0
---

> "Everything is hanging. Requests are timing out. Is the database down?"

Very often the database is **not** down. It is healthy, but one transaction is holding a lock and everyone else is queueing behind it. This scenario shows how to prove that, in a live incident, in under a minute.

## What you'll learn

- How to tell "slow" from "blocked"
- The diagnostic queries: `pg_stat_activity`, `pg_locks`, `pg_blocking_pids`
- The options for resolving it, and their risks
- How to stop it recurring

## Step 1: is it blocked, or just slow?

If simple queries on *other* tables are fast but one table's queries hang, or many sessions are stuck in a "waiting" state, suspect locks. If everything is uniformly slow, suspect load or a bad query (the previous scenario).

## Step 2: a real blockage, and the admin's view

Here is a stuck system on a small table. Session **A** started a transaction, changed a row and then went idle (maybe the app crashed, or someone left a terminal open). Session **B** wants to change the same row, so it waits. Session **R** is the administrator investigating from a third connection:

```sql run destructive
CREATE TABLE account (id int PRIMARY KEY, owner text, balance numeric);
INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100);
```

```sql timeline
A> BEGIN
A> UPDATE account SET balance = balance - 10 WHERE id = 1
B> UPDATE account SET balance = balance + 10 WHERE id = 1
R> SELECT COUNT(*) AS waiting_on_a_lock FROM pg_stat_activity WHERE wait_event_type = 'Lock'
R> SELECT COUNT(*) AS idle_in_transaction FROM pg_stat_activity WHERE state = 'idle in transaction'
R> SELECT COUNT(*) AS ungranted_locks FROM pg_locks WHERE NOT granted
R> SELECT COUNT(*) AS blocked_sessions, MAX(cardinality(pg_blocking_pids(pid))) AS blockers_each FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0
R> SELECT COUNT(*) AS terminated FROM (SELECT pg_terminate_backend(b) FROM (SELECT DISTINCT unnest(pg_blocking_pids(pid)) AS b FROM pg_stat_activity) x) y
```

Read the diagnosis:

- **One session waits on a lock**, and one is `idle in transaction`. That is the smoking gun: a transaction that changed a row, then stopped.
- `pg_locks` shows a lock request that was **not granted**.
- `pg_blocking_pids(pid)` answers the key question directly: who is blocking this session? (The ids differ every time, so we count them here.)
- The last step ends the blocker's connection: its transaction is rolled back, and **B's waiting update runs at once** (the step above shows it "waited for a lock, then ran").

## Step 3: find the culprit

In a real incident you also need to know **who** holds the lock. `pg_stat_activity` has the user, application, client address, when the transaction started, and the last query. Ids and times differ every time, so we do not print them here, but these are the columns to look for:

```sql show
SELECT pid, usename, application_name, client_addr, state,
       now() - xact_start AS transaction_age,
       now() - state_change AS idle_for,
       pg_blocking_pids(pid) AS blocked_by,
       left(query, 60) AS last_query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY xact_start;
```

## Step 4: resolve it

Ask the owner to commit or roll back. If they are gone, use `pg_terminate_backend(pid)` on the **blocker** (kill the connection, roll back its transaction). `pg_cancel_backend(pid)` only cancels the current query and is gentler. Killing the *waiter* does not help.

## Step 5: stop it happening again

- **Keep transactions short.** Never wait for a person or a network call while a transaction is open.
- **Commit or roll back in a `finally` block** so an error cannot leave a transaction open.
- **Set sensible timeouts:** `lock_timeout`, `statement_timeout` and `idle_in_transaction_session_timeout`, so a problem becomes an error quickly and not a hang.
- **Update rows in a consistent order** to avoid deadlocks.
- **Monitor** for long-running transactions (`pg_stat_activity` where `xact_start` is old) and alert on them.

## What to say out loud

1. "I would check whether it is really the database: are other tables fast, are queries waiting?"
2. "I would look at `pg_stat_activity` for sessions waiting on locks, and `pg_blocking_pids` to see who blocks whom."
3. "Usually the blocker is an **open transaction that went idle**. I would find its owner, and ask them to finish it, or terminate it if it is abandoned."
4. "Afterwards: short transactions, timeouts, and monitoring."

## Try it yourself

Use two terminals: start a transaction in one, update a row and leave it open, then try to update the same row in the other. From a third terminal, run the diagnostic queries.

## Watch out

### Terminating is not free

It rolls back the blocker's uncommitted work, which may be a large operation that takes time to undo. Check what it was doing first.

### Do not restart PostgreSQL as the first move

A restart clears the symptom and destroys the evidence, and crash recovery can take a while. Diagnose first.

### A deadlock is different

In a deadlock PostgreSQL detects the cycle and cancels one transaction by itself (page 11.4). What you see here is a plain **wait**: nothing is wrong with the design, one session is just holding on.

### DDL can block everything

A long transaction that has *read* a table can block an `ALTER TABLE` on it (it waits for an exclusive lock), and then every new query queues behind the `ALTER`. Set `lock_timeout` in migrations.

## Interview corner

**"The application is timing out. How do you find out whether locking is the cause?"**
Look at `pg_stat_activity` for sessions with `wait_event_type = 'Lock'`, and at `pg_blocking_pids()` and `pg_locks` for who is blocking whom. The log (with `log_lock_waits`) records long waits and deadlocks.

**"You find one session blocking many others. What do you do?"**
Find out what it is and whether it is still needed. Ask the owner to commit or roll back, or `pg_terminate_backend` its connection if it is abandoned, then find the root cause (a leaked transaction, a slow job holding locks).

**"How do you prevent this class of incident?"**
Short transactions, always committing or rolling back, sensible timeouts (including `idle_in_transaction_session_timeout`), consistent lock order, and alerts for long-running transactions.

## Practice

These need two or three terminals. Try them by hand, then open "Check your result".

```sql run destructive
CREATE TABLE wallet (id int PRIMARY KEY, owner text, balance numeric);
INSERT INTO wallet VALUES (1, 'Asha', 100), (2, 'Ben', 100);
```

### Warm-up: who is waiting?

Session A opens a transaction and updates Ben's balance (id 2) but does not commit. Session B tries to update the same row. Session R counts sessions waiting on a lock. What does R see? Then A rolls back.

```sql timeline reveal
A> BEGIN
A> UPDATE wallet SET balance = balance + 1 WHERE id = 2
B> UPDATE wallet SET balance = balance + 1 WHERE id = 2
R> SELECT COUNT(*) AS waiting FROM pg_stat_activity WHERE wait_event_type = 'Lock'
A> ROLLBACK
```

### Core: nothing is blocked

If two sessions update **different** rows, does anything wait? Session R counts sessions waiting on a lock.

```sql timeline reveal
A> BEGIN
B> BEGIN
A> UPDATE wallet SET balance = balance + 1 WHERE id = 1
B> UPDATE wallet SET balance = balance + 1 WHERE id = 2
R> SELECT COUNT(*) AS waiting FROM pg_stat_activity WHERE wait_event_type = 'Lock'
A> COMMIT
B> COMMIT
```
