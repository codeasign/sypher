---
title: "Table Partitioning"
order: 0
---

**Partitioning** splits one big table into smaller pieces, called partitions, while it still looks like one table to queries. The `payment` table in this database is already partitioned by month. A query that mentions the date only touches the pieces it needs, which is called **partition pruning**.

## What you'll learn

- How a partitioned table is declared
- Seeing the partitions of `payment`
- Partition pruning in `EXPLAIN`
- Creating your own range partitions, and dropping old data instantly

## Syntax

```sql show
CREATE TABLE t (id int, day date, ...) PARTITION BY RANGE (day);
CREATE TABLE t_2025_01 PARTITION OF t FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## Examples

### The partitions of payment

```sql run
SELECT c.relname AS partition_name, pg_get_expr(c.relpartbound, c.oid) AS bounds
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhrelid
WHERE i.inhparent = 'payment'::regclass
ORDER BY c.relname;
```

Each row of `payment` lives in exactly one of these, chosen by `payment_date`. The last one, `payment_p0000_default`, catches everything that fits no other range.

### Pruning: only the needed partition is read

A query on one month touches one partition:

```sql run
EXPLAIN (COSTS OFF)
SELECT * FROM payment WHERE payment_date >= '2007-03-01' AND payment_date < '2007-04-01';
```

A query with no date must look at all of them:

```sql run
EXPLAIN (COSTS OFF)
SELECT * FROM payment WHERE customer_id = 5;
```

The first plan names only one partition; the second lists every partition. That is the whole benefit: with a date in the query, the other partitions are never opened.

### Your own partitioned table

```sql run destructive
CREATE TABLE sensor_reading (
  reading_id bigint GENERATED ALWAYS AS IDENTITY,
  taken_on date NOT NULL,
  value numeric NOT NULL
) PARTITION BY RANGE (taken_on);

CREATE TABLE sensor_reading_2025_01 PARTITION OF sensor_reading FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE sensor_reading_2025_02 PARTITION OF sensor_reading FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

INSERT INTO sensor_reading (taken_on, value)
SELECT date '2025-01-01' + (g % 59), g FROM generate_series(1, 1000) g;

SELECT tableoid::regclass AS partition, COUNT(*) AS rows FROM sensor_reading GROUP BY 1 ORDER BY 1;
```

`tableoid` tells which partition each row is stored in.

### A row that fits no partition

```sql run error destructive
CREATE TABLE ev (day date NOT NULL) PARTITION BY RANGE (day);
CREATE TABLE ev_2025 PARTITION OF ev FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
INSERT INTO ev VALUES ('2030-06-01');
```

Add a `DEFAULT` partition to catch strays, or create the partition in advance.

### Dropping old data instantly

Deleting a month of rows from a huge table is slow and leaves dead tuples. With partitions, you detach and drop the whole piece in a moment:

```sql run destructive
CREATE TABLE log_entry (at date NOT NULL, note text) PARTITION BY RANGE (at);
CREATE TABLE log_entry_2025_01 PARTITION OF log_entry FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE log_entry_2025_02 PARTITION OF log_entry FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
INSERT INTO log_entry SELECT date '2025-01-01' + (g % 55), 'x' FROM generate_series(1, 500) g;

DROP TABLE log_entry_2025_01;

SELECT COUNT(*) AS rows_left FROM log_entry;
```

## Try it yourself

Create a partitioned table by month with three partitions, insert rows in each, and use `EXPLAIN` to see pruning for a one-month query.

## Watch out

### Partitioning is not always a speed-up

It helps when queries filter on the partition key and the table is very large (tens of millions of rows or more). For small tables it only adds overhead and complexity.

### The partition key must be in the primary key

A primary key or unique constraint on a partitioned table must include the partition key column, because uniqueness is only enforced inside each partition.

### Queries that skip the key read every partition

`WHERE customer_id = 5` on `payment` scans every month. Add an index on the column in each partition (a partitioned index does this for you).

### Plan for new partitions

Rows for a future month need a partition that exists. Create them ahead of time (a scheduled job or an extension such as `pg_partman`), or rely on a `DEFAULT` partition and clean up.

### Foreign keys to a partitioned table

A partitioned table can be a foreign key target and source in current versions, but check the rules for your version before designing around it.

## Interview corner

**"What is table partitioning, and why use it?"**
Splitting one large table into smaller physical tables by a key (range, list or hash). Queries that filter on the key skip irrelevant partitions (pruning), maintenance such as vacuum or index builds works on smaller pieces, and old data can be dropped by dropping a partition.

**"What partitioning methods does PostgreSQL support?"**
`RANGE` (dates, numbers), `LIST` (a set of values, such as a country) and `HASH` (even spread by a modulus).

**"How do you delete old data from a very large table efficiently?"**
Partition by date and `DROP` (or `DETACH`) the old partition, instead of a huge `DELETE`.

## Practice

### Warm-up: how many partitions?

How many partitions does the `payment` table have? Return one number, `partitions`.

```sql practice
-- hint: Count the rows of `pg_inherits` whose parent is `payment`.
SELECT COUNT(*) AS partitions FROM pg_inherits WHERE inhparent = 'payment'::regclass;
```

### Core: which partition holds a row?

Return the `payment_id` and the **name of the partition** (`tableoid::regclass::text` as `partition`) of the payment with `payment_id = 17503`.

```sql practice
-- hint: `SELECT payment_id, tableoid::regclass::text AS partition FROM payment WHERE payment_id = 17503`.
SELECT payment_id, tableoid::regclass::text AS partition FROM payment WHERE payment_id = 17503;
```

### Stretch: create a partition

Create a table `visit (day date NOT NULL, who text) PARTITION BY RANGE (day)` with one partition `visit_2025` for the whole year 2025, insert two rows dated in 2025, and return the number of rows in `visit_2025` as `in_partition`.

```sql practice destructive
-- hint: `PARTITION OF visit FOR VALUES FROM ('2025-01-01') TO ('2026-01-01')`.
CREATE TABLE visit (day date NOT NULL, who text) PARTITION BY RANGE (day);
CREATE TABLE visit_2025 PARTITION OF visit FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
INSERT INTO visit VALUES ('2025-03-01', 'Asha'), ('2025-07-15', 'Ben');

SELECT COUNT(*) AS in_partition FROM visit_2025;
```
