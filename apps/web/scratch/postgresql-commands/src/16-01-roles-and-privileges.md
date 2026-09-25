---
title: "Roles, GRANT and REVOKE"
order: 0
---

Not everyone who connects to a database should be able to do everything. PostgreSQL lets you create separate **roles** (users and groups are the same thing) and give each one exactly the **privileges** it needs, and no more. This is the principle of **least privilege**, and it limits the damage from a mistake, a bug or an attacker.

## What you'll learn

- `CREATE ROLE`, `GRANT`, `REVOKE` and `DROP ROLE`
- Privileges on tables and columns
- Group roles, and default privileges
- How to check what a role can do

## Syntax

```sql show
CREATE ROLE name LOGIN PASSWORD 'secret';
GRANT SELECT, INSERT ON table_name TO name;
GRANT SELECT (col1, col2) ON table_name TO name;
REVOKE INSERT ON table_name FROM name;
DROP ROLE name;
```

## Your lab account is a superuser

`sypher` can do anything, which is convenient for learning and dangerous for real work. Check:

```sql run
SELECT rolname, rolsuper, rolcreatedb, rolcanlogin FROM pg_roles WHERE rolname = 'sypher';
```

A real application should never connect as a superuser. On this page we create ordinary roles, and then act **as** them (each example marked "as ana" runs in a separate connection as that role).

## Examples

### A read-only role

```sql run destructive
CREATE ROLE ana LOGIN PASSWORD 'password';
GRANT SELECT ON category TO ana;

SELECT rolname, rolsuper FROM pg_roles WHERE rolname = 'ana';
```

`SELECT ON category` means: reading that one table, and nothing else.

### What can she do?

We are now connected **as ana**. Reading the granted table works:

```sql run as=ana destructive
SELECT current_user AS me, COUNT(*) AS categories FROM category;
```

Changing data does not:

```sql run as=ana error destructive
INSERT INTO category (name) VALUES ('Sneaky');
```

Nor does reading a table she was never given:

```sql run as=ana error destructive
SELECT * FROM customer LIMIT 1;
```

### Column-level grants

You can go finer than a whole table. This role may read **only two columns**:

```sql run destructive
CREATE ROLE ben LOGIN PASSWORD 'password';
GRANT SELECT (customer_id, first_name) ON customer TO ben;
```

```sql run as=ben destructive
SELECT customer_id, first_name FROM customer ORDER BY customer_id LIMIT 2;
```

```sql run as=ben error destructive
SELECT email FROM customer LIMIT 1;
```

The `email` column, which was left out of the grant, is off limits.

### Adding and removing privileges

```sql run destructive
CREATE ROLE clerk LOGIN PASSWORD 'password';
GRANT SELECT, UPDATE ON category TO clerk;
REVOKE UPDATE ON category FROM clerk;

SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE grantee = 'clerk' AND table_name = 'category' ORDER BY privilege_type;
```

### Group roles: privileges for a team

If ten analysts need the same access, grant it to a **group role** once, then make each person a member:

```sql run destructive
CREATE ROLE viewer NOLOGIN;
GRANT SELECT ON film TO viewer;
CREATE ROLE guest LOGIN PASSWORD 'password';
GRANT viewer TO guest;

SELECT r.rolname AS member, g.rolname AS member_of
FROM pg_auth_members m
JOIN pg_roles r ON r.oid = m.member
JOIN pg_roles g ON g.oid = m.roleid
WHERE r.rolname = 'guest';
```

Change what `viewer` can do, and every member changes with it.

### Default privileges for future tables

`GRANT ... ON ALL TABLES` covers only the tables that exist today. `ALTER DEFAULT PRIVILEGES` covers tables created later:

```sql run destructive
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO viewer;

SELECT defaclrole::regrole AS creator, defaclacl AS privileges FROM pg_default_acl;
```

### Removing a role

A role that still owns objects or holds privileges cannot be dropped until you clear them:

```sql run destructive
REVOKE ALL ON category FROM ana;
DROP ROLE ana;

SELECT COUNT(*) AS ana_left FROM pg_roles WHERE rolname = 'ana';
```

## Try it yourself

Create a role that may read the `film` table and insert into `rental`, and nothing else. Connect as it and try one thing it should be allowed to do, and one it should not.

## Watch out

### Never give an application superuser rights

An application account with every privilege turns any bug or injection flaw into a total loss. Give it the few tables and actions it needs. Most web apps need only `SELECT`, `INSERT`, `UPDATE` and `DELETE` on their own tables.

### PUBLIC has default rights

Every role is a member of `PUBLIC`, which by default can connect to databases and use the `public` schema. Since PostgreSQL 15 it can no longer create tables in `public`, but check `REVOKE ... FROM PUBLIC` in a hardened setup.

### GRANT on a table is not enough on its own

A role also needs `USAGE` on the **schema** that holds the table. In `public` that comes through `PUBLIC`; in your own schemas you must grant it: `GRANT USAGE ON SCHEMA shop TO ana`.

### A role can be a login, a group, or both

`LOGIN` decides whether it can connect. A role without it is used as a group. Keep the two kinds separate.

### Use strong passwords, stored properly

We use the word `password` here because this is a throw-away lab. A real role needs a long, unique password (or certificate authentication), stored in a secrets manager and not in code.

### Privileges are checked at execution

Revoking a privilege takes effect for the next statement, even in an open session.

## Interview corner

**"What is the principle of least privilege?"**
Give each account only the permissions it needs for its job. It limits what a compromised or mistaken account can do.

**"What is the difference between `GRANT` and `REVOKE`?"**
`GRANT` gives privileges to a role, and `REVOKE` takes them away.

**"What is the difference between a user and a role in PostgreSQL?"**
None. A "user" is a role with the `LOGIN` attribute; a "group" is a role that has members. All are created with `CREATE ROLE`.

**"How do you find out what a role can do?"**
`\du` and `\dp` in `psql`, or query `information_schema.role_table_grants`, `pg_roles` and `has_table_privilege('role', 'table', 'SELECT')`.

## Practice

### Warm-up: create and grant

Create the role `clerk2` (`LOGIN`), grant it `SELECT` on `category` only, and return `has_table_privilege('clerk2', 'category', 'SELECT')` as `can_read` and `has_table_privilege('clerk2', 'category', 'INSERT')` as `can_insert`.

```sql practice destructive
-- hint: `has_table_privilege(role, table, privilege)`.
CREATE ROLE clerk2 LOGIN;
GRANT SELECT ON category TO clerk2;

SELECT has_table_privilege('clerk2', 'category', 'SELECT') AS can_read,
       has_table_privilege('clerk2', 'category', 'INSERT') AS can_insert;
```

### Core: give, then take away

Give `clerk3` `SELECT` and `UPDATE` on `category`, revoke `UPDATE`, and return the remaining privilege types as `privilege` (from `information_schema.role_table_grants`).

```sql practice destructive
-- hint: GRANT both, REVOKE UPDATE, then query the grants view.
CREATE ROLE clerk3 LOGIN;
GRANT SELECT, UPDATE ON category TO clerk3;
REVOKE UPDATE ON category FROM clerk3;

SELECT privilege_type AS privilege FROM information_schema.role_table_grants WHERE grantee = 'clerk3' AND table_name = 'category' ORDER BY privilege_type;
```

### Stretch: a group

Create the group `readers` (`NOLOGIN`) with `SELECT` on `film`, create the login `guest2`, make it a member of `readers`, and return `has_table_privilege('guest2', 'film', 'SELECT')` as `guest_can_read`.

```sql practice destructive
-- hint: `GRANT readers TO guest2`. Membership passes privileges on by default.
CREATE ROLE readers NOLOGIN;
GRANT SELECT ON film TO readers;
CREATE ROLE guest2 LOGIN;
GRANT readers TO guest2;

SELECT has_table_privilege('guest2', 'film', 'SELECT') AS guest_can_read;
```
