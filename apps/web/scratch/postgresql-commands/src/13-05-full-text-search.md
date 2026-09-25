---
title: "Full-Text Search"
order: 0
---

`LIKE '%word%'` finds letters, not meaning. **Full-text search** understands words: it ignores endings (`run`, `running`), skips filler words (`the`, `of`), ranks results by relevance, and can use a fast index. The `film` table already has a ready-made search column, `fulltext`.

## What you'll learn

- `tsvector`: a document prepared for searching
- `tsquery` and the match operator `@@`
- Ranking results and highlighting
- Indexing with GIN

## Syntax

```sql show
SELECT to_tsvector('english', 'text to search');
SELECT to_tsquery('english', 'cat & dog');
SELECT * FROM t WHERE tsv @@ websearch_to_tsquery('english', 'cat -dog');
```

## Examples

### What a tsvector looks like

`to_tsvector` turns text into normalised words (stems) with their positions. Note that `the` and `a` are dropped, and `running` became `run`:

```sql run
SELECT to_tsvector('english', 'The quick brown foxes were running away');
```

### The film's search column

`film.fulltext` was built from the title and description. Here is one:

```sql run
SELECT title, fulltext
FROM film
WHERE film_id = 1;
```

### Searching: @@

The `@@` operator asks "does this document match this query?". `&` means and, `|` or, `!` not:

```sql run
SELECT title
FROM film
WHERE fulltext @@ to_tsquery('english', 'astronaut & drama')
ORDER BY title
LIMIT 5;
```

### Friendly query text: websearch_to_tsquery

`websearch_to_tsquery` reads text the way a search box does: words are AND-ed, quotes make a phrase, `-` excludes, `or` means or:

```sql run
SELECT COUNT(*) AS matches
FROM film
WHERE fulltext @@ websearch_to_tsquery('english', 'mad scientist -teacher');
```

### Ranking by relevance

`ts_rank` scores how well a document matches, so the best results come first:

```sql run
SELECT title, round(ts_rank(fulltext, q)::numeric, 4) AS rank
FROM film, to_tsquery('english', 'epic & drama') AS q
WHERE fulltext @@ q
ORDER BY rank DESC, title
LIMIT 3;
```

### Highlighting

`ts_headline` shows the matching part of a text with the hits marked:

```sql run
SELECT ts_headline('english', description, to_tsquery('english', 'scientist'), 'StartSel=[, StopSel=]') AS excerpt
FROM film
WHERE film_id = 1;
```

### The index behind it

The lab's `film` table has a **GiST** index on `fulltext`. A **GIN** index is usually faster to search (slower to update):

```sql run
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'film' AND indexdef LIKE '%fulltext%';
```

### Searching without a prepared column

You can build the vector on the fly (fine for small tables), or store it in a generated column with an index for big ones:

```sql run destructive
CREATE TABLE article (
  article_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text,
  body text,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) STORED
);
CREATE INDEX idx_article_tsv ON article USING gin (tsv);

INSERT INTO article (title, body) VALUES
  ('Running shoes', 'A guide to choosing the best running shoes'),
  ('Cooking pasta', 'How long should you boil pasta?');

SELECT title FROM article WHERE tsv @@ websearch_to_tsquery('english', 'run shoe');
```

The search for `run shoe` matched "Running shoes": the words are compared by their stems.

## Try it yourself

Search the films for `crocodile` or `shark`, rank them, and show the description with the match highlighted.

## Watch out

### The language matters

The configuration (`'english'`) decides which words are stop words and how stems are made. Use the same configuration to build the vector and the query.

### A bare word can be a stop word

`to_tsquery('english', 'the')` produces an empty query and matches nothing. Very common words are ignored.

### to_tsquery is strict about syntax

`to_tsquery('english', 'mad scientist')` is a syntax error (missing operator). Use `&`, or `plainto_tsquery` / `websearch_to_tsquery` for free text.

### Keep the vector up to date

A stored `tsvector` column must be refreshed when the text changes. A generated column (as above) or a trigger does it for you. Building the vector inside the query never goes stale but cannot use an index.

### It is word search, not substring search

`fulltext @@ 'ast'` will not match `astronaut`. For prefix search write `'astro:*'`; for fuzzy or substring search use `pg_trgm` (Module 14).

## Interview corner

**"What is full-text search in PostgreSQL?"**
Searching documents by normalised words instead of characters: text is converted to a `tsvector`, the search to a `tsquery`, and `@@` matches them. It supports stemming, stop words, ranking and indexes.

**"How do you make full-text search fast?"**
Store the `tsvector` in a column (a generated column is ideal) and index it with GIN.

**"GIN or GiST for full-text search?"**
GIN is faster to search and slower to build and update; GiST is smaller and cheaper to update but slower to search. GIN is the usual choice for mostly-read data.

## Practice

### Warm-up: a simple search

Count the films whose `fulltext` matches the word `crocodile`, as `matches`. Use `to_tsquery('english', 'crocodile')`.

```sql practice
-- hint: `WHERE fulltext @@ to_tsquery('english', 'crocodile')`.
SELECT COUNT(*) AS matches FROM film WHERE fulltext @@ to_tsquery('english', 'crocodile');
```

### Core: both words

Show the `title` of films matching **both** `shark` and `crocodile`, alphabetical.

```sql practice
-- hint: `to_tsquery('english', 'shark & crocodile')`.
SELECT title FROM film WHERE fulltext @@ to_tsquery('english', 'shark & crocodile') ORDER BY title;
```

### Stretch: excluding a word

Count the films matching `drama` but **not** `teacher`, using `websearch_to_tsquery('english', 'drama -teacher')`, as `matches`.

```sql practice
-- hint: The `-` excludes a word.
SELECT COUNT(*) AS matches FROM film WHERE fulltext @@ websearch_to_tsquery('english', 'drama -teacher');
```
