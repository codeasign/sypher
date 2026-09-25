---
title: "$push Modifiers: $each, $position, $slice, $sort"
order: 0
---

A plain `$push` adds one value. Its **modifiers** turn it into a small toolbox: add several values, insert at a chosen position, keep only the newest N, and keep the array sorted. Together they make "latest 5 items" lists a single update.

## What you'll learn

- `$each` to push many values
- `$position` to insert at an index
- `$slice` to cap the array's length
- `$sort` to keep it ordered, and combining all four

## Syntax

```js show
{ $push: { list: { $each: [ ... ], $position: 0, $slice: -5, $sort: { score: -1 } } } }
```

## Examples

```js run destructive
const lab = db.getSiblingDB("lab_modifiers")
lab.boards.insertOne({ _id: 1, recent: [10, 20], top: [] });
lab.boards.countDocuments()
```

### $each: several at once

```js run destructive
lab.boards.updateOne({ _id: 1 }, { $push: { recent: { $each: [30, 40] } } })
lab.boards.findOne({ _id: 1 }).recent
```

Without `$each`, an array would be pushed as **one nested element**:

```js run destructive
lab.boards.updateOne({ _id: 1 }, { $push: { nested: [1, 2] } })
lab.boards.findOne({ _id: 1 }).nested
```

### $position: insert at an index

```js run destructive
lab.boards.updateOne({ _id: 1 }, { $push: { recent: { $each: [5], $position: 0 } } })
lab.boards.findOne({ _id: 1 }).recent
```

### $slice: keep only N

A positive number keeps the **first** N, a negative number keeps the **last** N:

```js run destructive
lab.boards.updateOne({ _id: 1 }, { $push: { recent: { $each: [50, 60], $slice: -4 } } })
lab.boards.findOne({ _id: 1 }).recent
```

### A "latest 3" list

Push the newest to the front and keep only three. This pattern needs no read and never grows:

```js run destructive
for (const v of ["a", "b", "c", "d", "e"]) lab.boards.updateOne({ _id: 1 }, { $push: { latest: { $each: [v], $position: 0, $slice: 3 } } });
lab.boards.findOne({ _id: 1 }).latest
```

### $sort: keep it ordered

Sort by a number, or by a field of the embedded documents. Here a top-3 leaderboard:

```js run destructive
for (const [n, s] of [["ann", 50], ["bob", 80], ["cy", 65], ["di", 90], ["ed", 40]]) {
  lab.boards.updateOne({ _id: 1 }, { $push: { top: { $each: [{ name: n, score: s }], $sort: { score: -1 }, $slice: 3 } } });
}
lab.boards.findOne({ _id: 1 }).top
```

### The order of the modifiers

MongoDB always applies them in the same order, whatever you write: `$each`, then `$position`, then `$sort`, then `$slice`. So the sort happens before the cut.

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Keep a per-user "last 5 searches" list where the newest search is first and duplicates are allowed. Then change it to remove duplicates by using `$addToSet` and think about what you lose.

## Watch out

### `$slice` alone needs `$each`

You cannot write `{ $push: { a: { $slice: 3 } } }` without `$each` (an empty `$each: []` works for trimming only).

### `$sort` on simple values

For an array of numbers use `$sort: 1` or `-1`. For documents use `$sort: { field: 1 }`.

### `$position` with a too-large index

If the position is beyond the end, the values are appended.

### A capped array is not a queue

`$slice` throws away data permanently. If you need history, write to a separate collection too.

## Interview corner

**"How do you keep only the last N items of an array?"**
`$push` with `$each` and a negative `$slice`: `{ $push: { list: { $each: [x], $slice: -N } } }`.

**"In what order are `$push` modifiers applied?"**
`$each`, `$position`, `$sort`, then `$slice`.

**"How would you keep a top-K leaderboard inside a document?"**
`$push` with `$each`, `$sort: { score: -1 }` and `$slice: K`.

## Practice

### Warm-up: push many

Insert `{ _id: 1, a: [1] }` and push 2, 3 and 4 in one update. Return `a`.

```js practice destructive
// hint: `$each`.
const lab = db.getSiblingDB("lab_modifiers")
lab.t.insertOne({ _id: 1, a: [1] });
lab.t.updateOne({ _id: 1 }, { $push: { a: { $each: [2, 3, 4] } } });
const a = lab.t.findOne({ _id: 1 }).a
lab.dropDatabase();
a
```

### Core: latest two

Push the values 1 to 5 one at a time onto an array, keeping only the last two, and return the array.

```js practice destructive
// hint: `$each: [v], $slice: -2`.
const lab = db.getSiblingDB("lab_modifiers")
lab.t.insertOne({ _id: 1, a: [] });
for (let v = 1; v <= 5; v++) lab.t.updateOne({ _id: 1 }, { $push: { a: { $each: [v], $slice: -2 } } });
const a = lab.t.findOne({ _id: 1 }).a
lab.dropDatabase();
a
```

### Stretch: sorted top two

Push the scores 30, 90, 10, 70 one at a time so that the array holds only the two highest, in descending order.

```js practice destructive
// hint: `$sort: -1` then `$slice: 2`.
const lab = db.getSiblingDB("lab_modifiers")
lab.t.insertOne({ _id: 1, top: [] });
for (const s of [30, 90, 10, 70]) lab.t.updateOne({ _id: 1 }, { $push: { top: { $each: [s], $sort: -1, $slice: 2 } } });
const t = lab.t.findOne({ _id: 1 }).top
lab.dropDatabase();
t
```
