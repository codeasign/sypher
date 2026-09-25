---
title: "Stored Functions"
order: 0
---

A **stored function** is a named piece of logic that takes values and **returns one value**. Unlike a procedure, you do not `CALL` it: you use it inside a query, exactly like `UPPER()` or `ROUND()`. It is how you teach MySQL a calculation of your own.

## What you'll learn

- Creating a function with `RETURNS`
- Using it in `SELECT`, `WHERE` and `ORDER BY`
- The characteristics MySQL requires (`DETERMINISTIC`, `READS SQL DATA`)
- Function vs procedure

## Before you start: privileges

Creating a stored function needs more than the everyday practice account has, because MySQL keeps a binary log by default. On this page the blocks that create functions run as the `root` administrator (`docker compose exec mysql mysql -uroot -ppassword`). The reason is shown in the *Watch out* section below.

## Syntax

```sql show
DELIMITER $$
CREATE FUNCTION function_name (param1 datatype, param2 datatype)
RETURNS return_datatype
DETERMINISTIC
BEGIN
  RETURN some_value;
END$$
DELIMITER ;
```

## Functions that already exist

The DVD Rental database has some. `inventory_in_stock` says whether one copy of a film is on the shelf (`1`) or rented out (`0`):

```sql run
SELECT inventory_in_stock(1) AS copy_1_in_stock;
```

## Examples

### A calculation with no table access

A function that turns a rental price into a band. `DETERMINISTIC` promises that the same input always gives the same output:

```sql run as=root destructive
DELIMITER $$
CREATE FUNCTION rate_band(p_rate DECIMAL(4, 2))
RETURNS VARCHAR(10)
DETERMINISTIC
BEGIN
  RETURN CASE
    WHEN p_rate < 1 THEN 'budget'
    WHEN p_rate < 3 THEN 'regular'
    ELSE 'premium'
  END;
END$$
DELIMITER ;

SELECT title, rental_rate, rate_band(rental_rate) AS band
FROM film
ORDER BY film_id;
```

### Using it anywhere a value fits

Once it exists, a function works in `WHERE`, `GROUP BY` and `ORDER BY` too. Anyone with access to the database can use `rate_band` from now on, not just the person who created it:

```sql run
SELECT rate_band(rental_rate) AS band, COUNT(*) AS films
FROM film
GROUP BY rate_band(rental_rate)
ORDER BY band;
```

### A function that reads a table

A function can query tables. It must say so with `READS SQL DATA`:

```sql run as=root destructive
DELIMITER $$
CREATE FUNCTION customer_spend(p_customer_id INT)
RETURNS DECIMAL(10, 2)
READS SQL DATA
BEGIN
  RETURN (SELECT IFNULL(SUM(amount), 0) FROM payment WHERE customer_id = p_customer_id);
END$$
DELIMITER ;

SELECT customer_id, first_name, customer_spend(customer_id) AS total_spent
FROM customer
WHERE customer_id <= 5
ORDER BY customer_id;
```

### Look at and remove one

```sql run as=root destructive
DELIMITER $$
CREATE FUNCTION double_it(n INT) RETURNS INT DETERMINISTIC
BEGIN
  RETURN n * 2;
END$$
DELIMITER ;

SELECT double_it(21) AS result;

DROP FUNCTION double_it;

SELECT COUNT(*) AS still_there FROM information_schema.routines WHERE routine_schema = DATABASE() AND routine_name = 'double_it';
```

## Function or procedure?

| | Function | Procedure |
|---|---|---|
| Called with | inside a query | `CALL` |
| Returns | exactly one value | nothing, `OUT` values, or result sets |
| Can be used in `SELECT` / `WHERE` | yes | no |
| Can change data | restricted | freely |

## Try it yourself

Write a function `full_name(first, last)` that returns the two names joined in proper case, and a function `days_late(rental_date, return_date)` that returns whole days.

## Watch out

### The practice account cannot create functions

With binary logging on, MySQL only lets users with the `SUPER` (or `SET_USER_ID`) privilege create a function, because a function could change data in a way that is not replicated safely. The learner account `sypher` does not have it:

```sql run error destructive
DELIMITER $$
CREATE FUNCTION nothing_special() RETURNS INT DETERMINISTIC
BEGIN
  RETURN 1;
END$$
DELIMITER ;
```

Ways out: create functions as an administrator, grant the user `SET_USER_ID`, or (on a trusted development server only) set `log_bin_trust_function_creators = 1`. Do not switch that setting on for a shared production server without understanding it.

### MySQL insists you declare the function's nature

When binary logging is on (the default in MySQL 8), a function must be declared `DETERMINISTIC`, `NO SQL` or `READS SQL DATA`, or MySQL refuses it:

```sql run as=root error destructive
DELIMITER $$
CREATE FUNCTION film_total() RETURNS INT
BEGIN
  RETURN (SELECT COUNT(*) FROM film);
END$$
DELIMITER ;
```

### Do not say DETERMINISTIC if it is not true

A function that reads a table (or the clock) is not deterministic: the same input can give different results later. Declaring it deterministic when it is not can lead to wrong results being cached or replicated. Use `READS SQL DATA`.

### A function runs once per row

`customer_spend(customer_id)` in a query over 599 customers runs a query 599 times. On a large table this is far slower than a single `JOIN` with `GROUP BY`. Use functions for small, cheap calculations, not for fetching data row by row.

### A function on a column blocks an index

As with `YEAR(col)`, `WHERE my_function(col) = x` cannot use an index on `col`.

### Functions cannot do everything

Inside a function you cannot start transactions, and (by default) you cannot return a result set. Use a procedure for that.

## Interview corner

**"What is the difference between a stored function and a stored procedure?"**
A function returns one value and can be used inside SQL expressions. A procedure is invoked with `CALL`, can return several values or result sets, and can change data and manage transactions freely.

**"What do `DETERMINISTIC` and `READS SQL DATA` mean?"**
`DETERMINISTIC`: the same input always gives the same result. `READS SQL DATA`: the function reads data but does not change it. MySQL uses these declarations for optimising and for safe replication.

**"Why can heavy use of functions in a query hurt performance?"**
They run once per row, and they usually prevent the use of an index on the column they wrap.

## Practice

### Warm-up: a small helper

Create `is_long(p_length INT)` returning `1` if the length is over 150, otherwise `0` (`DETERMINISTIC`), and return `is_long(151)` as `long_one` and `is_long(90)` as `short_one`.

```sql practice as=root destructive
-- hint: `RETURN p_length > 150;` gives 1 or 0.
DROP FUNCTION IF EXISTS is_long;
DELIMITER $$
CREATE FUNCTION is_long(p_length INT)
RETURNS TINYINT
DETERMINISTIC
BEGIN
  RETURN p_length > 150;
END$$
DELIMITER ;

SELECT is_long(151) AS long_one, is_long(90) AS short_one;
```

### Core: use it on a table

Using `is_long`, count how many films are long. Return `long_films`.

```sql practice as=root destructive
-- hint: `SELECT COUNT(*) FROM film WHERE is_long(length) = 1`.
DROP FUNCTION IF EXISTS is_long;
DELIMITER $$
CREATE FUNCTION is_long(p_length INT)
RETURNS TINYINT
DETERMINISTIC
BEGIN
  RETURN p_length > 150;
END$$
DELIMITER ;

SELECT COUNT(*) AS long_films FROM film WHERE is_long(length) = 1;
```

### Stretch: a function that reads a table

Create `films_in_category(p_name VARCHAR(25))` returning the number of films in that category (`READS SQL DATA`). Return `films_in_category('Horror')` as `horror_films`.

```sql practice as=root destructive
-- hint: A subquery joining `film_category` and `category`, as the RETURN value.
DROP FUNCTION IF EXISTS films_in_category;
DELIMITER $$
CREATE FUNCTION films_in_category(p_name VARCHAR(25))
RETURNS INT
READS SQL DATA
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM film_category AS fc
    JOIN category AS c ON c.category_id = fc.category_id
    WHERE c.name = p_name
  );
END$$
DELIMITER ;

SELECT films_in_category('Horror') AS horror_films;
```
