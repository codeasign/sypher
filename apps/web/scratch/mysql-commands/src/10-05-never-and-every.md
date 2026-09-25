---
title: "Interview Problem: Who Never, and Who Always"
order: 0
---

Two related questions come up all the time: "which customers have **never** done X?" and "which customers have done X for **every** Y?" The first is an anti-join. The second is called *relational division*, and it trips up many candidates.

## What you'll learn

- "Never" questions with `NOT EXISTS` and `LEFT JOIN`
- "Every" questions with `GROUP BY ... HAVING COUNT(DISTINCT ...)`
- How to check your answer

## The problem

1. Which customers have **never** rented a Horror film?
2. Which customers have rented films from **every** category?

## Part 1: never (anti-join)

Customers with **no** rental of a Horror film. The subquery follows the chain rental → inventory → film → category:

```sql run rows=6
SELECT c.customer_id, c.first_name, c.last_name
FROM customer AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  JOIN film_category AS fc ON fc.film_id = i.film_id
  JOIN category AS cat ON cat.category_id = fc.category_id
  WHERE r.customer_id = c.customer_id
    AND cat.name = 'Horror'
)
ORDER BY c.customer_id;
```

The `LEFT JOIN` version puts the Horror condition **in the ON** and looks for the missing side:

```sql run rows=6
SELECT c.customer_id, c.first_name, c.last_name
FROM customer AS c
LEFT JOIN (
  SELECT DISTINCT r.customer_id
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  JOIN film_category AS fc ON fc.film_id = i.film_id
  JOIN category AS cat ON cat.category_id = fc.category_id
  WHERE cat.name = 'Horror'
) AS horror_renters ON horror_renters.customer_id = c.customer_id
WHERE horror_renters.customer_id IS NULL
ORDER BY c.customer_id;
```

Both return the same {{= SELECT COUNT(*) FROM customer c WHERE NOT EXISTS (SELECT 1 FROM rental r JOIN inventory i ON i.inventory_id = r.inventory_id JOIN film_category fc ON fc.film_id = i.film_id JOIN category cat ON cat.category_id = fc.category_id WHERE r.customer_id = c.customer_id AND cat.name = 'Horror') }} customers.

## Part 2: every (relational division)

"Rented from every category" means: the number of **different categories** a customer has rented from equals the total number of categories.

```sql run rows=6
SELECT r.customer_id, COUNT(DISTINCT fc.category_id) AS categories_rented
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film_category AS fc ON fc.film_id = i.film_id
GROUP BY r.customer_id
HAVING COUNT(DISTINCT fc.category_id) = (SELECT COUNT(*) FROM category)
ORDER BY r.customer_id;
```

There are {{= SELECT COUNT(*) FROM category }} categories, so a customer must have rented from all {{= SELECT COUNT(*) FROM category }}.

### How many qualify?

```sql run
SELECT COUNT(*) AS customers_who_rented_every_category
FROM (
  SELECT r.customer_id
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  JOIN film_category AS fc ON fc.film_id = i.film_id
  GROUP BY r.customer_id
  HAVING COUNT(DISTINCT fc.category_id) = (SELECT COUNT(*) FROM category)
) AS q;
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
`EXISTS` for A and `NOT EXISTS` for B, both correlated on the customer, or conditional aggregation: `HAVING SUM(product = 'A') > 0 AND SUM(product = 'B') = 0`.

## Practice

### Warm-up: never rented a Comedy

How many customers have **never** rented a `Comedy` film? Return one number, `no_comedy`.

```sql practice
-- hint: `NOT EXISTS` with the rental → inventory → film_category → category chain and `cat.name = 'Comedy'`.
SELECT COUNT(*) AS no_comedy
FROM customer AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  JOIN film_category AS fc ON fc.film_id = i.film_id
  JOIN category AS cat ON cat.category_id = fc.category_id
  WHERE r.customer_id = c.customer_id AND cat.name = 'Comedy'
);
```

### Core: at least 15 categories

Show `customer_id` and `categories_rented` for customers who rented from **at least 15** different categories. Order by `categories_rented` descending, then `customer_id`, and show the first rows.

```sql practice rows=5
-- hint: The "every" query with `>= 15`.
SELECT r.customer_id, COUNT(DISTINCT fc.category_id) AS categories_rented
FROM rental AS r
JOIN inventory AS i ON i.inventory_id = r.inventory_id
JOIN film_category AS fc ON fc.film_id = i.film_id
GROUP BY r.customer_id
HAVING COUNT(DISTINCT fc.category_id) >= 15
ORDER BY categories_rented DESC, r.customer_id;
```

### Stretch: Action but not Horror

How many customers have rented at least one `Action` film but **never** a `Horror` film? Return one number, `action_not_horror`.

```sql practice
-- hint: Conditional aggregation per customer: `SUM(cat.name = 'Action') > 0 AND SUM(cat.name = 'Horror') = 0`.
SELECT COUNT(*) AS action_not_horror
FROM (
  SELECT r.customer_id
  FROM rental AS r
  JOIN inventory AS i ON i.inventory_id = r.inventory_id
  JOIN film_category AS fc ON fc.film_id = i.film_id
  JOIN category AS cat ON cat.category_id = fc.category_id
  GROUP BY r.customer_id
  HAVING SUM(cat.name = 'Action') > 0 AND SUM(cat.name = 'Horror') = 0
) AS q;
```
