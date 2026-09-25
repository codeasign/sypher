---
title: "Extensions"
order: 0
---

An **extension** is a packaged add-on that installs new types, functions, operators and index types into a database with one command. Much of what makes PostgreSQL special (trigram search, `crosstab`, UUID and crypto functions, geospatial data with PostGIS) arrives as an extension.

## What you'll learn

- Listing available and installed extensions
- `CREATE EXTENSION` and `DROP EXTENSION`
- Useful built-in ones: `pg_trgm`, `pgcrypto`, `tablefunc`, `unaccent`
- What needs superuser rights, and what does not

## Syntax

```sql show
SELECT name, default_version FROM pg_available_extensions;
CREATE EXTENSION [IF NOT EXISTS] name;
DROP EXTENSION name;
```

## Examples

### What is installed?

```sql run
SELECT extname AS extension, extversion AS version FROM pg_extension ORDER BY extname;
```

### What could be installed?

The official PostgreSQL image ships with the "contrib" extensions ready to install:

```sql run
SELECT name, default_version, left(comment, 60) AS description
FROM pg_available_extensions
WHERE name IN ('pg_trgm', 'pgcrypto', 'tablefunc', 'unaccent', 'uuid-ossp', 'btree_gist', 'pg_stat_statements')
ORDER BY name;
```

### pgcrypto: hashing and random values

```sql run destructive
CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT encode(digest('hello', 'sha256'), 'hex') AS sha256_of_hello,
       length(gen_random_uuid()::text) AS uuid_length,
       crypt('secret', gen_salt('bf')) <> 'secret' AS hashed;
```

`crypt` with `gen_salt('bf')` is how you store password hashes. Never store passwords as plain text.

### unaccent: search without accents

```sql run destructive
CREATE EXTENSION IF NOT EXISTS unaccent;

SELECT unaccent('Café Zoë Ångström') AS plain_text;
```

### tablefunc: crosstab, the real pivot

Module 9 pivoted rows into columns by hand. The `tablefunc` extension has `crosstab`, which does it in one call, if you can name the output columns:

```sql run destructive
CREATE EXTENSION IF NOT EXISTS tablefunc;

SELECT *
FROM crosstab(
  $$SELECT rating::text, store_id::text, COUNT(*)::int
    FROM film f JOIN inventory i ON i.film_id = f.film_id
    GROUP BY 1, 2 ORDER BY 1, 2$$,
  $$VALUES ('1'), ('2')$$
) AS ct(rating text, store_1 int, store_2 int)
ORDER BY rating;
```

### pg_trgm: similarity

Besides speeding up `LIKE`, trigrams measure how alike two texts are, which finds typos:

```sql run destructive
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT title, round(similarity(title, 'ACADAMY DINOSUR')::numeric, 2) AS similarity
FROM film
ORDER BY similarity(title, 'ACADAMY DINOSUR') DESC, title
LIMIT 2;
```

### Removing one

```sql run destructive
CREATE EXTENSION IF NOT EXISTS unaccent;
DROP EXTENSION unaccent;

SELECT COUNT(*) AS unaccent_installed FROM pg_extension WHERE extname = 'unaccent';
```

## Try it yourself

Install `uuid-ossp` and compare `uuid_generate_v4()` with the built-in `gen_random_uuid()`. Which needs the extension?

## Watch out

### Most extensions need superuser rights

`CREATE EXTENSION` normally requires a superuser, apart from a list of "trusted" extensions. Your lab account is a superuser; on a managed cloud database you install only what the provider allows.

### An extension belongs to a database

`CREATE EXTENSION` installs into **one** database. Do it again in every database that needs it.

### Extensions have versions

`ALTER EXTENSION ... UPDATE` moves to a newer version after a server upgrade. Dumps record the extension, not its code.

### Some need a restart

Extensions such as `pg_stat_statements` must be listed in `shared_preload_libraries`, which needs a server restart. Plan the restart.

### Do not trust unreviewed extensions

An extension runs inside the server with high privileges. Install only ones you trust.

## Interview corner

**"What is a PostgreSQL extension?"**
A packaged bundle of SQL objects (and sometimes compiled code) installed with `CREATE EXTENSION`: new data types, functions, operators or index types.

**"Name some useful extensions."**
`pg_stat_statements` (query statistics), `pg_trgm` (fuzzy and `LIKE` search), `PostGIS` (geospatial), `pgcrypto`, `uuid-ossp`, `tablefunc` (`crosstab`), `btree_gist` (exclusion constraints), `pg_partman` (partition management).

**"How do you check which extensions a database uses?"**
`\dx` in `psql`, or `SELECT * FROM pg_extension`.

## Practice

### Warm-up: is it installed?

Return `true` or `false` as `has_plpgsql` for whether the extension `plpgsql` is installed.

```sql practice
-- hint: `EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'plpgsql')`.
SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'plpgsql') AS has_plpgsql;
```

### Core: hash something

Install `pgcrypto` and return the SHA-256 hash of the text `sypher` as hex, as `hash`, using `encode(digest('sypher', 'sha256'), 'hex')`.

```sql practice destructive
-- hint: `CREATE EXTENSION IF NOT EXISTS pgcrypto`, then `digest`.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT encode(digest('sypher', 'sha256'), 'hex') AS hash;
```

### Stretch: fuzzy match

With `pg_trgm`, return how many film titles have a `similarity` above 0.5 to the text `ACADEMY DINOSAUR`, as `close_titles`.

```sql practice destructive
-- hint: `similarity(title, 'ACADEMY DINOSAUR') > 0.5`.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT COUNT(*) AS close_titles FROM film WHERE similarity(title, 'ACADEMY DINOSAUR') > 0.5;
```
