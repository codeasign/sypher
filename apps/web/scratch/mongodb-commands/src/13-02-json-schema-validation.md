---
title: "Schema Validation with $jsonSchema"
order: 0
---

MongoDB is schema-flexible, not schema-free: you can attach **rules** to a collection so that bad documents are rejected on insert and update. The rules are written in `$jsonSchema`, and this database uses them on all three collections.

## What you'll learn

- Reading the validator of a real collection
- Writing rules: required fields, types, ranges, enums, patterns
- What a failed validation looks like, and how to read it
- Nested documents and arrays in a schema

## Syntax

```js show
db.createCollection("users", { validator: { $jsonSchema: {
  bsonType: "object",
  required: ["email", "age"],
  properties: {
    email: { bsonType: "string", pattern: "^.+@.+$" },
    age: { bsonType: "int", minimum: 0, maximum: 150 },
    plan: { enum: ["free", "pro"] }
  },
  additionalProperties: true
} } })
```

## Examples

### The validator of the films collection

The rules cover the required fields and the types of twelve properties (note that `rating` itself is not restricted by the schema):

```js run
const v = db.getCollectionInfos({ name: "films" })[0].options.validator.$jsonSchema;
({ required: v.required.slice().sort(), rentalRate: v.properties.rentalRate, ruled: Object.keys(v.properties).length })
```

### Create a collection with rules

```js run destructive
const lab = db.getSiblingDB("lab_schema")
lab.createCollection("users", { validator: { $jsonSchema: {
  bsonType: "object",
  required: ["email", "age"],
  properties: {
    email: { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+$", description: "an email address" },
    age: { bsonType: "int", minimum: 0, maximum: 150 },
    plan: { enum: ["free", "pro"] },
    tags: { bsonType: "array", maxItems: 3, items: { bsonType: "string" } },
    address: { bsonType: "object", required: ["country"], properties: { country: { bsonType: "string", minLength: 2 } } }
  }
} } })
```

### A valid document is accepted

```js run destructive
lab.users.insertOne({ email: "ann@x.com", age: NumberInt(31), plan: "pro", tags: ["a"], address: { country: "NO" } })
```

### A missing required field

```js run destructive error
lab.users.insertOne({ email: "bob@x.com" })
```

The error lists which rule failed: `required` and the missing property.

### The wrong type

`age` must be an `int`. A fraction is stored as a double, so it is refused:

```js run destructive error
lab.users.insertOne({ email: "cy@x.com", age: 31.5 })
```

### Out of range, bad pattern, bad enum

```js run destructive error
lab.users.insertOne({ email: "not-an-email", age: NumberInt(200), plan: "gold" })
```

### Rules for arrays and nested documents

Too many tags and a too-short country code are refused:

```js run destructive error
lab.users.insertOne({ email: "di@x.com", age: NumberInt(20), tags: ["a", "b", "c", "d"], address: { country: "N" } })
```

### Extra fields are allowed by default

Unless you set `additionalProperties: false`, documents may carry fields the schema does not mention:

```js run destructive
lab.users.insertOne({ email: "ed@x.com", age: NumberInt(40), favouriteColour: "blue" })
```

### Updates are validated too

```js run destructive error
lab.users.updateOne({ email: "ann@x.com" }, { $set: { age: NumberInt(-5) } })
```

### Validation as a query

The same `$jsonSchema` can be used in a `find` to list documents that **break** the rules, which is how you audit existing data:

```js run destructive
lab.getCollection("users").find({ $nor: [{ $jsonSchema: { required: ["plan"] } }] }, { email: 1, _id: 0 }).sort({ email: 1 }).toArray()
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Write a schema for an `orders` collection: `total` a decimal or double at least 0, `status` one of four values, `items` a non-empty array of documents with `sku` and `qty`. Insert one good and three bad documents.

## Watch out

### `bsonType` versus JSON `type`

Use `bsonType` (`"int"`, `"double"`, `"date"`, `"objectId"`). The JSON names (`"number"`, `"integer"`) are accepted but less exact.

### Fractions and large numbers are doubles

An `int` rule refuses `31.5`, and also a whole number above 2,147,483,647, which is stored as a double. Use `NumberLong` for big integers, or allow `["int", "long", "double"]` with `bsonType`.

### `additionalProperties: false` blocks `_id` unless listed

If you forbid extra fields, include `_id` in `properties`.

### Existing documents are not checked when you add a validator

Validation applies to new writes. Audit old data with the `$jsonSchema` query above.

### Error details are for developers

The `errInfo.details` explains the failing rule. Do not show raw errors to end users.

## Interview corner

**"How do you enforce a schema in MongoDB?"**
With a `$jsonSchema` validator on the collection (set at creation or with `collMod`), with rules for required fields, types, ranges, enums and patterns.

**"Does adding a validator check existing documents?"**
No, only inserts and updates afterwards (depending on the validation level). Audit existing data with a query using `$jsonSchema`.

**"What happens when a document fails validation?"**
By default the write is rejected with a "Document failed validation" error that says which rule failed.

## Practice

### Warm-up: read the rule

Return the `bsonType` that the real validator requires for the film field `rentalRate`.

```js practice
// hint: `properties.rentalRate.bsonType`.
db.getCollectionInfos({ name: "films" })[0].options.validator.$jsonSchema.properties.rentalRate.bsonType
```

### Core: a rule and a violation

Create a collection with `qty` required as an `int` at least 1. Return the error `code` of inserting `{ qty: 0 }` (a number).

```js practice destructive
// hint: Document validation failures have code 121.
const lab = db.getSiblingDB("lab_schema")
lab.createCollection("c", { validator: { $jsonSchema: { bsonType: "object", required: ["qty"], properties: { qty: { bsonType: "int", minimum: 1 } } } } });
let code = null
try { lab.c.insertOne({ qty: NumberInt(0) }) } catch (e) { code = e.code }
lab.dropDatabase();
code
```

### Stretch: audit

With a scratch collection holding `{ a: 1 }`, `{ a: "x" }`, `{}`, return the number of documents whose `a` is **not** a number, using `$jsonSchema`.

```js practice destructive
// hint: `$nor` with `$jsonSchema: { properties: { a: { bsonType: "number" } }, required: ["a"] }`.
const lab = db.getSiblingDB("lab_schema")
lab.t.insertMany([{ a: 1 }, { a: "x" }, {}]);
const n = lab.t.countDocuments({ $nor: [{ $jsonSchema: { required: ["a"], properties: { a: { bsonType: "number" } } } }] })
lab.dropDatabase();
n
```
