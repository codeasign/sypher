---
title: "CHECK"
order: 0
---

A `CHECK` constraint states a rule that every row must satisfy, such as "the price is above zero" or "the end date is not before the start date". MySQL refuses any row that breaks it.

## What you'll learn

- Column and table `CHECK` constraints
- Naming and adding a constraint later
- How `NULL` interacts with `CHECK`

## Syntax

```sql show
CREATE TABLE table_name (
  column1 datatype CHECK (condition),
  column2 datatype,
  CONSTRAINT constraint_name CHECK (condition_using_several_columns)
);

ALTER TABLE table_name ADD CONSTRAINT constraint_name CHECK (condition);
```

## Examples

### A rule on one column

```sql run destructive
CREATE TABLE product (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  price DECIMAL(8, 2) NOT NULL,
  stock INT NOT NULL,
  CONSTRAINT price_positive CHECK (price > 0),
  CONSTRAINT stock_not_negative CHECK (stock >= 0)
);

INSERT INTO product (name, price, stock) VALUES ('Notebook', 4.50, 100);

SELECT name, price, stock FROM product;
```

### A rule across columns

A booking must not end before it starts. The condition looks at two columns, so it goes at the table level:

```sql run destructive
CREATE TABLE booking (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  CONSTRAINT ends_after_start CHECK (ends_on >= starts_on)
);

INSERT INTO booking (starts_on, ends_on) VALUES ('2025-06-01', '2025-06-05');

SELECT starts_on, ends_on FROM booking;
```

### A list of allowed values

```sql run destructive
CREATE TABLE ticket (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  priority VARCHAR(10) NOT NULL,
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

INSERT INTO ticket (priority) VALUES ('high');

SELECT priority FROM ticket;
```

### Adding a rule to an existing table

```sql run destructive
CREATE TABLE staff_pay (
  staff_id INT PRIMARY KEY,
  hourly_rate DECIMAL(6, 2) NOT NULL
);

ALTER TABLE staff_pay ADD CONSTRAINT rate_in_range CHECK (hourly_rate BETWEEN 7 AND 500);

SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = DATABASE() AND constraint_name = 'rate_in_range';
```

The rules are stored in `information_schema.check_constraints`.

## Try it yourself

Add a `CHECK` that a rating is between 1 and 5, and one that a percentage is between 0 and 100. Try to insert values on both sides of the limit.

## Watch out

### A failing row is refused

```sql run error destructive
INSERT INTO product (name, price, stock) VALUES ('Free pen', 0, 10);
```

```sql run error destructive
INSERT INTO booking (starts_on, ends_on) VALUES ('2025-06-10', '2025-06-01');
```

The message names the constraint, which is why a good constraint name (`ends_after_start`, not `chk1`) helps whoever reads the error.

### NULL passes a CHECK

A `CHECK` only rejects rows where the condition is **false**. If it is unknown (because a column is `NULL`), the row is accepted:

```sql run destructive
CREATE TABLE score (
  score_id INT AUTO_INCREMENT PRIMARY KEY,
  points INT NULL,
  CONSTRAINT points_not_negative CHECK (points >= 0)
);

INSERT INTO score (points) VALUES (10), (NULL);

SELECT points FROM score ORDER BY score_id;
```

If a value must be present, add `NOT NULL` as well.

### Adding a check fails if the existing data breaks it

`ALTER TABLE ... ADD CONSTRAINT ... CHECK` validates every existing row first. Clean up bad rows before adding the rule.

### Old versions ignored CHECK

Before MySQL 8.0.16, the syntax was accepted but **not enforced**. If you meet an older server, do not trust it.

### A CHECK cannot use everything

It cannot look at other tables or use subqueries. For rules across tables, use foreign keys, or a trigger (Module 15).

## Interview corner

**"What does a `CHECK` constraint do?"**
It rejects any insert or update that makes the stated condition false for a row.

**"Does a `CHECK` reject `NULL`?"**
No. `NULL` makes the condition unknown, and only a false result is rejected. Combine it with `NOT NULL`.

**"Column constraint versus table constraint?"**
A column constraint sits next to one column; a table constraint is written separately and can refer to several columns.

## Practice

### Warm-up: a positive price

Create `item (item_id INT AUTO_INCREMENT PRIMARY KEY, price DECIMAL(6,2) NOT NULL, CHECK (price > 0))`, insert a price of `3.50`, and return the row count as `items`.

```sql practice destructive
-- hint: A valid row is accepted.
DROP TABLE IF EXISTS item;
CREATE TABLE item (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  price DECIMAL(6, 2) NOT NULL,
  CHECK (price > 0)
);
INSERT INTO item (price) VALUES (3.50);

SELECT COUNT(*) AS items FROM item;
```

### Core: a rating between 1 and 5

Create `review (review_id INT AUTO_INCREMENT PRIMARY KEY, stars TINYINT NOT NULL, CHECK (stars BETWEEN 1 AND 5))`. Insert the ratings 1, 3 and 5 and return `stars`, ordered by `stars`.

```sql practice destructive
-- hint: 1, 3 and 5 are all inside the limits.
DROP TABLE IF EXISTS review;
CREATE TABLE review (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  stars TINYINT NOT NULL,
  CHECK (stars BETWEEN 1 AND 5)
);
INSERT INTO review (stars) VALUES (1), (3), (5);

SELECT stars FROM review ORDER BY stars;
```

### Stretch: a refused row

Create `event (event_id INT AUTO_INCREMENT PRIMARY KEY, seats INT NOT NULL, CHECK (seats > 0))`. Try to insert `seats = 0` (it must fail), then insert `seats = 40`, and return the number of events as `events`.

```sql practice error destructive
-- hint: The first insert fails; the second succeeds; only one row exists.
DROP TABLE IF EXISTS event;
CREATE TABLE event (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  seats INT NOT NULL,
  CHECK (seats > 0)
);
INSERT INTO event (seats) VALUES (0);
INSERT INTO event (seats) VALUES (40);

SELECT COUNT(*) AS events FROM event;
```
