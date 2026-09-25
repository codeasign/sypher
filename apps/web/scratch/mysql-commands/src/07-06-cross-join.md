---
title: "CROSS JOIN"
order: 0
---

`CROSS JOIN` pairs **every** row of one table with **every** row of another. There is no `ON` condition. The result has as many rows as the two tables multiplied together.

## What you'll learn

- What a cross join (Cartesian product) is
- When it is useful
- Why the accidental version is dangerous

## Syntax

```sql show
SELECT columns
FROM table1
CROSS JOIN table2;
```

## Examples

### Every combination

Every store paired with every category (2 stores × 16 categories):

```sql run
SELECT s.store_id, c.name AS category
FROM store AS s
CROSS JOIN category AS c
ORDER BY s.store_id, c.name;
```

The result has {{= SELECT COUNT(*) FROM store }} × {{= SELECT COUNT(*) FROM category }} = {{= SELECT COUNT(*) FROM store CROSS JOIN category }} rows.

### A useful case: a complete grid

You want a report row for *every* store and category, even when a combination has no data. Build the full grid with `CROSS JOIN`, then `LEFT JOIN` the facts onto it:

```sql run
SELECT s.store_id, c.name AS category, COUNT(i.inventory_id) AS copies
FROM store AS s
CROSS JOIN category AS c
LEFT JOIN film_category AS fc ON fc.category_id = c.category_id
LEFT JOIN inventory AS i ON i.film_id = fc.film_id AND i.store_id = s.store_id
GROUP BY s.store_id, c.name
ORDER BY s.store_id, c.name;
```

Every store × category combination is in the report, including any with zero copies.

## Try it yourself

Make a grid of every rating with every rental price, using `SELECT DISTINCT` on the `film` table twice.

## Watch out

### Sizes multiply

Two modest tables make a huge result:

```sql run
SELECT COUNT(*) AS combinations
FROM film
CROSS JOIN actor;
```

Cross-joining a 1000 row table with a 200 row table gives 200000 rows. Cross-joining two big tables can bring a server to its knees.

### The comma is a hidden cross join

The old style `FROM film, actor` (tables separated by a comma) is also a cross join, unless a `WHERE` links them. It is easy to forget the `WHERE` and get a giant result. Always use explicit `JOIN ... ON`.

### An INNER JOIN with no ON behaves the same

In MySQL, `JOIN` without `ON` is also allowed and behaves like `CROSS JOIN`. Some databases reject it. Say what you mean: write `CROSS JOIN` when you want it.

## Interview corner

**"What is a `CROSS JOIN`, and when do you use it?"**
It returns the Cartesian product: every row of the first table with every row of the second. Use it to generate all combinations, such as a calendar × products grid or test data.

**"How many rows does `A CROSS JOIN B` return?"**
`rows(A) × rows(B)`.

## Practice

### Warm-up: how many combinations?

Return `combinations`, the number of rows in the cross join of `category` and `language`.

```sql practice
-- hint: `COUNT(*)` over `category CROSS JOIN language`.
SELECT COUNT(*) AS combinations
FROM category
CROSS JOIN language;
```

### Core: every pair

List every combination of the different film `rating` values with the different `rental_duration` values. Return `rating` and `rental_duration`, ordered by both.

```sql practice
-- hint: Cross join two `SELECT DISTINCT` subqueries in the FROM clause.
SELECT r.rating, d.rental_duration
FROM (SELECT DISTINCT rating FROM film) AS r
CROSS JOIN (SELECT DISTINCT rental_duration FROM film) AS d
ORDER BY r.rating, d.rental_duration;
```
