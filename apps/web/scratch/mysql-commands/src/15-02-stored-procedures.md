---
title: "Stored Procedures"
order: 0
---

A **stored procedure** is a named block of SQL saved in the database. You run it with `CALL`, pass it values, and it can run several statements, use variables, make decisions and repeat steps. It puts logic next to the data, and lets many programs share one tested routine.

## What you'll learn

- Creating and calling a procedure
- Parameters: `IN`, `OUT` and `INOUT`
- Variables and control flow (`IF`, `WHILE`)
- Handling errors inside a procedure

## Syntax

```sql show
DELIMITER $$
CREATE PROCEDURE procedure_name (IN param1 datatype, OUT param2 datatype)
BEGIN
  -- statements ending with semicolons
END$$
DELIMITER ;

CALL procedure_name(value, @result);
```

`DELIMITER` is an instruction to the MySQL command-line client, not SQL. Inside `BEGIN ... END` the statements end with `;`, so we temporarily tell the client to treat `$$` as the end of the whole procedure.

## Procedures that already exist

The DVD Rental database comes with some:

```sql run
SELECT routine_type, routine_name
FROM information_schema.routines
WHERE routine_schema = DATABASE()
ORDER BY routine_type, routine_name;
```

`film_in_stock` lists the copies of a film that are available in a store, and returns their count in an `OUT` parameter:

```sql run
CALL film_in_stock(1, 1, @copies_in_stock);

SELECT @copies_in_stock AS copies_in_stock;
```

## Examples

### A simple procedure

```sql run destructive
DELIMITER $$
CREATE PROCEDURE films_by_rating(IN p_rating VARCHAR(10))
BEGIN
  SELECT title, length
  FROM film
  WHERE rating = p_rating
  ORDER BY title;
END$$
DELIMITER ;

CALL films_by_rating('G');
```

### An OUT parameter, a variable and an IF

The procedure works out a customer's spending tier and hands it back through `OUT`:

```sql run destructive
DELIMITER $$
CREATE PROCEDURE customer_tier(IN p_customer_id INT, OUT p_tier VARCHAR(10))
BEGIN
  DECLARE v_total DECIMAL(10, 2);

  SELECT IFNULL(SUM(amount), 0) INTO v_total
  FROM payment
  WHERE customer_id = p_customer_id;

  IF v_total >= 150 THEN
    SET p_tier = 'gold';
  ELSEIF v_total >= 100 THEN
    SET p_tier = 'silver';
  ELSE
    SET p_tier = 'bronze';
  END IF;
END$$
DELIMITER ;

CALL customer_tier(1, @tier_of_1);
CALL customer_tier(2, @tier_of_2);

SELECT @tier_of_1 AS customer_1, @tier_of_2 AS customer_2;
```

### A loop

```sql run destructive
DELIMITER $$
CREATE PROCEDURE count_to(IN p_limit INT, OUT p_sum INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  SET p_sum = 0;
  WHILE i <= p_limit DO
    SET p_sum = p_sum + i;
    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;

CALL count_to(10, @total);

SELECT @total AS sum_of_1_to_10;
```

### Errors and transactions inside a procedure

A money transfer is the classic use: two updates that must succeed together. An `EXIT HANDLER` catches any error, undoes the work and reports failure:

```sql run destructive
CREATE TABLE account (
  id INT PRIMARY KEY,
  balance DECIMAL(10, 2) NOT NULL,
  CONSTRAINT balance_not_negative CHECK (balance >= 0)
);
INSERT INTO account VALUES (1, 100.00), (2, 100.00);

DELIMITER $$
CREATE PROCEDURE transfer(IN p_from INT, IN p_to INT, IN p_amount DECIMAL(10, 2), OUT p_status VARCHAR(10))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_status = 'failed';
  END;

  START TRANSACTION;
  UPDATE account SET balance = balance - p_amount WHERE id = p_from;
  UPDATE account SET balance = balance + p_amount WHERE id = p_to;
  COMMIT;
  SET p_status = 'ok';
END$$
DELIMITER ;

CALL transfer(1, 2, 30, @first);
CALL transfer(1, 2, 500, @second);

SELECT @first AS first_transfer, @second AS second_transfer;

SELECT id, balance FROM account ORDER BY id;
```

The first transfer worked. The second would have taken Asha's account below zero, broke the `CHECK`, and was rolled back completely: neither balance moved.

### Look at, and remove, a procedure

```sql run destructive raw
DELIMITER $$
CREATE PROCEDURE say_hello()
BEGIN
  SELECT 'hello' AS greeting;
END$$
DELIMITER ;

SHOW CREATE PROCEDURE say_hello;
```

```sql run destructive
DELIMITER $$
CREATE PROCEDURE temporary_one() BEGIN SELECT 1; END$$
DELIMITER ;

DROP PROCEDURE temporary_one;

SELECT COUNT(*) AS still_there FROM information_schema.routines WHERE routine_schema = DATABASE() AND routine_name = 'temporary_one';
```

## Try it yourself

Write a procedure that takes a store id and returns the number of customers of that store in an `OUT` parameter. Then write one that takes a film id and lists its actors.

## Watch out

### Parameter names must not match column names

If a parameter is called `rating` and a column is also `rating`, `WHERE rating = rating` compares the column with itself and is always true. A prefix (`p_rating`) avoids the bug.

### DELIMITER is only for the client

If you send a `CREATE PROCEDURE` from an application, you do **not** send `DELIMITER` lines: they are an instruction to the command-line tool only.

### A procedure is not automatically a transaction

Nothing is rolled back unless you start and end a transaction yourself, as in the transfer example.

### Business logic in the database is a trade-off

It is fast (no round trips), consistent (one copy of the rule), and it is hard to version, test and debug compared with application code. Many teams keep procedures for data-heavy work only.

### Check who may run it

By default a procedure runs with its creator's privileges (`SQL SECURITY DEFINER`). That is powerful: it lets a user do something through the procedure that they could not do directly.

## Interview corner

**"What is a stored procedure, and why use one?"**
Named, stored SQL logic that you `CALL`. It reduces network traffic (one call instead of many statements), centralises rules, and can be granted to users without giving them access to the underlying tables.

**"What is the difference between `IN`, `OUT` and `INOUT` parameters?"**
`IN` passes a value into the procedure, `OUT` passes a value back to the caller, and `INOUT` does both.

**"What is the difference between a stored procedure and a function?"**
A procedure is run with `CALL` and can return result sets and several values; a function returns one value and can be used inside a `SELECT` (next page).

**"What are the drawbacks of stored procedures?"**
Harder to version-control and test, tied to one database product, logic hidden from application developers, and they can become a bottleneck on the database server.

## Practice

### Warm-up: a lookup procedure

Create `customers_of_store(IN p_store INT)` that returns `customer_id`, `first_name` and `last_name` for that store ordered by id, and call it for store 2.

```sql practice destructive
-- hint: `SELECT ... FROM customer WHERE store_id = p_store ORDER BY customer_id;` inside BEGIN...END.
DROP PROCEDURE IF EXISTS customers_of_store;
DELIMITER $$
CREATE PROCEDURE customers_of_store(IN p_store INT)
BEGIN
  SELECT customer_id, first_name, last_name
  FROM customer
  WHERE store_id = p_store
  ORDER BY customer_id;
END$$
DELIMITER ;

CALL customers_of_store(2);
```

### Core: a count through OUT

Create `count_films_longer_than(IN p_minutes INT, OUT p_count INT)` that counts films longer than `p_minutes`. Call it with 170 and return the result as `long_films`.

```sql practice destructive
-- hint: `SELECT COUNT(*) INTO p_count FROM film WHERE length > p_minutes;`
DROP PROCEDURE IF EXISTS count_films_longer_than;
DELIMITER $$
CREATE PROCEDURE count_films_longer_than(IN p_minutes INT, OUT p_count INT)
BEGIN
  SELECT COUNT(*) INTO p_count FROM film WHERE length > p_minutes;
END$$
DELIMITER ;

CALL count_films_longer_than(170, @n);

SELECT @n AS long_films;
```

### Stretch: a length label

Create `length_label(IN p_film_id INT, OUT p_label VARCHAR(10))` that sets the label to `short` (under 60 minutes), `medium` (60 to 120) or `long`. Call it for film 1 (86 minutes) and film 2, and return both labels as `film_1` and `film_2`.

```sql practice destructive
-- hint: SELECT the length INTO a variable, then IF / ELSEIF / ELSE.
DROP PROCEDURE IF EXISTS length_label;
DELIMITER $$
CREATE PROCEDURE length_label(IN p_film_id INT, OUT p_label VARCHAR(10))
BEGIN
  DECLARE v_length INT;
  SELECT length INTO v_length FROM film WHERE film_id = p_film_id;
  IF v_length < 60 THEN
    SET p_label = 'short';
  ELSEIF v_length <= 120 THEN
    SET p_label = 'medium';
  ELSE
    SET p_label = 'long';
  END IF;
END$$
DELIMITER ;

CALL length_label(1, @l1);
CALL length_label(2, @l2);

SELECT @l1 AS film_1, @l2 AS film_2;
```
