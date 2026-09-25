---
title: "Interview Problem: Who Never, and Who Always"
order: 0
---

Two related questions come up all the time: "which customers have **never** done X?" and "which customers have done X for **every** Y?" The first is an anti-join. The second is called *relational division*, and it trips up many candidates.

## What you'll learn

- "Never" questions with `NOT EXISTS` and `LEFT JOIN`
- "Every" questions with `GROUP BY ... HAVING COUNT(DISTINCT ...)`
- "Every" with arrays and `@>`
- How to check your answer

## The problem

1. Which customers have **never** rented a Horror film?
2. Which customers have rented films from **every** category?

## Part 1: never (anti-join)

Customers with **no** rental of a Horror film. The subquery follows the chain rental → inventory → film → category:

```sql run
SELECT COUNT(*) AS never_horror
FROM customer c
WHERE NOT EXISTS (
  SELECT 1
  FROM rental r
  JOIN inventory i ON i.inventory_id = r.inventory_id
  JOIN film_category fc ON fc.film_id = i.film_id
  JOIN category cat ON cat.category_id = fc.category_id
  WHERE r.customer_id = c.customer_id AND cat.name = 'Horror'
);
```

The `LEFT JOIN` version puts the Horror condition **in the ON** and looks for the missing side:

```sql run
SELECT COUNT(*) AS never_horror
FROM customer c
LEFT JOIN (
  SELECT r.customer_id
  FROM rental r
  JOIN inventory i ON i.inventory_id = r.inventory_id
  JOIN film_category fc ON fc.film_id = i.film_id
  JOIN category cat ON cat.category_id = fc.category_id AND cat.name = 'Horror'
) h ON h.customer_id = c.customer_id
WHERE h.customer_id IS NULL;
```

Both return the same customers.

## Part 2: every (relational division)

"Rented from every category" means: the number of **different categories** a customer has rented from equals the total number of categories.

```sql run
SELECT r.customer_id, COUNT(DISTINCT fc.category_id) AS categories_rented
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film_category fc ON fc.film_id = i.film_id
GROUP BY r.customer_id
HAVING COUNT(DISTINCT fc.category_id) = (SELECT COUNT(*) FROM category)
ORDER BY r.customer_id
LIMIT 5;
```

There are {{= SELECT COUNT(*) FROM category }} categories, so a customer must have rented from all of them.

### The array way

PostgreSQL can collect a customer's categories into an array and ask whether it **contains** the whole list, with `@>`:

```sql run
SELECT COUNT(*) AS customers
FROM (
  SELECT r.customer_id, array_agg(DISTINCT fc.category_id::int) AS cats
  FROM rental r
  JOIN inventory i ON i.inventory_id = r.inventory_id
  JOIN film_category fc ON fc.film_id = i.film_id
  GROUP BY r.customer_id
) x
WHERE cats @> (SELECT array_agg(category_id) FROM category);
```

## Try it yourself

Find customers who rented films from at least **12** different categories, and customers who never rented from `Comedy` or `Sports`.

## Watch out

### "Never" needs the whole customer list

If you `JOIN` first and filter afterwards, customers with **no rentals at all** disappear from the result before you can test them. Start from the `customer` table and use `NOT EXISTS` (or `LEFT JOIN`), so every customer is considered.

### COUNT DISTINCT, not COUNT

Without `DISTINCT`, a customer who rented five Horror films counts five times and would look like they covered five categories. Count **different** categories.

### Compare with a count from the source table

Write `= (SELECT COUNT(*) FROM category)` and not `= 16`. If a category is added later, the query stays correct.

### `NOT IN` with NULLs, one more time

Prefer `NOT EXISTS` over `NOT IN` for "never" questions, because a single `NULL` in the subquery makes `NOT IN` return nothing.

## Interview corner

**"Find customers who have never placed an order."**
`LEFT JOIN orders ... WHERE orders.id IS NULL`, or `NOT EXISTS`. Add that `NOT IN` is dangerous with `NULL`s.

**"Find customers who bought every product."**
Relational division: `GROUP BY customer HAVING COUNT(DISTINCT product) = (SELECT COUNT(*) FROM products)`.

**"How do you find a customer who bought A but not B?"**
`EXISTS` for A and `NOT EXISTS` for B, both correlated on the customer, or conditional aggregation: `HAVING COUNT(*) FILTER (WHERE product = 'A') > 0 AND COUNT(*) FILTER (WHERE product = 'B') = 0`.

## Practice

### Warm-up: never rented a Comedy

How many customers have **never** rented a `Comedy` film? Return one number, `no_comedy`.

```sql practice
-- hint: `NOT EXISTS` over rental -> inventory -> film_category -> category with `cat.name = 'Comedy'`.
SELECT COUNT(*) AS no_comedy
FROM customer c
WHERE NOT EXISTS (
  SELECT 1
  FROM rental r
  JOIN inventory i ON i.inventory_id = r.inventory_id
  JOIN film_category fc ON fc.film_id = i.film_id
  JOIN category cat ON cat.category_id = fc.category_id
  WHERE r.customer_id = c.customer_id AND cat.name = 'Comedy'
);
```

### Core: at least 15 categories

Show `customer_id` and `categories_rented` for customers who rented from **at least 15** different categories. Order by `categories_rented` descending, then `customer_id`, and show the first rows.

```sql practice
-- hint: `HAVING COUNT(DISTINCT fc.category_id) >= 15`.
SELECT r.customer_id, COUNT(DISTINCT fc.category_id) AS categories_rented
FROM rental r
JOIN inventory i ON i.inventory_id = r.inventory_id
JOIN film_category fc ON fc.film_id = i.film_id
GROUP BY r.customer_id
HAVING COUNT(DISTINCT fc.category_id) >= 15
ORDER BY categories_rented DESC, r.customer_id;
```

### Stretch: Action but not Horror

How many customers have rented at least one `Action` film but **never** a `Horror` film? Return one number, `action_not_horror`.

```sql practice
-- hint: `EXISTS` for Action and `NOT EXISTS` for Horror, or conditional aggregation with FILTER.
SELECT COUNT(*) AS action_not_horror
FROM (
  SELECT r.customer_id
  FROM rental r
  JOIN inventory i ON i.inventory_id = r.inventory_id
  JOIN film_category fc ON fc.film_id = i.film_id
  JOIN category cat ON cat.category_id = fc.category_id
  GROUP BY r.customer_id
  HAVING COUNT(*) FILTER (WHERE cat.name = 'Action') > 0 AND COUNT(*) FILTER (WHERE cat.name = 'Horror') = 0
) x;
```
