---
title: "limit, skip and Pagination"
order: 0
---

Real applications show results a page at a time. `limit` says how many, `skip` says where to start, and a smarter technique called **keyset pagination** avoids the cost of skipping.

## What you'll learn

- `limit()` and `skip()`
- Offset pagination (page numbers)
- Why large skips are slow
- Keyset (range) pagination

## Syntax

```js show
db.collection.find(filter).sort(order).skip(n).limit(m)
db.collection.find({ _id: { $gt: lastSeenId } }).sort({ _id: 1 }).limit(m)
```

## Examples

### limit

```js run
db.films.find({}, { title: 1, _id: 0 }).sort({ title: 1 }).limit(3)
```

### skip and limit: page 2

With a page size of 3, page 2 skips the first 3:

```js run
db.films.find({}, { title: 1, _id: 0 }).sort({ title: 1 }).skip(3).limit(3)
```

### A small paging function

```js run
function page(n, size) {
  return db.films.find({}, { title: 1, _id: 0 }).sort({ title: 1, _id: 1 }).skip((n - 1) * size).limit(size).toArray().map((d) => d.title)
}
[page(1, 2), page(2, 2), page(500, 2)]
```

### How many pages are there?

```js run
Math.ceil(db.films.countDocuments() / 20)
```

### Keyset pagination

Instead of counting rows to skip, remember the last value you showed and ask for what comes after it. `_id` works because it is unique and indexed:

```js run
const first = db.films.find({}, { title: 1 }).sort({ _id: 1 }).limit(3).toArray();
const last = first[first.length - 1]._id;
const next = db.films.find({ _id: { $gt: last } }, { title: 1 }).sort({ _id: 1 }).limit(3).toArray();
[first.map((d) => d._id), next.map((d) => d._id)]
```

To page by a non-unique field such as `title`, use the pair (title, _id):

```js run
const lastRow = { title: "ACE GOLDFINGER", _id: 3 }
db.films.find({ $or: [{ title: { $gt: lastRow.title } }, { title: lastRow.title, _id: { $gt: lastRow._id } }] }, { title: 1 }).sort({ title: 1, _id: 1 }).limit(2)
```

### limit(0) means no limit

```js run
db.films.find({ rating: "G" }).limit(0).toArray().length
```

## Try it yourself

Show pages 1, 2 and 3 of the `Action` films (page size 5, ordered by title) with `skip` and `limit`. Then do the same with keyset pagination on `_id`.

## Watch out

### Skip cost grows with the offset

`skip(100000)` still reads and throws away 100000 documents. Fine for the first few pages, slow for deep pages. Keyset pagination stays fast.

### Without a full sort, pages overlap or miss items

If the sort is not deterministic (ties), a document can appear on two pages or on none. Always end the sort with `_id`.

### Data changes between requests

With offset paging, an insert or delete between two page requests shifts everything. Keyset paging is more stable.

### The order of `sort`, `skip` and `limit` in code does not matter

MongoDB always applies sort, then skip, then limit, whatever order you write them in.

## Interview corner

**"How do you paginate results in MongoDB?"**
With `sort().skip((page - 1) * size).limit(size)`, or better, with a range query on an indexed unique key (`_id`) that resumes after the last item seen.

**"Why is `skip` a problem for deep pages?"**
The server must find and discard all skipped documents, so the cost grows with the offset.

**"Do `limit` and `skip` order matter?"**
No. The server always sorts first, then skips, then limits.

## Practice

### Warm-up: first 5

Return the titles of the first 5 films alphabetically.

```js practice
// hint: `sort({ title: 1 }).limit(5)` and map to titles.
db.films.find({}, { title: 1, _id: 0 }).sort({ title: 1 }).limit(5).toArray().map((d) => d.title)
```

### Core: page 4

With a page size of 5, return the titles on page 4 (ordered by title).

```js practice
// hint: `skip((4 - 1) * 5)`.
db.films.find({}, { title: 1, _id: 0 }).sort({ title: 1 }).skip(15).limit(5).toArray().map((d) => d.title)
```

### Stretch: keyset

Return the `_id` values of the 3 films after `_id` 500 (ascending by `_id`).

```js practice
// hint: `{ _id: { $gt: 500 } }`, sort, limit.
db.films.find({ _id: { $gt: 500 } }, { _id: 1 }).sort({ _id: 1 }).limit(3).toArray().map((d) => d._id)
```
