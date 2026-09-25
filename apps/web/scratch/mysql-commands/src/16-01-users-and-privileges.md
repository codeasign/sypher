---
title: "Users, GRANT and REVOKE"
order: 0
---

Not everyone who connects to a database should be able to do everything. MySQL lets you create separate **accounts** and give each one exactly the **privileges** it needs, and no more. This is the principle of **least privilege**, and it limits the damage from a mistake, a bug or an attacker.

## What you'll learn

- `CREATE USER`, `GRANT`, `REVOKE` and `DROP USER`
- Privileges at database, table and column level
- Roles
- How to check what an account can do

## Connect as an administrator

Managing accounts needs an administrator. On this page the setup runs as `root`, and then we act as the accounts we create:

```bash
docker compose exec mysql mysql -uroot -ppassword
```

## Syntax

```sql show
CREATE USER 'name'@'host' IDENTIFIED BY 'password';
GRANT privilege_list ON database.table TO 'name'@'host';
REVOKE privilege_list ON database.table FROM 'name'@'host';
SHOW GRANTS FOR 'name'@'host';
DROP USER 'name'@'host';
```

An account is a **name plus a host**: `'ana'@'localhost'` (connecting from the same machine) is a different account from `'ana'@'%'` (connecting from anywhere).

## The common privileges

| Privilege | Allows |
|---|---|
| `SELECT` | reading data |
| `INSERT`, `UPDATE`, `DELETE` | changing data |
| `CREATE`, `ALTER`, `DROP`, `INDEX` | changing structure |
| `EXECUTE` | running stored procedures and functions |
| `ALL PRIVILEGES` | everything on that level |
| `GRANT OPTION` | passing privileges on to others |

## Examples

### A read-only account

```sql run as=root destructive
DROP USER IF EXISTS 'report_reader'@'%';

CREATE USER 'report_reader'@'%' IDENTIFIED BY 'password';
GRANT SELECT ON `sypher-mysql-DvdRental`.* TO 'report_reader'@'%';

SHOW GRANTS FOR 'report_reader'@'%';
```

`SELECT ON database.*` means: reading, on every table in that database, and nothing else.

### What can it do?

We are now connected **as the new account**. Reading works:

```sql run as=report_reader
SELECT CURRENT_USER() AS connected_as, COUNT(*) AS films_it_can_read FROM film;
```

Changing data does not:

```sql run as=report_reader error
INSERT INTO category (name) VALUES ('Sneaky');
```

Nor does peeking at the administrators' account table:

```sql run as=report_reader error
SELECT user FROM mysql.user;
```

### Table-level and column-level grants

You can go finer than a whole database. This account may read **only two columns** of one table:

```sql run as=root destructive
DROP USER IF EXISTS 'limited'@'%';

CREATE USER 'limited'@'%' IDENTIFIED BY 'password';
GRANT SELECT (customer_id, first_name) ON `sypher-mysql-DvdRental`.customer TO 'limited'@'%';

SHOW GRANTS FOR 'limited'@'%';
```

```sql run as=limited
SELECT customer_id, first_name FROM customer WHERE customer_id <= 3 ORDER BY customer_id;
```

```sql run as=limited error
SELECT email FROM customer WHERE customer_id = 1;
```

The `email` column, which was left out of the grant, is off limits.

### Adding and removing privileges

```sql run as=root destructive
GRANT INSERT ON `sypher-mysql-DvdRental`.category TO 'report_reader'@'%';
SHOW GRANTS FOR 'report_reader'@'%';

REVOKE INSERT ON `sypher-mysql-DvdRental`.category FROM 'report_reader'@'%';
SHOW GRANTS FOR 'report_reader'@'%';
```

### Roles: privileges for a group

If ten analysts need the same access, grant it to a **role** once, then give the role to each person:

```sql run as=root destructive
DROP ROLE IF EXISTS 'analyst';
DROP USER IF EXISTS 'ana'@'%';

CREATE ROLE 'analyst';
GRANT SELECT ON `sypher-mysql-DvdRental`.* TO 'analyst';

CREATE USER 'ana'@'%' IDENTIFIED BY 'password';
GRANT 'analyst' TO 'ana'@'%';
SET DEFAULT ROLE 'analyst' TO 'ana'@'%';

SHOW GRANTS FOR 'ana'@'%';
```

```sql run as=ana
SELECT CURRENT_ROLE() AS active_role, COUNT(*) AS actors_visible FROM actor;
```

Change what the role can do, and every member changes with it.

### Removing an account

```sql run as=root destructive
DROP USER IF EXISTS 'report_reader'@'%', 'limited'@'%', 'ana'@'%';
DROP ROLE IF EXISTS 'analyst';

SELECT COUNT(*) AS accounts_left
FROM mysql.user
WHERE user IN ('report_reader', 'limited', 'ana', 'analyst');
```

## Try it yourself

Create an account that may read the `film` table and insert into `rental`, and nothing else. Connect as it and try one thing it should be allowed to do, and one it should not.

## Watch out

### Never give an application `ALL` on `*.*`

An application account with every privilege on every database turns any bug or injection flaw into a total loss. Give it the few tables and actions it needs. Most web apps need only `SELECT`, `INSERT`, `UPDATE` and `DELETE` on their own database.

### The host part matters

`'report_reader'@'localhost'` and `'report_reader'@'%'` are different accounts, with their own password and privileges. `'%'` means "from any host", which is convenient for a lab and risky on a real server.

### Use strong passwords

We use the word `password` here because this is a throw-away lab. A real account needs a long, unique password (or key-based authentication), stored in a secrets manager and not in code.

### No FLUSH PRIVILEGES needed

After `GRANT` and `REVOKE`, MySQL applies changes immediately. `FLUSH PRIVILEGES` is only needed if you edit the `mysql` grant tables by hand, which you should not do.

### Privileges are checked when you connect and when you run a statement

Revoking a privilege usually takes effect for **new** statements at once, but a connection already open may keep its earlier session privileges. Ask users to reconnect after a change.

### A view or procedure can widen access

A view can let a user read part of a table they have no rights on. A procedure with `SQL SECURITY DEFINER` runs with its *creator's* rights. Both are useful, and both mean you should review who can use them.

## Interview corner

**"What is the principle of least privilege?"**
Give each account only the permissions it needs for its job. It limits what a compromised or mistaken account can do.

**"What is the difference between `GRANT` and `REVOKE`?"**
`GRANT` gives privileges to an account, and `REVOKE` takes them away.

**"What is a role?"**
A named set of privileges you can grant to many users, so you manage access in one place.

**"How do you find out what an account can do?"**
`SHOW GRANTS FOR 'user'@'host'` (or `SHOW GRANTS` for yourself).

**"What is the difference between `'app'@'localhost'` and `'app'@'%'`?"**
The host part limits where the account may connect from. They are two separate accounts.

## Practice

### Warm-up: create and grant

As `root`, create `'clerk'@'%'` (password `password`), grant it `SELECT` on the `category` table only, and return its grants.

```sql practice as=root destructive
-- hint: `GRANT SELECT ON `sypher-mysql-DvdRental`.category TO 'clerk'@'%'`, then `SHOW GRANTS FOR ...`.
DROP USER IF EXISTS 'clerk'@'%';
CREATE USER 'clerk'@'%' IDENTIFIED BY 'password';
GRANT SELECT ON `sypher-mysql-DvdRental`.category TO 'clerk'@'%';

SHOW GRANTS FOR 'clerk'@'%';
```

### Core: two privileges, then take one away

Give `'clerk'@'%'` `SELECT` and `UPDATE` on the `category` table, revoke `UPDATE`, and return the account's grants.

```sql practice as=root destructive
-- hint: GRANT SELECT, UPDATE ... then REVOKE UPDATE ... then SHOW GRANTS.
DROP USER IF EXISTS 'clerk'@'%';
CREATE USER 'clerk'@'%' IDENTIFIED BY 'password';
GRANT SELECT, UPDATE ON `sypher-mysql-DvdRental`.category TO 'clerk'@'%';
REVOKE UPDATE ON `sypher-mysql-DvdRental`.category FROM 'clerk'@'%';

SHOW GRANTS FOR 'clerk'@'%';
```

### Stretch: a role

Create the role `viewer`, grant it `SELECT` on `film`, create `'guest'@'%'`, give the role to it, and return `SHOW GRANTS FOR 'guest'@'%'`.

```sql practice as=root destructive
-- hint: `CREATE ROLE`, `GRANT SELECT ... TO 'viewer'`, `GRANT 'viewer' TO 'guest'@'%'`.
DROP USER IF EXISTS 'guest'@'%';
DROP ROLE IF EXISTS 'viewer';
CREATE ROLE 'viewer';
GRANT SELECT ON `sypher-mysql-DvdRental`.film TO 'viewer';
CREATE USER 'guest'@'%' IDENTIFIED BY 'password';
GRANT 'viewer' TO 'guest'@'%';

SHOW GRANTS FOR 'guest'@'%';
```
