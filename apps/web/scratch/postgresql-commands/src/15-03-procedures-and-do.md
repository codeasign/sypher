---
title: "Procedures, DO Blocks and Exceptions"
order: 0
---

A **stored procedure** is a named block of code saved in the database. You run it with `CALL`, pass it values, and it can run several statements, use variables, make decisions, repeat steps and even **commit or roll back** on its own. A **`DO` block** is the same code run once, without saving it.

## What you'll learn

- Creating and calling a procedure
- Parameters: `IN`, `OUT` and `INOUT`
- `DO` blocks, loops and `RAISE NOTICE`
- Handling errors with `EXCEPTION`

## Syntax

```sql show
CREATE OR REPLACE PROCEDURE name(IN a int, OUT b int)
LANGUAGE plpgsql
AS $$
BEGIN
  -- statements
END;
$$;

CALL name(1, NULL);

DO $$ BEGIN RAISE NOTICE 'hello'; END $$;
```

## Examples

### A simple procedure

A procedure that moves money between two accounts, all or nothing:

```sql run destructive
CREATE TABLE account (id int PRIMARY KEY, owner text, balance numeric CHECK (balance >= 0));
INSERT INTO account VALUES (1, 'Asha', 100), (2, 'Ben', 100);

CREATE PROCEDURE transfer(p_from int, p_to int, p_amount numeric)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE account SET balance = balance - p_amount WHERE id = p_from;
  UPDATE account SET balance = balance + p_amount WHERE id = p_to;
END;
$$;

CALL transfer(1, 2, 30);

SELECT * FROM account ORDER BY id;
```

The `CHECK` makes the first update fail if the balance would go negative, and then neither update happens: the whole call is one transaction.

### An OUT parameter

An `OUT` parameter hands a value back:

```sql run destructive
CREATE PROCEDURE count_films_longer(IN p_minutes int, OUT p_count int)
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT COUNT(*) INTO p_count FROM film WHERE length > p_minutes;
END;
$$;

CALL count_films_longer(170, NULL);
```

### A DO block: run code once

`DO` runs an anonymous block. `RAISE NOTICE` prints a message, and `FOR ... LOOP` repeats:

```sql run notices destructive
DO $$
DECLARE
  n int;
BEGIN
  FOR n IN 1..3 LOOP
    RAISE NOTICE 'round %', n;
  END LOOP;
END;
$$;
```

### A loop over query rows

```sql run notices destructive
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT name FROM category ORDER BY category_id LIMIT 3 LOOP
    RAISE NOTICE 'category: %', r.name;
  END LOOP;
END;
$$;
```

### Errors: EXCEPTION blocks

Wrap risky code in `BEGIN ... EXCEPTION ... END`. The failed part is rolled back, and the block carries on:

```sql run notices destructive
DO $$
BEGIN
  INSERT INTO account VALUES (1, 'Duplicate', 5);
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'account 1 already exists, skipping';
END;
$$;
```

### Raising your own error

```sql run error destructive
DO $$
BEGIN
  IF (SELECT balance FROM account WHERE id = 1) < 1000 THEN
    RAISE EXCEPTION 'balance too low for a big transfer (%)', (SELECT balance FROM account WHERE id = 1);
  END IF;
END;
$$;
```

### Transaction control inside a procedure

A procedure (unlike a function) may `COMMIT` in the middle, which is how you process a huge table in batches without one giant transaction:

```sql run destructive
CREATE TABLE big_job (id int, done boolean DEFAULT false);
INSERT INTO big_job SELECT g FROM generate_series(1, 1000) g;

CREATE PROCEDURE work_in_batches()
LANGUAGE plpgsql
AS $$
DECLARE
  batch int;
BEGIN
  FOR batch IN 0..4 LOOP
    UPDATE big_job SET done = true WHERE id > batch * 200 AND id <= (batch + 1) * 200;
    COMMIT;
  END LOOP;
END;
$$;

CALL work_in_batches();

SELECT COUNT(*) FILTER (WHERE done) AS done, COUNT(*) AS total FROM big_job;
```

## Try it yourself

Write a procedure that takes a store id and returns the number of customers of that store in an `OUT` parameter. Then write a `DO` block that prints the title of each of the first five films.

## Watch out

### Parameter names must not match column names

If a parameter is called `rating` and a column is also `rating`, `WHERE rating = rating` compares the column with itself. A prefix (`p_rating`) avoids the bug.

### A procedure is one transaction unless you say otherwise

Nothing is committed until the outer transaction commits, and an error rolls back everything the call did. `COMMIT` inside a procedure only works when it was not called from within an explicit transaction block.

### RAISE NOTICE goes to the client, not a table

Notices are for debugging. Use a log table if you need a record.

### Business logic in the database is a trade-off

It is fast (no round trips), consistent (one copy of the rule), and it is hard to version, test and debug compared with application code. Many teams keep procedures for data-heavy work only.

### Do not swallow errors

`EXCEPTION WHEN OTHERS THEN NULL` hides real problems. Catch specific conditions, and re-raise the rest.

## Interview corner

**"What is the difference between a function and a procedure?"**
A function returns a value and is called inside a query. A procedure is invoked with `CALL`, can have `OUT` parameters, and can commit or roll back transactions inside its body (PostgreSQL 11 and later).

**"What is a `DO` block?"**
An anonymous piece of PL/pgSQL executed once. Handy for one-off scripts and migrations.

**"How do you handle errors in PL/pgSQL?"**
An `EXCEPTION` block after the statements, with `WHEN condition_name THEN ...`. The statements in the block are rolled back to a savepoint when an exception is caught.

## Practice

### Warm-up: a count through OUT

Create `count_customers(IN p_store int, OUT p_count int)` that counts the customers of a store. Call it for store 2 and return the count.

```sql practice destructive
-- hint: `SELECT COUNT(*) INTO p_count FROM customer WHERE store_id = p_store`.
CREATE PROCEDURE count_customers(IN p_store int, OUT p_count int)
LANGUAGE plpgsql
AS $$ BEGIN SELECT COUNT(*) INTO p_count FROM customer WHERE store_id = p_store; END; $$;

CALL count_customers(2, NULL);
```

### Core: a transfer that works

Create `acct (id int PRIMARY KEY, balance numeric)` with `(1, 100)` and `(2, 50)`, a procedure `move_money(p_from int, p_to int, p_amount numeric)`, call it to move 40 from 1 to 2, and return the balances ordered by id.

```sql practice destructive
-- hint: Two UPDATEs inside the procedure body.
CREATE TABLE acct (id int PRIMARY KEY, balance numeric);
INSERT INTO acct VALUES (1, 100), (2, 50);
CREATE PROCEDURE move_money(p_from int, p_to int, p_amount numeric)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE acct SET balance = balance - p_amount WHERE id = p_from;
  UPDATE acct SET balance = balance + p_amount WHERE id = p_to;
END;
$$;
CALL move_money(1, 2, 40);

SELECT id, balance FROM acct ORDER BY id;
```

### Stretch: catch the error

In a `DO` block, try to insert a duplicate key into `acct2 (id int PRIMARY KEY)` (which already has id 1), catch `unique_violation`, and instead insert id 2. Then return the ids in the table, ordered.

```sql practice destructive
-- hint: `EXCEPTION WHEN unique_violation THEN INSERT INTO acct2 VALUES (2)`.
CREATE TABLE acct2 (id int PRIMARY KEY);
INSERT INTO acct2 VALUES (1);
DO $$
BEGIN
  INSERT INTO acct2 VALUES (1);
EXCEPTION WHEN unique_violation THEN
  INSERT INTO acct2 VALUES (2);
END;
$$;

SELECT id FROM acct2 ORDER BY id;
```
