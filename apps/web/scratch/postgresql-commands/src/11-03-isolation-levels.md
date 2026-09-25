---
title: "Isolation Levels"
order: 0
---

Many people use a database at the same moment. **Isolation** decides how much one transaction can see of another's work while both are running. PostgreSQL lets you choose an **isolation level**, trading strictness against speed and retries.

## What you'll learn

- The problems isolation prevents: dirty, non-repeatable and phantom reads, and write skew
- The levels PostgreSQL really has, and which problems each allows
- How to see each one happen, with two sessions
- Why a serializable transaction may need a retry

## How to read the diagrams

Each example below runs **two real sessions**, A and B, in the order of the numbered steps. Each row of the table is one statement, shown in the column of the session that ran it, with the result it really returned.

## Set up

```sql run destructive
CREATE TABLE account (id int PRIMARY KEY, owner text NOT NULL, balance numeric NOT NULL);
INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100), (3, 'Chen', 100);

CREATE TABLE oncall (doctor text PRIMARY KEY, on_duty boolean NOT NULL);
INSERT INTO oncall VALUES ('Ann', true), ('Bob', true);

SHOW transaction_isolation;
```

The default level is `read committed`.

## The problems

| Problem | What happens |
|---|---|
| **Dirty read** | You read a change another transaction has not committed yet (and may roll back) |
| **Non-repeatable read** | You read the same row twice in one transaction and get different values, because someone committed in between |
| **Phantom read** | You run the same query twice and get a different set of rows |
| **Write skew** | Two transactions each read something, then each write based on it, and together break a rule neither broke alone |

## The levels

| Level | Dirty read | Non-repeatable read | Phantom read | Write skew |
|---|---|---|---|---|
| `READ UNCOMMITTED` | Not possible in PostgreSQL (it behaves as `READ COMMITTED`) | Possible | Possible | Possible |
| `READ COMMITTED` (default) | No | Possible | Possible | Possible |
| `REPEATABLE READ` | No | No | No (in PostgreSQL) | Possible |
| `SERIALIZABLE` | No | No | No | No (a transaction may fail and need a retry) |

### READ UNCOMMITTED is not really there

PostgreSQL accepts the name but never shows uncommitted data. Session B asks for the most lenient level, and still does not see A's pending change:

```sql timeline
A> BEGIN
A> UPDATE account SET balance = 500 WHERE id = 3
B> BEGIN ISOLATION LEVEL READ UNCOMMITTED
B> SELECT balance FROM account WHERE id = 3
A> ROLLBACK
B> COMMIT
```

B saw `100`, the committed value, not `500`. There is no dirty read in PostgreSQL at any level.

### READ COMMITTED: rows change under you

Every statement sees the data committed **before that statement began**. If A commits between B's two reads, B gets two different answers inside one transaction:

```sql timeline
B> BEGIN
B> SELECT balance FROM account WHERE id = 1
A> UPDATE account SET balance = 200 WHERE id = 1
B> SELECT balance FROM account WHERE id = 1
B> COMMIT
```

Session A ran outside a transaction, so its `UPDATE` committed at once. B's second read saw the new value. That is a **non-repeatable read**.

### REPEATABLE READ: a stable snapshot

The whole transaction sees the data as it was at its **first statement**. Compare with the same story on another row:

```sql timeline
B> BEGIN ISOLATION LEVEL REPEATABLE READ
B> SELECT balance FROM account WHERE id = 2
A> UPDATE account SET balance = 200 WHERE id = 2
B> SELECT balance FROM account WHERE id = 2
B> COMMIT
B> SELECT balance FROM account WHERE id = 2
```

B keeps seeing `100` for as long as its transaction lasts, even though A has committed `200`. Once B commits and starts fresh, it sees `200`.

### A conflicting write at REPEATABLE READ

If B tries to change a row that A changed after B's snapshot, PostgreSQL will not let B overwrite a value it never saw:

```sql timeline error
B> BEGIN ISOLATION LEVEL REPEATABLE READ
B> SELECT balance FROM account WHERE id = 1
A> UPDATE account SET balance = 300 WHERE id = 1
B> UPDATE account SET balance = balance + 1 WHERE id = 1
B> ROLLBACK
```

B gets `could not serialize access due to concurrent update` and must roll back and try again. That retry is part of using this level.

### SERIALIZABLE: write skew is caught

The hospital rule: at least one doctor must stay on duty. Each of A and B checks that the other is on duty, then goes off duty. Each is fine alone; together they would leave nobody:

```sql timeline error
A> BEGIN ISOLATION LEVEL SERIALIZABLE
B> BEGIN ISOLATION LEVEL SERIALIZABLE
A> SELECT COUNT(*) FROM oncall WHERE on_duty
B> SELECT COUNT(*) FROM oncall WHERE on_duty
A> UPDATE oncall SET on_duty = false WHERE doctor = 'Ann'
B> UPDATE oncall SET on_duty = false WHERE doctor = 'Bob'
A> COMMIT
B> COMMIT
```

PostgreSQL's serializable mode spots the dangerous pattern and cancels one transaction with error `40001`. The application must run the cancelled transaction again, and this time the result is correct.

## Setting the level

The first form changes only the **next** transaction, the second the rest of this session, and the third every new session of a database:

```sql show
BEGIN ISOLATION LEVEL REPEATABLE READ;      -- for this transaction only
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
ALTER DATABASE mydb SET default_transaction_isolation = 'repeatable read';
```

## Try it yourself

Open two `psql` terminals (see *Set Up Your Lab*) and repeat each example by hand, typing the statements in the order of the steps.

## Watch out

### Higher levels need retries

`REPEATABLE READ` and `SERIALIZABLE` can raise serialization failures (`40001`). Correct code catches that error and reruns the whole transaction. If your application cannot retry, stay at `READ COMMITTED` and use explicit locks (next page).

### Long transactions hurt at REPEATABLE READ

A long-running transaction keeps its old snapshot alive, so `VACUUM` cannot clean up old row versions, and tables bloat. Keep transactions short.

### Read only transactions can be cheaper

`BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE` can wait for a safe snapshot and then run with no risk of failure, which suits long reports.

### `READ COMMITTED` looks at each statement

Even inside one transaction, each statement sees a fresh view. A multi-step calculation that needs a stable view must use `REPEATABLE READ`.

## Interview corner

**"What are the isolation levels in PostgreSQL, and what is the default?"**
`READ COMMITTED` (default), `REPEATABLE READ` and `SERIALIZABLE`. `READ UNCOMMITTED` is accepted but behaves as `READ COMMITTED`.

**"What is a dirty read? A non-repeatable read? A phantom read?"**
Dirty: reading uncommitted data. Non-repeatable: the same row returns different values within a transaction. Phantom: the same query returns different sets of rows.

**"How does PostgreSQL implement isolation?"**
With **MVCC**: each row has versions, and each statement (or transaction, at higher levels) reads a snapshot, so readers never block writers. `SERIALIZABLE` adds tracking of read/write dependencies (SSI) and cancels a transaction when it finds a dangerous pattern.

**"Which level would you choose for a busy web application?"**
Often the default `READ COMMITTED`, with explicit row locks where needed, or `SERIALIZABLE` with a retry loop when correctness across several rows matters most.

## Practice

These need two terminals, so try them by hand, then open "Check your result" to compare with what PostgreSQL really did.

First, put the data back:

```sql run destructive
CREATE TABLE wallet (id int PRIMARY KEY, owner text NOT NULL, balance numeric NOT NULL);
INSERT INTO wallet VALUES (1, 'Asha', 100), (2, 'Ben', 100);
```

### Warm-up: no dirty reads

Session A starts a transaction and changes Asha's balance to 500 **without committing**. Session B, at `READ COMMITTED`, reads Asha's balance. What does B see? Then A rolls back.

```sql timeline reveal
A> BEGIN
A> UPDATE wallet SET balance = 500 WHERE id = 1
B> SELECT balance FROM wallet WHERE id = 1
A> ROLLBACK
```

### Core: the snapshot survives a commit

At `REPEATABLE READ`, B reads Ben's balance, A changes it and commits, and B reads again. What does B's second read return? And after B commits and reads once more?

```sql timeline reveal
B> BEGIN ISOLATION LEVEL REPEATABLE READ
B> SELECT balance FROM wallet WHERE id = 2
A> UPDATE wallet SET balance = 250 WHERE id = 2
B> SELECT balance FROM wallet WHERE id = 2
B> COMMIT
B> SELECT balance FROM wallet WHERE id = 2
```
