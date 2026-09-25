---
title: "MVCC and VACUUM"
order: 0
---

PostgreSQL never overwrites a row in place. An `UPDATE` writes a **new version** of the row and leaves the old one behind, and a `DELETE` just marks the row as gone. This is **MVCC** (multi-version concurrency control), and it is why readers never block writers. The price is dead rows, which `VACUUM` cleans up.

## What you'll learn

- What MVCC is, and what a row version is
- Why updates make a table grow
- What `VACUUM`, autovacuum and `VACUUM FULL` do
- How to see table bloat

## Syntax

```sql show
VACUUM table_name;              -- reclaim dead rows for reuse
VACUUM (ANALYZE) table_name;    -- also refresh planner statistics
VACUUM FULL table_name;         -- rewrite the table smaller (locks it)
ANALYZE table_name;             -- refresh statistics only
```

## Examples

### An update makes a new row

Every row has a physical address, `ctid` (page number, position in the page). Watch it change when a row is updated:

```sql run destructive
CREATE TABLE demo (id int PRIMARY KEY, val text);
INSERT INTO demo VALUES (1, 'a'), (2, 'b'), (3, 'c');

SELECT ctid, id, val FROM demo ORDER BY id;
```

```sql run destructive
UPDATE demo SET val = 'changed' WHERE id = 1;

SELECT ctid, id, val FROM demo ORDER BY id;
```

Row 1 moved from `(0,1)` to `(0,4)`: PostgreSQL wrote a new version at the end and left the old version at `(0,1)`, invisible but still on disk. That is a **dead tuple**.

### A table grows when you update it

Fill a table, note its size, then update every row:

```sql run destructive
CREATE TABLE bloat (id int PRIMARY KEY, filler text);
INSERT INTO bloat SELECT g, repeat('x', 100) FROM generate_series(1, 10000) g;

SELECT pg_size_pretty(pg_relation_size('bloat')) AS size_after_insert;
```

```sql run destructive
UPDATE bloat SET filler = repeat('y', 100);

SELECT pg_size_pretty(pg_relation_size('bloat')) AS size_after_update;
```

Ten thousand rows, but the file is now about twice as big: the old versions are still there.

### VACUUM makes the space reusable

`VACUUM` marks dead rows' space as free, so later updates and inserts reuse it instead of growing the file:

```sql run destructive
VACUUM bloat;

UPDATE bloat SET filler = repeat('z', 100);

SELECT pg_size_pretty(pg_relation_size('bloat')) AS size_after_vacuum_and_update;
```

The size stayed about the same this time, because the second update could reuse the space `VACUUM` freed.

### VACUUM FULL gives space back to the system

Plain `VACUUM` rarely makes the file smaller. `VACUUM FULL` rewrites the whole table into a new compact file, but it **locks the table** while it runs:

```sql run destructive
DELETE FROM bloat WHERE id > 1000;
VACUUM FULL bloat;

SELECT pg_size_pretty(pg_relation_size('bloat')) AS size_after_vacuum_full;
```

### Statistics: ANALYZE

The planner chooses plans from statistics about your data. `ANALYZE` refreshes them, and it is part of every autovacuum run:

```sql run destructive
ANALYZE bloat;

SELECT reltuples::int AS estimated_rows FROM pg_class WHERE relname = 'bloat';
```

### Autovacuum

You rarely run `VACUUM` by hand, because a background process does it for you:

```sql run
SELECT name, setting
FROM pg_settings
WHERE name IN ('autovacuum', 'autovacuum_vacuum_scale_factor', 'autovacuum_naptime')
ORDER BY name;
```

Roughly, autovacuum cleans a table once about 20% of its rows are dead.

## Try it yourself

Create a table, update every row twice, and compare `pg_relation_size` before and after `VACUUM`, and after `VACUUM FULL`.

## Watch out

### A long transaction stops VACUUM

`VACUUM` cannot remove a dead row while any open transaction might still need to see it. One forgotten `BEGIN` on a busy database makes every table bloat. This is the most common cause of a slowly growing database.

### VACUUM FULL blocks everything

It takes an exclusive lock: no reads or writes on the table until it finishes. For live systems, use the `pg_repack` extension or partitioning instead.

### Delete does not free disk space

Deleting half a table leaves the file the same size. `VACUUM` lets new rows reuse the space, but only `VACUUM FULL` (or a rewrite) returns it to the operating system.

### Transaction id wraparound

Row versions are numbered with a 32-bit transaction counter. `VACUUM` also "freezes" old rows so the counter can wrap around safely. If autovacuum is disabled or blocked for too long, PostgreSQL will eventually stop accepting writes to protect the data.

### HOT updates need free space

When an update changes only unindexed columns and the new version fits on the same page, PostgreSQL can skip updating the indexes ("HOT update"). A lower `fillfactor` on heavily updated tables leaves room for that.

## Interview corner

**"What is MVCC?"**
Multi-version concurrency control: each row can exist in several versions, and each transaction sees the versions valid for its snapshot. Readers never block writers, and writers never block readers.

**"Why does PostgreSQL need `VACUUM`?"**
Updates and deletes leave old row versions (dead tuples). `VACUUM` finds the ones no transaction can see any more and marks their space reusable, and it freezes old rows to prevent transaction id wraparound.

**"What is the difference between `VACUUM` and `VACUUM FULL`?"**
`VACUUM` works alongside normal queries and only marks space reusable inside the file. `VACUUM FULL` rewrites the table into a smaller file, but holds an exclusive lock for the whole time.

**"What is table bloat, and how do you fix it?"**
A table (or index) much bigger than its live data needs, because of dead rows that were not cleaned in time. Fix the cause (long transactions, autovacuum settings), then `VACUUM`, or rewrite with `VACUUM FULL` / `pg_repack`.

## Practice

### Warm-up: is autovacuum on?

Return the value of the `autovacuum` setting as `autovacuum_on` (use `current_setting`).

```sql practice
-- hint: `current_setting('autovacuum')`.
SELECT current_setting('autovacuum') AS autovacuum_on;
```

### Core: watch a row move

Create `mover (id int PRIMARY KEY, v int)` with rows `(1, 10)`, `(2, 20)`. Update row 1, then return `id` and `ctid::text` of both rows, ordered by `id`.

```sql practice destructive
-- hint: `SELECT id, ctid::text FROM mover ORDER BY id` after the UPDATE.
CREATE TABLE mover (id int PRIMARY KEY, v int);
INSERT INTO mover VALUES (1, 10), (2, 20);
UPDATE mover SET v = 11 WHERE id = 1;

SELECT id, ctid::text AS ctid FROM mover ORDER BY id;
```

### Stretch: does vacuum let the table be reused?

Create `churn (id int PRIMARY KEY, filler text)` with 5000 rows of `repeat('x', 100)`. Update all rows, run `VACUUM churn`, update all rows again, and return whether the final size is **less than twice** the size after the first update (`pg_relation_size`), as `reused_space` (`true` or `false`). (Compare in one query using scalar subqueries is not possible across statements, so store the sizes in a small table `sizes` first.)

```sql practice destructive
-- hint: `CREATE TABLE sizes AS SELECT pg_relation_size('churn') AS s` after each step, then compare.
CREATE TABLE churn (id int PRIMARY KEY, filler text);
INSERT INTO churn SELECT g, repeat('x', 100) FROM generate_series(1, 5000) g;
UPDATE churn SET filler = repeat('y', 100);
CREATE TABLE sizes AS SELECT pg_relation_size('churn') AS after_first_update;
VACUUM churn;
UPDATE churn SET filler = repeat('z', 100);

SELECT pg_relation_size('churn') < 2 * (SELECT after_first_update FROM sizes) AS reused_space;
```
