---
title: "Authentication, Users and Built-in Roles"
order: 0
---

Access control in MongoDB has two parts: **authentication** (who are you?) and **authorization** (what may you do?). Users are created per database, and each user gets **roles** that grant privileges. The lab server has authentication switched on, so this page runs real logins.

## What you'll learn

- Creating users and choosing their roles
- The everyday built-in roles: `read`, `readWrite`, `dbAdmin`, `userAdmin`
- Logging in as a user and seeing what is refused
- Changing passwords and roles, and removing users

## Syntax

```js show
db.createUser({ user: "reader", pwd: "secret", roles: [ { role: "read", db: "shop" } ] })
db.updateUser("reader", { roles: [ { role: "readWrite", db: "shop" } ] })
db.changeUserPassword("reader", "newSecret")
db.dropUser("reader")
```

## Examples

The lab administrator (`sypher`) creates two users in the DVD Rental database. The password of both is `password`, only for this lab:

```js run destructive
db.createUser({ user: "lesson_reader", pwd: "password", roles: [{ role: "read", db: "sypher-mongodb-DvdRental" }] });
db.createUser({ user: "lesson_writer", pwd: "password", roles: [{ role: "readWrite", db: "sypher-mongodb-DvdRental" }] });
db.getUsers().users.map((u) => u.user).filter((n) => n.startsWith("lesson_")).sort()
```

### Who am I?

`connectionStatus` tells you the authenticated user and its roles. Connect as the reader:

```js run destructive as=lesson_reader
db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers
```

### The reader can read

```js run destructive as=lesson_reader
db.films.countDocuments()
```

### ...but not write

An unauthorised operation fails with code 13:

```js run destructive as=lesson_reader error
db.films.updateOne({ _id: 1 }, { $set: { rentalRate: 9.99 } })
```

### The writer can write

```js run destructive as=lesson_writer
db.films.updateOne({ _id: 1 }, { $set: { rentalRate: 9.99 } }).modifiedCount
```

### ...but not administer

Creating users, or dropping indexes, needs other roles:

```js run destructive as=lesson_writer error
db.createUser({ user: "hacker", pwd: "x", roles: [] })
```

### Roles of a user

```js run destructive
db.getUser("lesson_writer").roles
```

### Change a role, then check

Give the reader write access to one collection only by removing the wide role and granting a narrower one (built with a custom role on the next page). For now, upgrade the reader to `readWrite`:

```js run destructive
db.updateUser("lesson_reader", { roles: [{ role: "readWrite", db: "sypher-mongodb-DvdRental" }] });
db.getUser("lesson_reader").roles.map((r) => r.role)
```

```js run destructive as=lesson_reader
db.films.updateOne({ _id: 2 }, { $set: { rentalRate: 8.99 } }).modifiedCount
```

### Change a password

```js run destructive
db.changeUserPassword("lesson_reader", "newpassword");
db.getUser("lesson_reader").user
```

### Remove users

```js run destructive
db.dropUser("lesson_reader");
db.dropUser("lesson_writer");
db.getUsers().users.map((u) => u.user).filter((n) => n.startsWith("lesson_"))
```

## Try it yourself

Create a user with the `dbAdmin` role and find out what it can do that `readWrite` cannot (for example creating an index) and what it cannot do (reading documents).

## Watch out

### Users belong to a database, and log in against it

A user created in database `a` authenticates against `a` (the `authSource`), even if its roles are on another database. Use the same `authSource` when you connect.

### Never run applications as an administrator

Give each application a user with exactly the roles it needs (least privilege), not `root`.

### Passwords in scripts

This lab uses `password` because it is a lab. Real passwords come from a secret store or environment variables, never from source code.

### Authentication is off by default on a bare `mongod`

A server started without `--auth` (or without a configured root user) lets anyone in. Turn on authentication and network restrictions before exposing a server.

### Role changes need care

`updateUser` with `roles` **replaces** the whole list. Use `grantRolesToUser` and `revokeRolesFromUser` to add or remove single roles.

## Interview corner

**"What is the difference between authentication and authorization?"**
Authentication proves who you are (password, certificate). Authorization decides what you may do (roles and privileges).

**"Which built-in roles should an application user have?"**
Usually `readWrite` on its own database, or a custom role with only the actions it needs. Not `root` or `dbOwner`.

**"How do you add a role without replacing the others?"**
`db.grantRolesToUser(user, [ { role, db } ])`.

## Practice

### Warm-up: create and list

Create a user `lesson_tmp` with role `read` on the DVD Rental database, return `true` if it appears in `getUsers()`, then drop it.

```js practice destructive
// hint: `db.createUser(...)`, then check `getUsers().users`.
db.createUser({ user: "lesson_tmp", pwd: "password", roles: [{ role: "read", db: "sypher-mongodb-DvdRental" }] });
const found = db.getUsers().users.some((u) => u.user === "lesson_tmp");
db.dropUser("lesson_tmp");
found
```

### Core: read the roles

Create a user with the `readWrite` role, return the list of its role names, and drop the user.

```js practice destructive
// hint: `getUser(name).roles.map((r) => r.role)`.
db.createUser({ user: "lesson_tmp", pwd: "password", roles: [{ role: "readWrite", db: "sypher-mongodb-DvdRental" }] });
const roles = db.getUser("lesson_tmp").roles.map((r) => r.role);
db.dropUser("lesson_tmp");
roles
```

### Stretch: add a role

Create a user with `read`, add `dbAdmin` with `grantRolesToUser`, and return the sorted role names.

```js practice destructive
// hint: `db.grantRolesToUser("lesson_tmp", [{ role: "dbAdmin", db: ... }])`.
db.createUser({ user: "lesson_tmp", pwd: "password", roles: [{ role: "read", db: "sypher-mongodb-DvdRental" }] });
db.grantRolesToUser("lesson_tmp", [{ role: "dbAdmin", db: "sypher-mongodb-DvdRental" }]);
const roles = db.getUser("lesson_tmp").roles.map((r) => r.role).sort();
db.dropUser("lesson_tmp");
roles
```
