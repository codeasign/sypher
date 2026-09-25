---
title: "Triggers"
order: 0
---

A **trigger** is a function that PostgreSQL runs **automatically** when a row is inserted, updated or deleted. You do not call it. It fires by itself, which makes it good for audit trails and last-line-of-defence rules, and dangerous when overused.

## What you'll learn

- `BEFORE` and `AFTER` triggers, for `INSERT`, `UPDATE` and `DELETE`
- The trigger function and the `OLD` and `NEW` rows
- An audit trigger, and a validation trigger with `RAISE EXCEPTION`
- The risks of triggers

## Syntax

```sql show
CREATE FUNCTION trigger_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- use NEW and OLD
  RETURN NEW;
END $$;

CREATE TRIGGER name
BEFORE | AFTER INSERT OR UPDATE OR DELETE ON table_name
FOR EACH ROW EXECUTE FUNCTION trigger_fn();
```

A trigger has two parts: a **trigger function** that returns `trigger`, and the `CREATE TRIGGER` that attaches it to a table.

## Examples

### Triggers that already exist

Almost every table here has a `last_updated` trigger that keeps `last_update` current. See one:

```sql run
SELECT tgname AS trigger, tgrelid::regclass AS on_table, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'category'::regclass AND NOT tgisinternal;
```

Watch it work: the column changes by itself when a row is updated.

```sql run destructive
SELECT last_update AS before_update FROM category WHERE category_id = 1;

UPDATE category SET name = 'Action' WHERE category_id = 1;

SELECT last_update > timestamp '2010-01-01' AS changed_by_trigger FROM category WHERE category_id = 1;
```

### An audit trail: AFTER UPDATE

Record every change to a film's rental rate, with the old and new value. First a table for the log, then the trigger function and the trigger:

```sql run destructive
CREATE TABLE rate_log (film_id int, old_rate numeric, new_rate numeric, changed_at timestamptz DEFAULT now());

CREATE FUNCTION log_rate_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rental_rate IS DISTINCT FROM OLD.rental_rate THEN
    INSERT INTO rate_log (film_id, old_rate, new_rate) VALUES (OLD.film_id, OLD.rental_rate, NEW.rental_rate);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER film_rate_audit AFTER UPDATE ON film FOR EACH ROW EXECUTE FUNCTION log_rate_change();

UPDATE film SET rental_rate = 3.49 WHERE film_id = 1;
UPDATE film SET rental_rate = 3.49 WHERE film_id = 1;

SELECT film_id, old_rate, new_rate FROM rate_log;
```

Nobody wrote code to log those changes. The trigger did it, no matter which program made the update. The second update changed nothing, so the `IF` logged nothing.

### A guard: BEFORE INSERT with an error

A `BEFORE` trigger sees the new row before it is stored, and can change it or refuse it. `RAISE EXCEPTION` cancels the statement with an error of your own:

```sql run error destructive
CREATE TABLE product (product_id int PRIMARY KEY, price numeric);

CREATE FUNCTION check_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price <= 0 THEN
    RAISE EXCEPTION 'price must be positive, got %', NEW.price;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER product_price_check BEFORE INSERT OR UPDATE ON product FOR EACH ROW EXECUTE FUNCTION check_price();

INSERT INTO product VALUES (1, 9.50);
INSERT INTO product VALUES (2, -5);
```

### Tidying values: BEFORE INSERT changes NEW

```sql run destructive
CREATE TABLE note (note_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text);

CREATE FUNCTION upper_body() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.body := upper(NEW.body);
  RETURN NEW;
END $$;

CREATE TRIGGER note_upper BEFORE INSERT ON note FOR EACH ROW EXECUTE FUNCTION upper_body();

INSERT INTO note (body) VALUES ('hello there') RETURNING body;
```

### Removing a trigger

```sql run destructive
CREATE TABLE tmp_t (x int);
CREATE FUNCTION noop() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER tmp_trg BEFORE INSERT ON tmp_t FOR EACH ROW EXECUTE FUNCTION noop();
DROP TRIGGER tmp_trg ON tmp_t;

SELECT COUNT(*) AS triggers_left FROM pg_trigger WHERE tgrelid = 'tmp_t'::regclass AND NOT tgisinternal;
```

## Try it yourself

Write an `AFTER DELETE` trigger that copies each deleted row of a small table into an archive table.

## Watch out

### Triggers are invisible

Someone reading the application code sees an `UPDATE`, and has no idea a trigger also writes to another table. Document triggers, and keep them few and simple.

### Every row pays the cost

A bulk `UPDATE` of a million rows runs a `FOR EACH ROW` trigger a million times. A slow trigger makes every write slow. For bulk work, a statement-level trigger (`FOR EACH STATEMENT`) or no trigger at all may be better.

### A BEFORE trigger must return NEW

If a `BEFORE ... FOR EACH ROW` trigger function returns `NULL`, the row is **silently skipped**. Return `NEW` (or `OLD` for a delete) unless you mean to cancel it.

### Triggers can cascade

A trigger that updates another table can fire that table's triggers. Watch for loops (PostgreSQL will stop a runaway recursion with an error).

### Prefer constraints when they can do the job

A `NOT NULL`, `CHECK` or foreign key is simpler, faster and visible in the table definition. Use a trigger for what constraints cannot express.

### TRUNCATE and COPY

`TRUNCATE` does not fire row triggers (it has its own `BEFORE TRUNCATE` statement trigger), while `COPY FROM` does fire them.

## Interview corner

**"What is a trigger, and what are typical uses?"**
Code that runs automatically before or after an insert, update or delete on a table. Typical uses are audit logs, keeping a summary table in step, setting `updated_at`, and enforcing complex rules.

**"What are `OLD` and `NEW`?"**
`OLD` holds the row's values before the change, and `NEW` the values after. `OLD` exists for update and delete, `NEW` for insert and update.

**"What is the difference between a `BEFORE` and an `AFTER` trigger?"**
A `BEFORE` trigger runs before the row is written, so it can modify `NEW` or reject the change. An `AFTER` trigger runs once the row is stored, and is used for side effects like logging.

**"What are the risks of triggers?"**
Hidden logic, harder debugging, slower writes, and difficulty testing.

## Practice

### Warm-up: a tidy-up trigger

Create `memo (memo_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text)` and a `BEFORE INSERT` trigger that stores `body` in **lower case**. Insert `HELLO` and return the stored `body`.

```sql practice destructive
-- hint: `NEW.body := lower(NEW.body)`.
CREATE TABLE memo (memo_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text);
CREATE FUNCTION lower_body() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.body := lower(NEW.body); RETURN NEW; END $$;
CREATE TRIGGER memo_lower BEFORE INSERT ON memo FOR EACH ROW EXECUTE FUNCTION lower_body();
INSERT INTO memo (body) VALUES ('HELLO');

SELECT body FROM memo;
```

### Core: an archive of deleted rows

Create `item (item_id int PRIMARY KEY, name text)` and `item_archive (item_id int, name text)`. Create an `AFTER DELETE` trigger that copies the deleted row into `item_archive`. Insert items 1 and 2, delete item 1, and return the archive rows (`item_id`, `name`).

```sql practice destructive
-- hint: `INSERT INTO item_archive VALUES (OLD.item_id, OLD.name)`, `RETURN OLD`.
CREATE TABLE item (item_id int PRIMARY KEY, name text);
CREATE TABLE item_archive (item_id int, name text);
CREATE FUNCTION archive_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO item_archive VALUES (OLD.item_id, OLD.name); RETURN OLD; END $$;
CREATE TRIGGER item_archiver AFTER DELETE ON item FOR EACH ROW EXECUTE FUNCTION archive_item();
INSERT INTO item VALUES (1, 'Lamp'), (2, 'Desk');
DELETE FROM item WHERE item_id = 1;

SELECT item_id, name FROM item_archive;
```

### Stretch: refuse a price cut

Create `goods (goods_id int PRIMARY KEY, price numeric)` and a `BEFORE UPDATE` trigger that raises an error if the new price is **lower than half** the old price. Insert goods 1 at `10.00`, then set the price to `6.00` (allowed), and return the price.

```sql practice destructive
-- hint: `IF NEW.price < OLD.price / 2 THEN RAISE EXCEPTION ...`.
CREATE TABLE goods (goods_id int PRIMARY KEY, price numeric);
CREATE FUNCTION guard_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price < OLD.price / 2 THEN RAISE EXCEPTION 'price cut too deep'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goods_guard BEFORE UPDATE ON goods FOR EACH ROW EXECUTE FUNCTION guard_price();
INSERT INTO goods VALUES (1, 10.00);
UPDATE goods SET price = 6.00 WHERE goods_id = 1;

SELECT price FROM goods;
```
