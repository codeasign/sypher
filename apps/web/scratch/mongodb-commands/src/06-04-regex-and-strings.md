---
title: "Regular Expressions and String Matching"
order: 0
---

MongoDB has no `LIKE`. Instead, you match text with regular expressions using `$regex` or a JavaScript-style `/pattern/`. They are powerful, but their speed depends heavily on how you write them.

## What you'll learn

- `$regex` and `/pattern/` literals
- Anchors, case-insensitive matching and other options
- Which patterns can use an index
- Escaping special characters

## Syntax

```js show
{ field: /pattern/i }
{ field: { $regex: "pattern", $options: "i" } }
{ field: { $regex: /^start/ } }
```

## Examples

### Starts with, ends with, contains

```js run
[
  db.films.countDocuments({ title: /^ZO/ }),
  db.films.countDocuments({ title: /ER$/ }),
  db.films.countDocuments({ title: /DRAGON/ })
]
```

### Case-insensitive

The `i` option ignores case:

```js run
[db.films.countDocuments({ title: /dragon/ }), db.films.countDocuments({ title: /dragon/i })]
```

### The $regex form

Use it when the pattern is built from a string or a variable:

```js run
const word = "SPACE"
db.films.find({ title: { $regex: word } }, { title: 1, _id: 0 }).sort({ title: 1 })
```

### Character classes and alternation

```js run
db.films.find({ title: /^(ZO|ZE)/ }, { title: 1, _id: 0 }).sort({ title: 1 })
```

```js run
db.films.countDocuments({ title: /^[A-C][AEIOU]/ })
```

### Whole words

`\b` marks a word boundary. Without it, `CAT` would also match inside `CATCH`:

```js run
[db.films.countDocuments({ title: /CAT/ }), db.films.countDocuments({ title: /\bCAT\b/ })]
```

### Searching in a nested field

```js run
db.customers.find({ "name.last": /^SMI/ }, { "name.first": 1, "name.last": 1, _id: 0 }).sort({ "name.last": 1, "name.first": 1 })
```

### Searching inside arrays

```js run
db.films.countDocuments({ specialFeatures: /Scene/ })
```

### Escaping special characters

A dot means "any character". To match a real dot, escape it. Escape user input with a helper before using it in a pattern:

```js run
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
[esc("a.b*c"), new RegExp("^" + esc("a.b")).test("a.b"), new RegExp("^" + esc("a.b")).test("axb")]
```

### Is the pattern indexed?

An index on `title` helps only an **anchored, case-sensitive** prefix. Count how many index entries the server had to examine (the film collection has 1000):

```js run
[
  db.films.find({ title: /^ZO/ }).explain("executionStats").executionStats.totalKeysExamined,
  db.films.find({ title: /DRAGON/ }).explain("executionStats").executionStats.totalKeysExamined
]
```

## Try it yourself

Find the films whose title contains both `LOVE` and `STORY` in any order (two conditions), and the customers whose last name starts with `MC` or `MAC`.

## Watch out

### A leading wildcard scans everything

`/DRAGON/` cannot use an index on `title` to narrow the search, so the server reads every document. For real text search use a text index (a later page) or Atlas Search.

### Case-insensitive patterns skip the index

`/^zo/i` cannot use a normal index efficiently. Store a lower-cased copy of the field, or use a collation index.

### Untrusted input in a pattern is dangerous

A pattern such as `(a+)+$` can make the regular expression engine run for a very long time. Escape user input, or match with `$eq` when you only need equality.

### `$regex` values are strings, `$options` is separate

`{ $regex: "/abc/i" }` is wrong: it looks for the literal slashes. Write `{ $regex: "abc", $options: "i" }`.

## Interview corner

**"What is MongoDB's equivalent of SQL `LIKE`?"**
Regular expressions: `{ field: /^abc/ }` for `LIKE 'abc%'`, `{ field: /abc/ }` for `LIKE '%abc%'`.

**"Which regex queries can use an index?"**
Case-sensitive expressions anchored to the start of the string (`/^abc/`). Others must scan the whole index or collection.

**"How do you do case-insensitive search efficiently?"**
Create an index with a case-insensitive collation and query with the same collation, or store a normalised lower-case field.

## Practice

### Warm-up: starts with

How many film titles start with `A`?

```js practice
// hint: `/^A/`.
db.films.countDocuments({ title: /^A/ })
```

### Core: contains, case-insensitive

How many film titles contain `love`, in any case?

```js practice
// hint: `/love/i`.
db.films.countDocuments({ title: /love/i })
```

### Stretch: two patterns

List (sorted) the titles that both start with `C` and end with `Y`.

```js practice
// hint: `/^C.*Y$/`.
db.films.find({ title: /^C.*Y$/ }, { title: 1, _id: 0 }).sort({ title: 1 }).toArray().map((d) => d.title)
```
