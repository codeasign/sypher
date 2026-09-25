---
title: "Custom Roles and Least Privilege"
order: 0
---

Built-in roles are broad: `readWrite` means every collection in a database. **Custom roles** grant exactly the actions on exactly the collections an application needs, which is the principle of least privilege. Views add a second tool: a role can read a **view** that hides fields it must not see.

## What you'll learn

- Building a custom role from privileges (actions on resources)
- Granting it to a user, and testing what works and what is refused
- Hiding fields with a view
- Auditing who can do what

## Syntax

```js show
db.createRole({
  role: "filmEditor",
  privileges: [ { resource: { db: "shop", collection: "films" }, actions: [ "find", "update" ] } ],
  roles: []
})
```

## Examples

### A role with two collection-level privileges

MongoDB privileges are per collection, not per field. The role below may `find` and `update` in `films`, and only `find` in `stores`:

```js run destructive
db.createRole({
  role: "lesson_filmEditor",
  privileges: [
    { resource: { db: "sypher-mongodb-DvdRental", collection: "films" }, actions: ["find", "update"] },
    { resource: { db: "sypher-mongodb-DvdRental", collection: "stores" }, actions: ["find"] }
  ],
  roles: []
});
db.createUser({ user: "lesson_editor", pwd: "password", roles: ["lesson_filmEditor"] });
db.getUser("lesson_editor").roles
```

### What the editor can do

```js run destructive as=lesson_editor
db.films.updateOne({ _id: 3 }, { $set: { rentalRate: 7.99 } }).modifiedCount
```

### What it cannot do

No access to `customers`, and no inserts into `films`:

```js run destructive as=lesson_editor error
db.customers.findOne()
```

```js run destructive as=lesson_editor error
db.films.insertOne({ _id: 5000, title: "X" })
```

### The problem: staff password hashes

The `stores` collection embeds staff records with password hashes and pictures. The editor role can `find` stores, so it can read those hashes. Privileges cannot exclude fields, but a **view** can:

```js run destructive
db.createView("stores_public", "stores", [{ $project: { managerStaffId: 1, "address.city": 1, "address.country": 1, staffCount: { $size: "$staff" } } }]);
db.getCollectionInfos({ name: "stores_public" })[0].type
```

### A role that sees only the view

```js run destructive
db.createRole({ role: "lesson_storeViewer", privileges: [{ resource: { db: "sypher-mongodb-DvdRental", collection: "stores_public" }, actions: ["find"] }], roles: [] });
db.createUser({ user: "lesson_viewer", pwd: "password", roles: ["lesson_storeViewer"] });
db.getUser("lesson_viewer").roles.length
```

```js run destructive as=lesson_viewer
db.stores_public.find().sort({ _id: 1 }).toArray()
```

The view returns cities, countries and a staff count. The hashes are not in it.

```js run destructive as=lesson_viewer error
db.stores.findOne()
```

### Inspect a role

`rolesInfo` with `showPrivileges` lists exactly what a role allows:

```js run destructive
db.getRole("lesson_storeViewer", { showPrivileges: true }).privileges
```

### Roles can inherit

A role can include other roles. Grant `read` on the DVD Rental database in addition, in a new role:

```js run destructive
db.createRole({ role: "lesson_reporter", privileges: [], roles: [{ role: "read", db: "sypher-mongodb-DvdRental" }] });
db.getRole("lesson_reporter").roles
```

### Audit: list custom roles and users

```js run destructive
[db.getRoles().roles.map((r) => r.role).filter((n) => n.startsWith("lesson_")).sort(), db.getUsers().users.map((u) => u.user).filter((n) => n.startsWith("lesson_")).sort()]
```

### Clean up

```js run destructive
["lesson_editor", "lesson_viewer"].forEach((u) => db.dropUser(u));
["lesson_filmEditor", "lesson_storeViewer", "lesson_reporter"].forEach((r) => db.dropRole(r));
db.stores_public.drop();
[db.getRoles().roles.filter((r) => r.role.startsWith("lesson_")).length, db.getUsers().users.filter((u) => u.user.startsWith("lesson_")).length]
```

## Try it yourself

Design the roles for a small shop: a `catalog` service (read products), an `orders` service (read products, write orders), and a `support` role (read orders through a view without card data). Write the `createRole` calls.

## Watch out

### Privileges are per collection, not per field

Roles cannot hide individual fields. To hide a field, expose a view (or a separate collection) without it and grant access to that only.

### A view runs with the view's source permissions

The user needs privileges on the **view**, not on the underlying collection. That is what makes the pattern safe.

### Test with the real user

Create the user, connect as it and try both allowed and forbidden operations, as in this page. A role that "looks right" can still grant too much.

### `dbOwner` and `root` are for administrators

Do not hand them to applications. A compromised application then owns the whole database or server.

### Deleting a role does not remove it from users cleanly

Revoke it from users first (`revokeRolesFromUser`), then drop the role.

## Interview corner

**"What is the principle of least privilege?"**
Give each user and application only the permissions it needs to do its job, and nothing more.

**"How do you create a role with limited permissions?"**
`db.createRole` with a list of privileges (resource plus actions) and optionally inherited roles.

**"How can you hide sensitive fields from a role?"**
Expose a view that projects them away and grant the role access to the view only.

## Practice

### Warm-up: role privileges

Create a role that may `find` on `films` only, and return its list of actions, then drop it.

```js practice destructive
// hint: `createRole` and `getRole(name, { showPrivileges: true })`.
db.createRole({ role: "lesson_r", privileges: [{ resource: { db: "sypher-mongodb-DvdRental", collection: "films" }, actions: ["find"] }], roles: [] });
const a = db.getRole("lesson_r", { showPrivileges: true }).privileges[0].actions;
db.dropRole("lesson_r");
a
```

### Core: count roles

Return how many custom roles named with the prefix `lesson_` exist now (0 at the start) after creating two and dropping one.

```js practice destructive
// hint: Create two, drop one, count with `getRoles()`.
db.createRole({ role: "lesson_a", privileges: [], roles: [] });
db.createRole({ role: "lesson_b", privileges: [], roles: [] });
db.dropRole("lesson_a");
const n = db.getRoles().roles.filter((r) => r.role.startsWith("lesson_")).length;
db.dropRole("lesson_b");
n
```

### Stretch: a safe view

Create a view `films_titles` that exposes only `title`, and return the sorted keys of its first document, then drop the view.

```js practice destructive
// hint: `createView` with `$project: { title: 1 }`.
db.createView("films_titles", "films", [{ $project: { title: 1 } }]);
const keys = Object.keys(db.films_titles.findOne()).sort();
db.films_titles.drop();
keys
```
