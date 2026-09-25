---
title: "Arrays"
order: 0
---

A column in PostgreSQL can hold a whole **array**: an ordered list of values of one type. The film table uses one for `special_features`. Arrays are handy for small lists that belong to a row, and PostgreSQL has a rich set of tools to search them.

## What you'll learn

- Reading and building arrays
- Testing membership: `= ANY`, `@>`, `&&`
- Turning an array into rows (`unnest`) and rows into an array (`array_agg`)
- Indexing arrays with GIN

## Syntax

```sql show
SELECT ARRAY[1, 2, 3];
SELECT '{a,b,c}'::text[];
SELECT arr[1], arr[2:3], array_length(arr, 1), value = ANY (arr), arr @> ARRAY[x], arr && other;
```

## Examples

### An array column

```sql run
SELECT title, special_features, array_length(special_features, 1) AS how_many
FROM film
ORDER BY film_id
LIMIT 3;
```

### Positions start at 1

```sql run
SELECT special_features[1] AS first_feature, special_features[2:3] AS slice
FROM film
WHERE film_id = 1;
```

### Does the array contain a value?

`'Trailers' = ANY (array)` asks "is this value in the list?":

```sql run
SELECT COUNT(*) AS films_with_trailers
FROM film
WHERE 'Trailers' = ANY (special_features);
```

### Contains (@>) and overlaps (&&)

`@>` means "contains all of these". `&&` means "has at least one in common":

```sql run
SELECT
  COUNT(*) FILTER (WHERE special_features @> ARRAY['Trailers', 'Commentaries']) AS has_both,
  COUNT(*) FILTER (WHERE special_features && ARRAY['Trailers', 'Commentaries']) AS has_either
FROM film;
```

### unnest: one row per element

```sql run
SELECT f.title, feature
FROM film f, unnest(f.special_features) AS feature
WHERE f.film_id = 1
ORDER BY feature;
```

### Counting the elements across all rows

```sql run
SELECT feature, COUNT(*) AS films
FROM film, unnest(special_features) AS feature
GROUP BY feature
ORDER BY films DESC, feature;
```

### Building arrays

`ARRAY[...]` builds one, and `array_agg` collects rows into one:

```sql run
SELECT ARRAY[1, 2, 3] || 4 AS appended,
       array_append(ARRAY['a'], 'b') AS also_appended,
       array_to_string(ARRAY['x', 'y', 'z'], '-') AS as_text,
       (SELECT array_agg(name ORDER BY name) FROM category WHERE category_id <= 3) AS categories;
```

### An array column of your own

```sql run destructive
CREATE TABLE recipe (recipe_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text, ingredients text[]);
INSERT INTO recipe (title, ingredients) VALUES
  ('Pancakes', ARRAY['flour', 'milk', 'egg']),
  ('Omelette', ARRAY['egg', 'butter']);

SELECT title FROM recipe WHERE 'egg' = ANY (ingredients) ORDER BY title;
```

### A GIN index makes contains fast

A normal index cannot answer "contains". A **GIN** index (Module 14) is made for it:

```sql run destructive
CREATE INDEX idx_features ON film USING gin (special_features);

SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_features';
```

## Try it yourself

Find the films that have both `Deleted Scenes` and `Behind the Scenes`, and count how many features the film with the most features has.

## Watch out

### Positions start at 1, not 0

`arr[0]` is `NULL`, not the first element.

### NULL inside arrays

An array can contain `NULL`s, and `value = ANY (arr)` is `NULL` (not false) when the value is missing but a `NULL` is present. Keep arrays free of `NULL` if you can.

### Arrays are not a replacement for tables

If you need to join, count or update individual elements, or enforce that each element exists elsewhere, use a real child table. Arrays suit small lists that are read and written as a whole.

### Casting a text list

`'{a,b}'` needs a type: `'{a,b}'::text[]`. Elements with spaces or commas need quotes inside the braces.

### Arrays of any dimension

PostgreSQL arrays can be multidimensional and the declared size (`text[3]`) is not enforced. Treat them as one-dimensional lists.

## Interview corner

**"How do you check whether a value is in an array column?"**
`'x' = ANY (col)`, or `col @> ARRAY['x']` (which can use a GIN index).

**"How do you turn an array into rows and back?"**
`unnest(array)` gives one row per element (usually with `FROM t, unnest(t.col)`), and `array_agg(value)` collects rows back into an array.

**"When would you use an array column instead of a child table?"**
When the list is small, belongs to the row, and is read and written as a whole (tags, a few features). Otherwise a child table with a foreign key is more flexible and safer.

## Practice

### Warm-up: how many features?

Show `title` and the number of special features (`feature_count`) of the films with `film_id` up to 3, ordered by `film_id`.

```sql practice
-- hint: `array_length(special_features, 1)`.
SELECT title, array_length(special_features, 1) AS feature_count
FROM film
WHERE film_id <= 3
ORDER BY film_id;
```

### Core: both features

Count the films that have **both** `Trailers` and `Deleted Scenes`, as `films`.

```sql practice
-- hint: `special_features @> ARRAY['Trailers', 'Deleted Scenes']`.
SELECT COUNT(*) AS films
FROM film
WHERE special_features @> ARRAY['Trailers', 'Deleted Scenes'];
```

### Stretch: features per rating

For each `rating`, show how many films have `Commentaries` (`with_commentaries`). Order by rating.

```sql practice
-- hint: `COUNT(*) FILTER (WHERE 'Commentaries' = ANY (special_features))`, grouped by rating.
SELECT rating, COUNT(*) FILTER (WHERE 'Commentaries' = ANY (special_features)) AS with_commentaries
FROM film
GROUP BY rating
ORDER BY rating;
```
