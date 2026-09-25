---
title: "NoSQL Injection and Writing Safe Queries"
order: 0
---

MongoDB queries are **documents**, not text, so classic SQL string injection does not apply. But there is a NoSQL version: when an application builds a query from user input without checking its **type**, an attacker can send an *operator* instead of a value and change the meaning of the query. This page shows the attack, the fix, and a checklist.

## What you'll learn

- How operator injection works (`{"$ne": null}` instead of a password)
- Validating and coercing input types
- The dangers of `$where`, `$function` and building queries by string
- Other hardening: least privilege, rate limits, schema validation

## Syntax

```js show
// Vulnerable: trusts the type of user input
db.users.findOne({ email: req.body.email, password: req.body.password })

// Safer: force strings
db.users.findOne({ email: String(req.body.email), password: String(req.body.password) })
```

## Examples

A scratch collection with two users, and a login function that is **vulnerable on purpose**:

```js run destructive
const lab = db.getSiblingDB("lab_inject")
lab.users.insertMany([{ _id: 1, email: "ann@x.com", password: "s3cret", role: "admin" }, { _id: 2, email: "bob@x.com", password: "hunter2", role: "user" }]);
const loginBad = (email, password) => { const u = lab.users.findOne({ email: email, password: password }); return u ? "logged in as " + u.email + " (" + u.role + ")" : "denied"; };
[loginBad("ann@x.com", "s3cret"), loginBad("ann@x.com", "wrong")]
```

### The attack

Web frameworks parse JSON bodies, so an attacker can send an **object** where a string was expected. `{ "$ne": null }` means "not null", which every password satisfies:

```js run destructive
loginBad("ann@x.com", { $ne: null })
```

No password needed. The same trick can log in as the first user of the collection without knowing the email:

```js run destructive
loginBad({ $gt: "" }, { $gt: "" })
```

### The fix: check types

Reject anything that is not a plain string, or coerce it:

```js run destructive
const loginGood = (email, password) => {
  if (typeof email !== "string" || typeof password !== "string") return "bad request";
  const u = lab.users.findOne({ email: email, password: password });
  return u ? "logged in as " + u.email : "denied";
};
[loginGood("ann@x.com", { $ne: null }), loginGood({ $gt: "" }, { $gt: "" }), loginGood("ann@x.com", "s3cret")]
```

### Even better: never compare passwords in the query

Store a salted hash, fetch the user **by email only**, and compare the hash in code. (Shown here with a placeholder, because hashing belongs to a library such as bcrypt or argon2.)

```js show
const user = db.users.findOne({ email: String(email) });
if (!user || !await verifyPassword(user.passwordHash, String(password))) throw new Error("denied");
```

### Operators hidden in other input

Any user-controlled value can be an object. A search field that becomes a filter is another entrance:

```js run destructive
const search = (term) => lab.users.find({ role: term }, { email: 1, _id: 0 }).toArray().map((d) => d.email);
[search("user"), search({ $ne: "nobody" })]
```

The second returns everyone. Validate the value against the allowed list:

```js run destructive
const searchSafe = (term) => ["admin", "user"].includes(term) ? lab.users.find({ role: term }, { email: 1, _id: 0 }).toArray().map((d) => d.email) : [];
[searchSafe("user"), searchSafe({ $ne: "nobody" })]
```

### Dangerous features: $where and $function

`$where` and `$function` run JavaScript built from a string. A user value inside that string is code injection:

```js run destructive
const bad = (name) => lab.users.find({ $where: "this.email == '" + name + "'" }).toArray().length;
[bad("ann@x.com"), bad("' || '1'=='1")]
```

The second call returned every user. Do not build `$where` from input. Use normal operators, which treat the input as **data**.

### Regular expressions from input

A user-supplied pattern can match too much or run very slowly (ReDoS). Escape it:

```js run destructive
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchEmail = (frag) => lab.users.find({ email: { $regex: escapeRe(frag) } }, { email: 1, _id: 0 }).toArray().map((d) => d.email);
[searchEmail("ann"), searchEmail(".*")]
```

### Clean up

```js run destructive
lab.dropDatabase()
```

## Try it yourself

Write a function that builds a filter from an HTTP query string such as `?rating=PG&minLength=100`, accepting only known keys and converting `minLength` with `Number`. Try to break it with `?rating[$ne]=x`.

## Watch out

### Frameworks turn `a[$ne]=x` into `{ a: { $ne: "x" } }`

Express with `qs`, and many others, parse brackets into objects. Do not assume a query-string value is a string.

### Validate at the boundary

Check input against a schema (types, allowed values, lengths) at the API layer, before it reaches the database. A schema validator in MongoDB is a second line, not the first.

### `$where` may be disabled

Many hosted services disable server-side JavaScript. Even where allowed, avoid it.

### Do not put secrets in queries

Passwords and tokens compared in the query can leak through logs and profiling. Compare hashes in code, or use constant-time comparison.

### Defence in depth

Least-privilege users, a network that only the application can reach, rate limiting on login, and audit logs reduce the damage when something slips through.

## Interview corner

**"What is NoSQL injection?"**
Supplying query operators (such as `$ne` or `$gt`) or JavaScript as input where the application expected a plain value, so the query matches more than intended.

**"How do you prevent it in MongoDB?"**
Validate and coerce input types (strings stay strings), avoid `$where`, `$function` and string-built queries, escape regular expressions, use least-privilege users, and compare password hashes in code.

**"Why is `$where` risky?"**
It runs JavaScript on the server built from a string, so unescaped input becomes code.

## Practice

### Warm-up: is it a string?

Return `[typeof "abc", typeof { $ne: null }, typeof null]`.

```js practice
// hint: `typeof` of each.
[typeof "abc", typeof { $ne: null }, typeof null]
```

### Core: a safe lookup

In a scratch collection with `{ name: "a" }` and `{ name: "b" }`, write a lookup that rejects non-strings, and return the results for `"a"` and for `{ $ne: "a" }` as `[count, "rejected"]`.

```js practice destructive
// hint: `typeof name !== "string"` returns early.
const lab = db.getSiblingDB("lab_inject")
lab.t.insertMany([{ name: "a" }, { name: "b" }]);
const find = (n) => typeof n !== "string" ? "rejected" : lab.t.countDocuments({ name: n });
const r = [find("a"), find({ $ne: "a" })]
lab.dropDatabase();
r
```

### Stretch: escape a regex

Escape the user text `a.c` and count documents in `["abc", "a.c", "axc"]` whose `s` matches the escaped text exactly as a substring. Return the count (1).

```js practice destructive
// hint: Escape dots with a backslash before using `$regex`.
const lab = db.getSiblingDB("lab_inject")
lab.t.insertMany(["abc", "a.c", "axc"].map((s) => ({ s })));
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const n = lab.t.countDocuments({ s: { $regex: esc("a.c") } })
lab.dropDatabase();
n
```
