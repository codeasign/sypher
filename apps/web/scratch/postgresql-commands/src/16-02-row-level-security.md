---
title: "Row-Level Security"
order: 0
---

`GRANT` decides which **tables** a role may touch. **Row-level security** (RLS) decides which **rows** of that table it may see or change. It moves a rule such as "a store manager sees only their own store's customers" from application code into the database, where no query can forget it.

## What you'll learn

- Turning RLS on with `ENABLE ROW LEVEL SECURITY`
- Writing policies with `USING` and `WITH CHECK`
- How the owner and superusers bypass RLS
- Testing a policy as another role

## Syntax

```sql show
ALTER TABLE t ENABLE ROW LEVEL SECURITY;

CREATE POLICY name ON t
  FOR SELECT | INSERT | UPDATE | DELETE | ALL
  TO role
  USING (row_visible_condition)
  WITH CHECK (row_allowed_condition);
```

## Examples

### Set up: a table of tickets per team

```sql run destructive
CREATE TABLE ticket (
  ticket_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team text NOT NULL,
  subject text NOT NULL
);
INSERT INTO ticket (team, subject) VALUES
  ('red', 'Printer jam'), ('red', 'VPN down'), ('blue', 'Password reset'), ('blue', 'New laptop');

CREATE ROLE red_agent LOGIN;
CREATE ROLE blue_agent LOGIN;
GRANT SELECT, UPDATE ON ticket TO red_agent, blue_agent;

SELECT team, COUNT(*) AS tickets FROM ticket GROUP BY team ORDER BY team;
```

### Without RLS, every agent sees every ticket

```sql run as=red_agent destructive
SELECT COUNT(*) AS visible_tickets FROM ticket;
```

### Turn on RLS and add a policy

Each agent may see only the tickets of the team named like their own role (`red_agent` sees `red`):

```sql run destructive
ALTER TABLE ticket ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_team ON ticket
  USING (team = split_part(current_user, '_', 1))
  WITH CHECK (team = split_part(current_user, '_', 1));

SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'ticket';
```

### Now each role sees only its own rows

```sql run as=red_agent destructive
SELECT team, subject FROM ticket ORDER BY ticket_id;
```

```sql run as=blue_agent destructive
SELECT team, subject FROM ticket ORDER BY ticket_id;
```

### WITH CHECK stops writes into someone else's rows

`USING` filters what a role can see and update. `WITH CHECK` filters what it can write:

```sql run as=red_agent error destructive
UPDATE ticket SET team = 'blue' WHERE subject = 'VPN down';
```

The red agent could see and change its own ticket, but not hand it to another team's rows in a way that breaks the policy.

### The owner and superusers are exempt

The table owner (and any superuser) bypasses RLS unless you `FORCE` it. So `sypher` still sees everything:

```sql run destructive
SELECT COUNT(*) AS sypher_sees FROM ticket;
```

## Try it yourself

Add a second policy that lets a role named `manager` see every ticket (`TO manager USING (true)`), and test it.

## Watch out

### RLS is off until you enable it

Creating a policy on a table without `ENABLE ROW LEVEL SECURITY` does nothing.

### With RLS on and no policy, nobody sees anything

A non-owner role with no applicable policy gets zero rows (default deny), not an error. That is safe, but confusing when you test.

### Policies are OR-ed together

If a role matches several permissive policies, it can see a row when **any** of them allows it. Use `AS RESTRICTIVE` for a policy that must always hold in addition.

### Do not trust it for the owner

The owner bypasses the policies. For an application that connects as the owner, use `ALTER TABLE ... FORCE ROW LEVEL SECURITY`, or better, connect with a non-owner role.

### RLS has a cost

The policy condition is added to every query on the table. Index the columns it uses (`team` here), and keep the expressions simple.

### Leaks through functions

A user-written function used in a query can, in some cases, see rows before the policy filters them. Views over RLS tables need `security_barrier` care. RLS is strong, but not a substitute for thinking about the whole path.

## Interview corner

**"What is row-level security?"**
A PostgreSQL feature that restricts which rows each role can see or modify, using policies defined on the table. It is enforced by the database for every query.

**"What is the difference between `USING` and `WITH CHECK`?"**
`USING` decides which existing rows are visible (and can be updated or deleted). `WITH CHECK` decides whether a new or changed row is allowed to be written.

**"When would you use RLS?"**
Multi-tenant applications (each customer sees only their rows), and data-protection rules such as "a manager sees only their own store", enforced in one place.

## Practice

### Warm-up: is it on?

Return whether row-level security is enabled on the `ticket` table you would create (`relrowsecurity` from `pg_class`) as `rls_on`, after creating `ticket2 (team text)` and enabling RLS on it.

```sql practice destructive
-- hint: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, then read `relrowsecurity`.
CREATE TABLE ticket2 (team text);
ALTER TABLE ticket2 ENABLE ROW LEVEL SECURITY;

SELECT relrowsecurity AS rls_on FROM pg_class WHERE relname = 'ticket2';
```

### Core: a policy

Create `doc (owner_name text, body text)`, enable RLS, and add a policy `mine` for all commands with `USING (owner_name = current_user)`. Return the policy's `cmd` from `pg_policies` as `applies_to`.

```sql practice destructive
-- hint: `CREATE POLICY mine ON doc USING (owner_name = current_user)`.
CREATE TABLE doc (owner_name text, body text);
ALTER TABLE doc ENABLE ROW LEVEL SECURITY;
CREATE POLICY mine ON doc USING (owner_name = current_user);

SELECT cmd AS applies_to FROM pg_policies WHERE tablename = 'doc' AND policyname = 'mine';
```

### Stretch: count what a role sees

Create `secret (owner_name text, body text)` with two rows for `sypher` and one for `nobody`, enable RLS with a policy `TO PUBLIC USING (owner_name = current_user)`, and force it (`FORCE ROW LEVEL SECURITY`) so it applies to the owner too. Return how many rows `sypher` sees as `visible_rows`.

```sql practice destructive
-- hint: FORCE makes the owner obey the policy.
CREATE TABLE secret (owner_name text, body text);
INSERT INTO secret VALUES ('sypher', 'a'), ('sypher', 'b'), ('nobody', 'c');
ALTER TABLE secret ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret FORCE ROW LEVEL SECURITY;
CREATE POLICY mine ON secret USING (owner_name = current_user);

SELECT COUNT(*) AS visible_rows FROM secret;
```
