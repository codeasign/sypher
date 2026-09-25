---
title: "Expressions: Strings, Numbers, Dates and Conditions"
order: 0
---

Stages decide the flow; **expressions** compute the values inside them. The same expressions work in `$project`, `$set`, `$group`, `$match` (through `$expr`) and in update pipelines. Learn them once and you can use them everywhere.

## What you'll learn

- String expressions: `$concat`, `$substrCP`, `$toUpper`, `$split`, `$regexMatch`
- Number expressions: `$add`, `$multiply`, `$round`, `$abs`, `$mod`
- Conditions: `$cond`, `$switch`, `$ifNull`
- Dates: converting text to dates and extracting parts
- Type conversion: `$toInt`, `$toString`, `$convert`

## Syntax

```js show
{ $concat: ["$a", " ", "$b"] }
{ $cond: [ <condition>, <then>, <else> ] }
{ $switch: { branches: [ { case: <cond>, then: <value> } ], default: <value> } }
{ $ifNull: ["$maybe", "fallback"] }
```

## Examples

### Strings

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: {
      _id: 0,
      lower: { $toLower: "$title" },
      first3: { $substrCP: ["$title", 0, 3] },
      words: { $split: ["$title", " "] },
      length: { $strLenCP: "$title" },
      label: { $concat: ["$title", " [", "$rating", "]"] }
  } }
])
```

### Pattern tests and splitting

```js run
db.films.aggregate([
  { $match: { _id: { $lte: 3 } } },
  { $project: { _id: 0, title: 1, hasSaurus: { $regexMatch: { input: "$title", regex: /SAUR/ } }, firstWord: { $arrayElemAt: [{ $split: ["$title", " "] }, 0] } } }
])
```

### Numbers

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: {
      _id: 0,
      hours: { $round: [{ $divide: ["$lengthMinutes", 60] }, 2] },
      double: { $multiply: ["$rentalRate", 2] },
      diff: { $round: [{ $abs: { $subtract: ["$replacementCost", 20] } }, 2] },
      odd: { $mod: ["$lengthMinutes", 2] },
      capped: { $min: ["$replacementCost", 15] }
  } }
])
```

### Conditions: $cond and $switch

```js run
db.films.aggregate([
  { $match: { _id: { $lte: 3 } } },
  { $project: {
      _id: 0,
      title: 1,
      length: { $cond: [{ $gte: ["$lengthMinutes", 60] }, "feature", "short"] },
      price: { $switch: { branches: [
        { case: { $eq: ["$rentalRate", 0.99] }, then: "budget" },
        { case: { $eq: ["$rentalRate", 2.99] }, then: "standard" }
      ], default: "premium" } }
  } },
  { $sort: { title: 1 } }
])
```

### Conditional counting

`$sum` with `$cond` counts only what matches, so one `$group` can produce several counts:

```js run
db.films.aggregate([
  { $group: {
      _id: "$rating",
      films: { $sum: 1 },
      long: { $sum: { $cond: [{ $gt: ["$lengthMinutes", 120] }, 1, 0] } },
      cheap: { $sum: { $cond: [{ $eq: ["$rentalRate", 0.99] }, 1, 0] } }
  } },
  { $sort: { _id: 1 } }
])
```

### Missing and null values: $ifNull

`originalLanguage` is `null` for every film. Give it a default in the output:

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, title: 1, original: { $ifNull: ["$originalLanguage.name", "same as language"] } } }
])
```

### Dates: text to a real date

The dates here are strings. Convert, then use the date functions:

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $unwind: "$rentals" },
  { $limit: 2 },
  { $project: {
      _id: 0,
      rentalId: "$rentals.rentalId",
      at: { $dateFromString: { dateString: "$rentals.rentalDate", format: "%Y-%m-%d %H:%M:%S" } }
  } },
  { $project: { rentalId: 1, year: { $year: "$at" }, month: { $month: "$at" }, weekday: { $dayOfWeek: "$at" }, hour: { $hour: "$at" }, day: { $dateToString: { date: "$at", format: "%Y-%m-%d" } } } }
])
```

### Rentals per month

Combine conversion and grouping into a monthly report:

```js run
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: { $substrCP: ["$rentals.rentalDate", 0, 7] }, rentals: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

### Date arithmetic

How many days was each of three rentals out? `$dateDiff` subtracts dates:

```js run
db.customers.aggregate([
  { $match: { _id: 1 } },
  { $unwind: "$rentals" },
  { $match: { "rentals.returnDate": { $ne: null } } },
  { $limit: 3 },
  { $project: { _id: 0, rentalId: "$rentals.rentalId", days: { $toInt: { $dateDiff: {
      startDate: { $dateFromString: { dateString: "$rentals.rentalDate" } },
      endDate: { $dateFromString: { dateString: "$rentals.returnDate" } },
      unit: "day" } } } } }
])
```

### Type conversion

`$toString`, `$toInt`, `$toDouble` fail on bad input. `$convert` lets you supply a fallback:

```js run
db.films.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, asText: { $toString: "$rentalRate" }, asInt: { $toInt: "$rentalRate" }, safe: { $convert: { input: "$title", to: "int", onError: -1 } } } }
])
```

## Try it yourself

Write a pipeline that returns the number of rentals per weekday (1 = Sunday) for all customers, using `$dayOfWeek` on the converted dates.

## Watch out

### Expressions use `$` for field paths, `$$` for variables

`"$title"` reads a field. `"$$ROOT"`, `"$$this"` and variables you define with `let` use two dollars.

### `$cond` needs all three parts

`[ condition, then, else ]`. A missing else is an error. For many branches use `$switch`.

### Comparison in `$expr` follows BSON type order

Comparing a number to a string in an expression does not fail, it just follows the type order. Check field types first.

### Dates need real date values

`$year` on a text date raises an error. Convert with `$dateFromString` (or fix the data once with an update pipeline).

### `$substrCP` counts characters, `$substrBytes` counts bytes

Use `$substrCP` for text with accents or non-Latin characters.

## Interview corner

**"How do you write an if/else in an aggregation?"**
With `$cond: [condition, thenValue, elseValue]`, or `$switch` for several branches.

**"How do you handle null or missing values in an expression?"**
`$ifNull: [expression, fallback]`.

**"How do you get the month of a text date?"**
Convert with `$dateFromString` and then `$month`, or, for `YYYY-MM-DD` text, take the substring.

## Practice

### Warm-up: a label

For film 3, return `title` and `size`: `"long"` if `lengthMinutes` is at least 100, else `"short"`.

```js practice
// hint: `$cond`.
db.films.aggregate([{ $match: { _id: 3 } }, { $project: { _id: 0, title: 1, size: { $cond: [{ $gte: ["$lengthMinutes", 100] }, "long", "short"] } } }])
```

### Core: conditional counts

For each `rentalRate`, count all films and the ones rated `G`, in one `$group`.

```js practice
// hint: `$sum` with `$cond`.
db.films.aggregate([
  { $group: { _id: "$rentalRate", films: { $sum: 1 }, g: { $sum: { $cond: [{ $eq: ["$rating", "G"] }, 1, 0] } } } },
  { $sort: { _id: 1 } }
])
```

### Stretch: rentals by weekday

Rentals per weekday (1 = Sunday to 7 = Saturday) across all customers, ordered by weekday.

```js practice
// hint: `$dateFromString` then `$dayOfWeek`, then `$group`.
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $project: { d: { $dayOfWeek: { $dateFromString: { dateString: "$rentals.rentalDate" } } } } },
  { $group: { _id: "$d", rentals: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```
