---
title: "Index Types: B-tree, Hash, GIN, GiST and BRIN"
order: 0
---

`CREATE INDEX` builds a **B-tree** unless you ask for something else. PostgreSQL has several index types, each made for a different kind of question. Knowing which one fits is a common interview topic, and the difference can be a factor of a thousand.

## What you'll learn

- What each index type is for
- `pg_trgm` and GIN for `LIKE '%word%'`
- BRIN: a tiny index for ordered data
- Hash indexes, and when they help

## The types at a glance

| Type | Best at | Typical use |
|---|---|---|
| **B-tree** (default) | `=`, `<`, `>`, `BETWEEN`, sorting, `LIKE 'abc%'` | Almost every column |
| **Hash** | `=` only | Equality lookups on long values |
| **GIN** | "Contains" on composite values | Arrays, `jsonb`, full-text search, trigrams |
| **GiST** | Overlap, nearest-neighbour, ranges, geometry | Range types, full-text, geometric data |
| **BRIN** | Huge tables whose values follow the row order | Timestamps in append-only logs |

## Set up a bigger table

Indexes only pay off on tables that are big enough, so build a table of 300000 rows (a text column of md5 hashes, and a timestamp that grows with the row order):

```sql run destructive
CREATE TABLE big AS
SELECT g AS id, md5(g::text) AS txt, timestamp '2020-01-01' + g * interval '1 minute' AS ts
FROM generate_series(1, 300000) g;
VACUUM (ANALYZE) big;

SELECT COUNT(*) AS rows_in_big, pg_size_pretty(pg_relation_size('big')) AS table_size FROM big;
```

## Examples

### Trigrams: LIKE '%word%' with pg_trgm

A B-tree cannot help with a leading wildcard. The `pg_trgm` extension breaks text into three-letter pieces, and a GIN index on those pieces can. First the plan without it:

```sql run destructive
CREATE EXTENSION IF NOT EXISTS pg_trgm;

EXPLAIN (COSTS OFF) SELECT * FROM big WHERE txt LIKE '%abcde%';
```

A (parallel) sequential scan: every row read. Now the index:

```sql run destructive
CREATE INDEX idx_big_trgm ON big USING gin (txt gin_trgm_ops);
VACUUM (ANALYZE) big;

EXPLAIN (COSTS OFF) SELECT * FROM big WHERE txt LIKE '%abcde%';
```

The trigram index finds the candidates directly. It also speeds up `ILIKE` and regular expressions.

### BRIN: a very small index for ordered data

`ts` grows with the row order, so rows close together in the table have close timestamps. A **BRIN** index stores just the minimum and maximum of each block of pages. Compare the plans and sizes:

```sql run destructive
EXPLAIN (COSTS OFF) SELECT * FROM big WHERE ts >= '2020-03-01' AND ts < '2020-03-01 01:00';
```

```sql run destructive
CREATE INDEX idx_big_brin ON big USING brin (ts);
VACUUM (ANALYZE) big;

EXPLAIN (COSTS OFF) SELECT * FROM big WHERE ts >= '2020-03-01' AND ts < '2020-03-01 01:00';
```

```sql run destructive
CREATE INDEX idx_big_btree ON big (ts);

SELECT pg_size_pretty(pg_relation_size('idx_big_brin')) AS brin_size,
       pg_size_pretty(pg_relation_size('idx_big_btree')) AS btree_size,
       pg_size_pretty(pg_relation_size('big')) AS table_size;
```

The BRIN index is hundreds of times smaller than the B-tree, and still answers the query. It only works when the column's order follows the physical row order.

### Hash: equality only

```sql run destructive
CREATE INDEX idx_big_hash ON big USING hash (txt);
DROP INDEX idx_big_trgm;
VACUUM (ANALYZE) big;

EXPLAIN (COSTS OFF) SELECT * FROM big WHERE txt = 'c4ca4238a0b923820dcc509a6f75849b';
```

A hash index answers `=` and nothing else (no ranges, no sorting). A B-tree usually does the same job and more, so hash indexes are rarely needed.

### GIN and GiST elsewhere

You already met the others: a **GIN** index on an array (`special_features`, page 13.2) or `jsonb` (13.3) answers "contains"; a **GiST** index on a range (`rental_period`, 13.4) answers "overlaps", and the film's `fulltext` column has one for full-text search (13.5). The `pg_indexes` view lists them by type:

```sql run
SELECT indexname, regexp_replace(indexdef, '.* USING (\w+).*', '\1') AS method
FROM pg_indexes
WHERE tablename IN ('film', 'rental', 'inventory')
ORDER BY tablename, indexname
LIMIT 6;
```

## Try it yourself

Build a GIN index on a text search column of your own table, and compare `EXPLAIN` before and after, first with a small table and then with a bigger one.

## Watch out

### Small tables ignore indexes, correctly

On a table of a few thousand rows PostgreSQL rightly prefers a sequential scan. That is why this page builds 300000 rows: the index only wins when it saves real work.

### GIN is slow to update, GiST is slow to search

GIN indexes cost more on every write (there are pending-list tricks to soften it). Choose by workload: mostly reads, GIN; heavy writes or ranges, GiST.

### BRIN needs correlation

If the values are scattered randomly through the table, every block's min and max covers almost everything, and BRIN is useless. Check with `SELECT correlation FROM pg_stats WHERE ...` (page 14.8).

### Do not use hash out of habit

Before PostgreSQL 10 hash indexes were not crash-safe. They are fine now, but a B-tree does the same and supports ranges and sorting.

### Every index type has its own operator class

`gin_trgm_ops`, `jsonb_path_ops`, `int4_ops`: the operator class says which operators the index supports. The wrong class, and the index is never used.

## Interview corner

**"What index types does PostgreSQL have, and when would you use each?"**
B-tree for general use; hash for equality only; GIN for arrays, `jsonb`, full-text and trigram search; GiST for ranges, geometry and nearest-neighbour; BRIN for huge, naturally ordered tables where a tiny index is enough.

**"How do you speed up `LIKE '%text%'`?"**
A trigram GIN (or GiST) index from `pg_trgm`, or full-text search for whole words.

**"What is a BRIN index?"**
A block range index: it stores the min and max of each group of table pages. It is tiny, and works when the column's values are correlated with the physical order of the rows, such as an append-only timestamp.

## Practice

### Warm-up: which method?

Return the **index method** of the primary key index of `film` (`film_pkey`) as `method`. (`pg_am` has the names; `pg_class.relam` links to it.)

```sql practice
-- hint: Join `pg_class` (the index) to `pg_am` on `relam`.
SELECT am.amname AS method
FROM pg_class c
JOIN pg_am am ON am.oid = c.relam
WHERE c.relname = 'film_pkey';
```

### Core: an ordered table

Create `log_line (id integer, at timestamp)` with 100000 rows where `at` grows with `id` (`generate_series` and an interval), add a BRIN index on `at`, and return the index method as `method` (from `pg_indexes.indexdef`, cast: `regexp_replace(indexdef, '.* USING (\w+).*', '\1')`).

```sql practice destructive
-- hint: `CREATE INDEX ... USING brin (at)`, then read `pg_indexes`.
CREATE TABLE log_line AS
SELECT g AS id, timestamp '2021-01-01' + g * interval '1 second' AS at FROM generate_series(1, 100000) g;
CREATE INDEX idx_log_at ON log_line USING brin (at);

SELECT regexp_replace(indexdef, '.* USING (\w+).*', '\1') AS method FROM pg_indexes WHERE indexname = 'idx_log_at';
```

### Stretch: how much smaller?

For that `log_line` table (recreated as `log_line2`), build both a B-tree and a BRIN index on `at`, and return `true` or `false` as `brin_smaller`: whether the BRIN index is smaller than the B-tree.

```sql practice destructive
-- hint: Compare `pg_relation_size` of the two indexes.
CREATE TABLE log_line2 AS
SELECT g AS id, timestamp '2021-01-01' + g * interval '1 second' AS at FROM generate_series(1, 100000) g;
CREATE INDEX idx_l2_btree ON log_line2 (at);
CREATE INDEX idx_l2_brin ON log_line2 USING brin (at);

SELECT pg_relation_size('idx_l2_brin') < pg_relation_size('idx_l2_btree') AS brin_smaller;
```
