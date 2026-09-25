---
title: "Triggers"
order: 0
---

A **trigger** is a piece of SQL that MySQL runs **automatically** when a row is inserted, updated or deleted. You do not call it. It fires by itself, which makes it good for audit trails and last-line-of-defence rules, and dangerous when overused.

## What you'll learn

- `BEFORE` and `AFTER` triggers, for `INSERT`, `UPDATE` and `DELETE`
- The `OLD` and `NEW` row values
- An audit trigger, and a validation trigger with `SIGNAL`
- The risks of triggers

## Before you start: privileges

Like functions, triggers need extra privileges while binary logging is on (the MySQL 8 default). On this page the blocks that create triggers run as `root`. The blocks that only use a trigger (such as inserting a row that the trigger then checks) run as the ordinary practice account, because firing a trigger needs no special right.

## Syntax

```sql show
DELIMITER $$
CREATE TRIGGER trigger_name
{BEFORE | AFTER} {INSERT | UPDATE | DELETE} ON table_name
FOR EACH ROW
BEGIN
  -- use NEW.column and OLD.column
END$$
DELIMITER ;
```

| Value | Available in | Meaning |
|---|---|---|
| `NEW.col` | `INSERT`, `UPDATE` | the value being written |
| `OLD.col` | `UPDATE`, `DELETE` | the value before the change |

`FOR EACH ROW` means the trigger runs once for every affected row.

## Triggers that already exist

The DVD Rental database has some (for example, one keeps `film_text` in step with `film`):

```sql run
SELECT trigger_name, event_object_table AS on_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = DATABASE()
ORDER BY event_object_table, trigger_name;
```

## Examples

### An audit trail: AFTER UPDATE

Record every change to a film's rental rate, with the old and new value. First a table for the log:

```sql run as=root destructive
CREATE TABLE film_rate_audit (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  film_id SMALLINT UNSIGNED NOT NULL,
  old_rate DECIMAL(4, 2) NOT NULL,
  new_rate DECIMAL(4, 2) NOT NULL
);

DELIMITER $$
CREATE TRIGGER film_rate_changed
AFTER UPDATE ON film
FOR EACH ROW
BEGIN
  IF OLD.rental_rate <> NEW.rental_rate THEN
    INSERT INTO film_rate_audit (film_id, old_rate, new_rate)
    VALUES (OLD.film_id, OLD.rental_rate, NEW.rental_rate);
  END IF;
END$$
DELIMITER ;

UPDATE film SET rental_rate = 5.99 WHERE film_id = 1;
UPDATE film SET rental_rate = rental_rate + 1 WHERE film_id IN (3, 4);

SELECT audit_id, film_id, old_rate, new_rate FROM film_rate_audit ORDER BY audit_id;
```

Nobody wrote code to log those changes. The trigger did it, for every row, no matter which program made the update.

### Only when something really changed

An update that leaves the rate the same logs nothing, because of the `IF`:

```sql run destructive
UPDATE film SET rental_rate = rental_rate WHERE film_id = 5;

SELECT COUNT(*) AS audit_rows_for_film_5 FROM film_rate_audit WHERE film_id = 5;
```

### A guard: BEFORE INSERT with SIGNAL

A `BEFORE` trigger sees the new row before it is stored, and can change it or refuse it. `SIGNAL` raises an error of your own:

```sql run as=root destructive
DELIMITER $$
CREATE TRIGGER payment_not_negative
BEFORE INSERT ON payment
FOR EACH ROW
BEGIN
  IF NEW.amount < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A payment cannot be negative';
  END IF;
END$$
DELIMITER ;

SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'payment_not_negative';
```

```sql run error destructive
INSERT INTO payment (customer_id, staff_id, rental_id, amount, payment_date)
VALUES (1, 1, NULL, -5.00, '2005-06-01 10:00:00');
```

### Tidying values: BEFORE INSERT changes NEW

```sql run as=root destructive
CREATE TABLE person (person_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(40) NOT NULL);

DELIMITER $$
CREATE TRIGGER person_name_upper
BEFORE INSERT ON person
FOR EACH ROW
BEGIN
  SET NEW.name = UPPER(TRIM(NEW.name));
END$$
DELIMITER ;

INSERT INTO person (name) VALUES ('  ada lovelace  '), ('grace hopper');

SELECT person_id, CONCAT('[', name, ']') AS stored_name FROM person ORDER BY person_id;
```

### Removing a trigger

```sql run as=root destructive
DELIMITER $$
CREATE TRIGGER temporary_trigger BEFORE INSERT ON category FOR EACH ROW BEGIN SET NEW.name = NEW.name; END$$
DELIMITER ;

DROP TRIGGER temporary_trigger;

SELECT COUNT(*) AS still_there FROM information_schema.triggers WHERE trigger_name = 'temporary_trigger';
```

## Try it yourself

Write an `AFTER DELETE` trigger that copies each deleted row of a small table into an archive table.

## Watch out

### The practice account cannot create triggers

```sql run error destructive
DELIMITER $$
CREATE TRIGGER not_allowed
BEFORE INSERT ON category
FOR EACH ROW
BEGIN
  SET NEW.name = NEW.name;
END$$
DELIMITER ;
```

MySQL refuses because binary logging is on and the account lacks `SUPER` (or `SET_USER_ID`). As with functions, create triggers as an administrator, or grant that privilege.

### Triggers are invisible

Someone reading the application code sees an `UPDATE`, and has no idea a trigger also writes to another table. Document triggers, and keep them few and simple.

### Every row pays the cost

A bulk `UPDATE` of a million rows runs the trigger a million times. A slow trigger makes every write slow.

### A trigger cannot change the table it fires on

An `AFTER UPDATE` trigger on `film` cannot itself `UPDATE film`, because that would recurse forever. MySQL refuses it.

### Triggers do not fire for everything

They do not run for foreign key `CASCADE` actions in InnoDB, or for `TRUNCATE TABLE`. Do not rely on them as your only protection.

### Triggers are not part of a `SELECT`

They only fire on `INSERT`, `UPDATE` and `DELETE`. There is no "on read" trigger.

### Prefer constraints when they can do the job

A `NOT NULL`, `CHECK` or foreign key is simpler, faster and visible in the table definition. Use a trigger for what constraints cannot express.

## Interview corner

**"What is a trigger, and what are typical uses?"**
Code that runs automatically before or after an insert, update or delete on a table. Typical uses are audit logs, keeping a summary table in step, and enforcing complex rules.

**"What are `OLD` and `NEW`?"**
`OLD` holds the row's values before the change, and `NEW` the values after. `OLD` exists for update and delete, `NEW` for insert and update.

**"What is the difference between a `BEFORE` and an `AFTER` trigger?"**
A `BEFORE` trigger runs before the row is written, so it can modify `NEW` or reject the change. An `AFTER` trigger runs once the row is stored, and is used for side effects like logging.

**"What are the risks of triggers?"**
Hidden logic, harder debugging, slower writes, and difficulty testing.

## Practice

### Warm-up: a tidy-up trigger

Create a table `note (note_id INT AUTO_INCREMENT PRIMARY KEY, body VARCHAR(50) NOT NULL)` and a `BEFORE INSERT` trigger that stores `body` in **upper case**. Insert `hello` and return the stored `body`.

```sql practice as=root destructive
-- hint: `SET NEW.body = UPPER(NEW.body);` inside the trigger.
DROP TABLE IF EXISTS note;
CREATE TABLE note (note_id INT AUTO_INCREMENT PRIMARY KEY, body VARCHAR(50) NOT NULL);

DELIMITER $$
CREATE TRIGGER note_upper BEFORE INSERT ON note
FOR EACH ROW
BEGIN
  SET NEW.body = UPPER(NEW.body);
END$$
DELIMITER ;

INSERT INTO note (body) VALUES ('hello');

SELECT body FROM note;
```

### Core: an archive of deleted rows

Create `item (item_id INT PRIMARY KEY, name VARCHAR(20) NOT NULL)` and `item_archive (item_id INT, name VARCHAR(20))`. Create an `AFTER DELETE` trigger that copies the deleted row into `item_archive`. Insert items 1 and 2, delete item 1, and return the archive rows (`item_id`, `name`).

```sql practice as=root destructive
-- hint: `INSERT INTO item_archive VALUES (OLD.item_id, OLD.name);`
DROP TABLE IF EXISTS item_archive;
DROP TABLE IF EXISTS item;
CREATE TABLE item (item_id INT PRIMARY KEY, name VARCHAR(20) NOT NULL);
CREATE TABLE item_archive (item_id INT, name VARCHAR(20));

DELIMITER $$
CREATE TRIGGER item_archived AFTER DELETE ON item
FOR EACH ROW
BEGIN
  INSERT INTO item_archive VALUES (OLD.item_id, OLD.name);
END$$
DELIMITER ;

INSERT INTO item VALUES (1, 'lamp'), (2, 'desk');
DELETE FROM item WHERE item_id = 1;

SELECT item_id, name FROM item_archive;
```

### Stretch: refuse a price cut

Create `product (product_id INT PRIMARY KEY, price DECIMAL(6,2) NOT NULL)` and a `BEFORE UPDATE` trigger that raises an error if the new price is **lower than half** the old price. Insert product 1 at `10.00`, then try to set the price to `4.00` (it must fail), then set it to `6.00`, and return the price.

```sql practice as=root error destructive
-- hint: `IF NEW.price < OLD.price / 2 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '...'; END IF;`
DROP TABLE IF EXISTS product;
CREATE TABLE product (product_id INT PRIMARY KEY, price DECIMAL(6, 2) NOT NULL);

DELIMITER $$
CREATE TRIGGER price_floor BEFORE UPDATE ON product
FOR EACH ROW
BEGIN
  IF NEW.price < OLD.price / 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Price cannot drop by more than half';
  END IF;
END$$
DELIMITER ;

INSERT INTO product VALUES (1, 10.00);
UPDATE product SET price = 4.00 WHERE product_id = 1;
UPDATE product SET price = 6.00 WHERE product_id = 1;

SELECT price FROM product WHERE product_id = 1;
```
