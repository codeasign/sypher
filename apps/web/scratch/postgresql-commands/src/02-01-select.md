---
title: "SELECT"
order: 0
---

`SELECT` reads data from a table. It is the command you will use more than all the others put together.
## What you'll learn

- Choosing which columns to see
- `SELECT *` and why to be careful with it
- Doing calculations inside a query
- Running a query with no table at all

## Syntax

```sql show
SELECT column1, column2
FROM table_name;
```

`SELECT` lists what you want to see. `FROM` names the table to read it from. The semicolon ends the statement.

## Examples

### Pick your columns

Just the first and last name of every actor:

```sql run
SELECT first_name, last_name
FROM actor;
```

There are {{= SELECT COUNT(*) FROM actor }} actors, but only the first few rows are shown here. In your lab, all of them scroll by.

The columns appear in the order you list them, not the order they are stored in the table:

```sql run
SELECT last_name, first_name
FROM actor;
```

### SELECT *

`*` means "every column":

```sql run
SELECT *
FROM category;
```

### Calculations

`SELECT` can do arithmetic on the values it reads. Here is each film's running time in hours:

```sql run
SELECT title, length, length / 60.0
FROM film;
```

The last column has an ugly name, because PostgreSQL just called it `?column?`. You will fix that on the next page with an *alias*.

### SELECT without a table

You can also run a calculation with no table at all:

```sql run
SELECT 2 + 3, upper('hello'), now() > '2000-01-01';
```

Notice `t` in the last column: PostgreSQL shows a true boolean as `t` and false as `f`.

## Try it yourself

Paste any query above into your lab and change the columns. Try `SELECT title, description FROM film;`.

## Watch out

### Avoid `SELECT *` in real work

`SELECT *` is fine for a quick look. In an application or a report, list the columns you need:

- It reads and sends every column, including big ones like `description`, which is slower.
- If someone adds or reorders a column later, code that depended on the old shape breaks.

### A typo in a column name is an error

```sql run error
SELECT titel FROM film;
```

PostgreSQL points at the word it could not find, and often suggests the right one. Read the message: most SQL mistakes are explained in it.

### Whole-number division is whole

`length / 60` with two whole numbers gives a whole number in PostgreSQL (`86 / 60` is `1`). We wrote `60.0` above to get decimals.

## Interview corner

**"Why is `SELECT *` discouraged in production code?"**
It fetches columns you don't need (more data, slower), it stops a query being answered from an index alone, and it makes code fragile when the table's columns change.

**"Can `SELECT` be used without `FROM`?"**
Yes, for expressions and functions, such as `SELECT now();`. (PostgreSQL has no `DUAL` table, and does not need one.)

## Practice

### Warm-up: all the categories

Show the `name` of every film category.

```sql practice
-- hint: The table is `category`, and the column is `name`.
SELECT name
FROM category;
```

### Core: film prices

Show the `title`, `rental_rate` and `replacement_cost` of every film.

```sql practice
-- hint: Three columns, separated by commas, from the `film` table.
SELECT title, rental_rate, replacement_cost
FROM film;
```

### Stretch: the price of a minute

For every film, show its `title` and the rental price **per minute** of running time (`rental_rate` divided by `length`).

```sql practice
-- hint: `rental_rate / length` is the price per minute. It is fine that the column name is ugly for now.
SELECT title, rental_rate / length
FROM film;
```
