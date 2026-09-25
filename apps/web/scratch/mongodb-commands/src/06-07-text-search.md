---
title: "Text Search with $text"
order: 0
---

Regular expressions match patterns. **Text search** matches words: it understands that "running" and "runs" share a stem, ignores common words such as "the", and ranks results by relevance. It needs a **text index**.

## What you'll learn

- Creating a text index
- Searching with `$text` and `$search`
- Phrases, negation and relevance scores
- The limits of `$text`

## Syntax

```js show
db.collection.createIndex({ field: "text" })
db.collection.find({ $text: { $search: "words here" } })
db.collection.find({ $text: { $search: "..." } }, { score: { $meta: "textScore" } })
```

## Examples

We work on a copy of the films in a scratch database, so the DVD Rental collection keeps its indexes:

```js run destructive
const lab = db.getSiblingDB("lab_text")
db.films.aggregate([{ $project: { title: 1, description: 1, "category.name": 1 } }, { $out: { db: "lab_text", coll: "films" } }]);
lab.films.countDocuments()
```

### Create a text index

One collection can have only one text index, but it may cover several fields, each with a weight:

```js run destructive
lab.films.createIndex({ title: "text", description: "text" }, { weights: { title: 10, description: 1 }, name: "films_text" })
```

### Search for words

Words are matched **any of them** (OR) by default:

```js run destructive
lab.films.find({ $text: { $search: "crocodile shark" } }, { title: 1, _id: 0 }).sort({ title: 1 }).limit(4)
```

### Rank by relevance

`textScore` says how well each document matches. Sort by it to put the best first:

```js run destructive
lab.films.find({ $text: { $search: "crocodile shark" } }, { title: 1, _id: 0, score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" }, title: 1 }).limit(3).toArray().map((d) => ({ title: d.title, score: Math.round(d.score * 100) / 100 }))
```

### A phrase

Put the words in escaped double quotes to require them together, in order:

```js run destructive
lab.films.find({ $text: { $search: "\"astounding epistle\"" } }, { title: 1, _id: 0 })
```

### Excluding a word

A minus sign removes documents containing the word:

```js run destructive
[
  lab.films.countDocuments({ $text: { $search: "crocodile" } }),
  lab.films.countDocuments({ $text: { $search: "crocodile -shark" } })
]
```

### Stemming and stop words

The default English analysis stems words, so "boats" also finds "boat", and it ignores stop words such as "a" and "the":

```js run destructive
[
  lab.films.countDocuments({ $text: { $search: "boat" } }),
  lab.films.countDocuments({ $text: { $search: "boats" } }),
  lab.films.countDocuments({ $text: { $search: "the" } })
]
```

### Combine with other filters

```js run destructive
lab.films.countDocuments({ $text: { $search: "crocodile" }, "category.name": "Drama" })
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

In a scratch copy, search for films about `dentist` OR `teacher`, then only for the phrase `"mad scientist"`, and sort by relevance.

## Watch out

### One text index per collection

A second `createIndex` with `"text"` fails. Put every searchable field into one index, or use Atlas Search for richer needs.

### `$text` is not a substring search

Searching for `croc` will not find "crocodile". Text search matches whole (stemmed) words. Use `$regex` for fragments.

### Language matters

The default language is English. A collection with other languages needs `default_language` or a per-document `language` field, otherwise stemming is wrong.

### `$text` must be the first stage of an aggregation

In `aggregate`, `$match` with `$text` has to be the first stage, and it cannot sit inside `$or` with non-indexed conditions.

### Text indexes are large and slow to build

Only index what you search, and build the index off-peak on big collections.

## Interview corner

**"What is the difference between `$regex` and `$text`?"**
`$regex` matches character patterns and cannot rank. `$text` matches stemmed words using a text index, ignores stop words and can return a relevance score.

**"How do you rank text search results?"**
Project `{ $meta: "textScore" }` and sort by it.

**"How many text indexes can a collection have?"**
One. It can cover several fields, with weights.

## Practice

### Warm-up: one word

How many scratch films mention `pastry`? (Create the copy and the index, count, then drop the database.)

```js practice destructive
// hint: `$out` a copy, `createIndex` with "text", `countDocuments` with `$text`.
const lab = db.getSiblingDB("lab_text")
db.films.aggregate([{ $project: { title: 1, description: 1 } }, { $out: { db: "lab_text", coll: "films" } }]);
lab.films.createIndex({ title: "text", description: "text" });
const n = lab.films.countDocuments({ $text: { $search: "pastry" } })
lab.dropDatabase();
n
```

### Core: excluding

Count the films that mention `boat` but not `dentist`.

```js practice destructive
// hint: `"boat -dentist"`.
const lab = db.getSiblingDB("lab_text")
db.films.aggregate([{ $project: { title: 1, description: 1 } }, { $out: { db: "lab_text", coll: "films" } }]);
lab.films.createIndex({ title: "text", description: "text" });
const n = lab.films.countDocuments({ $text: { $search: "boat -dentist" } })
lab.dropDatabase();
n
```

### Stretch: the best match

Return the `title` of the best match for `"astounding epistle"` (words, not phrase), using `textScore`, ties by title.

```js practice destructive
// hint: `sort({ score: { $meta: "textScore" }, title: 1 }).limit(1)`.
const lab = db.getSiblingDB("lab_text")
db.films.aggregate([{ $project: { title: 1, description: 1 } }, { $out: { db: "lab_text", coll: "films" } }]);
lab.films.createIndex({ title: "text", description: "text" });
const t = lab.films.find({ $text: { $search: "astounding epistle" } }, { title: 1, score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" }, title: 1 }).limit(1).toArray()[0].title
lab.dropDatabase();
t
```
