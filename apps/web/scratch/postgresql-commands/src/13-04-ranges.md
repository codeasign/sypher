---
title: "Range Types"
order: 0
---

A **range** stores a span between two values in one column: from a start to an end. This database records each rental as a `tsrange`, a range of timestamps. Ranges come with operators for "contains", "overlaps" and "adjacent", and they can even be indexed.

## What you'll learn

- The built-in range types
- Bounds: inclusive `[` `]` versus exclusive `(` `)`
- `lower`, `upper`, `@>`, `&&` and `-|-`
- Ranges in a column, with an index

## Syntax

```sql show
SELECT int4range(1, 10);                    -- [1,10)
SELECT '[2025-01-01, 2025-02-01)'::daterange;
SELECT r @> value, r1 && r2, lower(r), upper(r), isempty(r);
```

## The built-in ranges

| Type | Holds |
|---|---|
| `int4range`, `int8range` | Whole numbers |
| `numrange` | Numbers with decimals |
| `daterange` | Dates |
| `tsrange`, `tstzrange` | Timestamps (without / with time zone) |

## Examples

### The rental period

```sql run
SELECT rental_id, rental_period
FROM rental
ORDER BY rental_id
LIMIT 3;
```

### Bounds

`[` includes the end point and `)` excludes it. So `[1,10)` holds 1 to 9. By default ranges are inclusive at the start and exclusive at the end:

```sql run
SELECT int4range(1, 10) AS default_bounds,
       int4range(1, 10, '[]') AS both_included,
       5 <@ int4range(1, 10) AS five_inside,
       10 <@ int4range(1, 10) AS ten_inside;
```

### Taking a range apart

```sql run
SELECT lower(r) AS start, upper(r) AS finish, upper(r) - lower(r) AS length, isempty(r) AS empty
FROM (SELECT daterange('2007-03-01', '2007-03-15') AS r) x;
```

### Contains, overlaps, adjacent

```sql run
SELECT daterange('2025-01-01', '2025-02-01') @> date '2025-01-15' AS contains_a_day,
       daterange('2025-01-01', '2025-02-01') && daterange('2025-01-20', '2025-03-01') AS overlap,
       daterange('2025-01-01', '2025-02-01') -|- daterange('2025-02-01', '2025-03-01') AS adjacent;
```

### Querying the rental period

Which rentals were out on 1 July 2005, at noon?

```sql run
SELECT COUNT(*) AS out_at_noon
FROM rental
WHERE rental_period @> timestamp '2005-07-01 12:00';
```

Rentals that were still out (no end) versus those that came back:

```sql run
SELECT COUNT(*) FILTER (WHERE upper_inf(rental_period)) AS still_out,
       COUNT(*) FILTER (WHERE NOT upper_inf(rental_period)) AS returned
FROM rental;
```

`upper_inf` is true when the range has no upper end.

### Which rentals overlapped a window?

```sql run
SELECT COUNT(*) AS overlapping
FROM rental
WHERE rental_period && tsrange('2005-07-01', '2005-07-02');
```

### A range column with an index

A **GiST** index (Module 14) makes overlap and contains queries fast:

```sql run destructive
CREATE INDEX idx_rental_period ON rental USING gist (rental_period);

EXPLAIN SELECT rental_id FROM rental WHERE rental_period && tsrange('2005-07-01', '2005-07-02');
```

## Try it yourself

How many rentals lasted longer than 7 days? (Subtract `lower` from `upper` and compare with `interval '7 days'`.)

## Watch out

### Upper bounds are exclusive by default

`daterange('2025-01-01', '2025-01-31')` does **not** include 31 January. Write `'[]'` as the third argument for an inclusive end. For dates and integers, PostgreSQL normalises ranges to `[)` anyway.

### An open end is not zero

`tsrange(now()::timestamp, NULL)` has no end: `upper()` is `NULL`. That is how an unreturned rental looks. Test it with `upper_inf()`, not `= 0`.

### NULL bounds mean "unbounded", not "unknown"

A range with a `NULL` bound extends to infinity in that direction. A `NULL` whole range means "no range at all".

### A range column beats two date columns

Two columns (`start`, `end`) cannot prevent overlaps or answer "contains" quickly. One range column plus an `EXCLUDE` constraint (page 12.7) can.

### Comparing with a value needs the right type

`rental_period @> '2005-07-01'` works because the literal is cast to a timestamp. `@>` between two ranges means "contains the whole range".

## Interview corner

**"What is a range type?"**
A type that holds a span between two values (with inclusive or exclusive ends), such as `tsrange` or `daterange`. It has operators for contains, overlaps and adjacency, and supports GiST indexes and exclusion constraints.

**"How would you prevent double bookings in PostgreSQL?"**
A range column for the booking period and an `EXCLUDE USING gist (room WITH =, period WITH &&)` constraint.

**"Why store a period as one range instead of start and end columns?"**
One value expresses the whole interval, the operators are correct about bounds, and it can be indexed and constrained as a unit.

## Practice

### Warm-up: rentals out at a moment

How many rentals were out at `2005-06-16 12:00`? Return one number, `out_then`.

```sql practice
-- hint: `rental_period @> timestamp '2005-06-16 12:00'`.
SELECT COUNT(*) AS out_then
FROM rental
WHERE rental_period @> timestamp '2005-06-16 12:00';
```

### Core: long rentals

How many rentals lasted **more than 7 days**? Return one number, `long_rentals`. (Ignore unreturned ones.)

```sql practice
-- hint: `upper(rental_period) - lower(rental_period) > interval '7 days'`.
SELECT COUNT(*) AS long_rentals
FROM rental
WHERE NOT upper_inf(rental_period) AND upper(rental_period) - lower(rental_period) > interval '7 days';
```

### Stretch: overlapping windows

Return `true` or `false` as `overlap_a_b` for whether `[2025-03-01, 2025-03-10)` overlaps `[2025-03-10, 2025-03-20)`, and as `overlap_a_c` for whether it overlaps `[2025-03-09, 2025-03-20)`, using `daterange` values.

```sql practice
-- hint: The first end is exclusive, so a range starting exactly there does not overlap.
SELECT daterange('2025-03-01', '2025-03-10') && daterange('2025-03-10', '2025-03-20') AS overlap_a_b,
       daterange('2025-03-01', '2025-03-10') && daterange('2025-03-09', '2025-03-20') AS overlap_a_c;
```
