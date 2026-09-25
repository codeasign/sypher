---
title: "Self Join"
order: 0
---

A **self join** joins a table to itself. It sounds odd, but it is how you compare rows of the same table with each other, for example "which actors share a last name?" or "which employees earn more than their manager?".

## What you'll learn

- Joining a table to itself with two aliases
- Comparing rows of the same table
- Avoiding duplicate and mirrored pairs

## Syntax

```sql show
SELECT a.column, b.column
FROM table_name AS a
JOIN table_name AS b
  ON a.some_column = b.some_column;
```

You must give the two copies different aliases, because otherwise MySQL cannot tell them apart.

## Examples

### Pairs that share a value

Actors who share a last name. The two copies of `actor` are `a1` and `a2`:

```sql run
SELECT a1.first_name AS first_actor, a2.first_name AS second_actor, a1.last_name
FROM actor AS a1
JOIN actor AS a2
  ON a1.last_name = a2.last_name
 AND a1.actor_id < a2.actor_id
ORDER BY a1.last_name, a1.actor_id, a2.actor_id;
```

The condition `a1.actor_id < a2.actor_id` matters. Without it, every actor would be paired with themselves, and each pair would appear twice (`A, B` and `B, A`).

### Films of the same length and rating

```sql run
SELECT f1.title AS film_one, f2.title AS film_two, f1.length, f1.rating
FROM film AS f1
JOIN film AS f2
  ON f1.length = f2.length
 AND f1.rating = f2.rating
 AND f1.film_id < f2.film_id
WHERE f1.length = 46
ORDER BY f1.film_id, f2.film_id;
```

### Comparing a row with others in its table

For each film, count how many films are shorter than it. Restricting to a few films keeps the work small:

```sql run
SELECT f1.title, f1.length, COUNT(f2.film_id) AS films_shorter
FROM film AS f1
LEFT JOIN film AS f2 ON f2.length < f1.length
WHERE f1.film_id <= 5
GROUP BY f1.film_id, f1.title, f1.length
ORDER BY f1.film_id;
```

## Try it yourself

Find pairs of categories whose names have the same length, and pairs of actors who share a first name.

## Watch out

### Without the "less than" filter, you get self-pairs and mirrors

Compare the number of pairs with and without `a1.actor_id < a2.actor_id`:

```sql run
SELECT COUNT(*) AS with_self_and_mirror_pairs
FROM actor AS a1
JOIN actor AS a2 ON a1.last_name = a2.last_name;

SELECT COUNT(*) AS distinct_pairs
FROM actor AS a1
JOIN actor AS a2 ON a1.last_name = a2.last_name AND a1.actor_id < a2.actor_id;
```

The first count includes each actor paired with themselves (200 rows) and every real pair twice.

### Self joins on big tables are expensive

Comparing every row with every other row can mean millions of pairs. Index the joining columns, and filter before you join.

## Interview corner

**"What is a self join, and when do you use it?"**
Joining a table to itself under two aliases. Use it to compare rows within a table: rows with the same value, an employee and their manager, consecutive rows.

**"How do you avoid seeing each pair twice in a self join?"**
Add an inequality such as `a.id < b.id`, so each pair is returned once and no row pairs with itself.

## Practice

### Warm-up: actors who share a last name

Show pairs of **actors** whose `last_name` is `AKROYD` (`first_actor` and `second_actor` as first names), each pair once, ordered by both actor ids.

```sql practice
-- hint: Self join `actor` on `last_name`, with `a1.actor_id < a2.actor_id`, and filter on the last name.
SELECT a1.first_name AS first_actor, a2.first_name AS second_actor
FROM actor AS a1
JOIN actor AS a2 ON a1.last_name = a2.last_name AND a1.actor_id < a2.actor_id
WHERE a1.last_name = 'AKROYD'
ORDER BY a1.actor_id, a2.actor_id;
```

### Core: same-length names

Show pairs of film **categories** whose `name` has the same number of letters. Return `first_category` and `second_category`, each pair once, ordered by the first category id and then the second.

```sql practice
-- hint: Self join `category` on `CHAR_LENGTH(name)`, with `c1.category_id < c2.category_id`.
SELECT c1.name AS first_category, c2.name AS second_category
FROM category AS c1
JOIN category AS c2
  ON CHAR_LENGTH(c1.name) = CHAR_LENGTH(c2.name)
 AND c1.category_id < c2.category_id
ORDER BY c1.category_id, c2.category_id;
```
