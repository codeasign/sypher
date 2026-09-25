---
title: "Set Up Your Lab"
order: 0
---

Reading about queries is not enough. You learn MongoDB by running commands and seeing what comes back. This page gets a real MongoDB server running on your own computer in a few minutes.

## What you'll need

- **Docker Desktop** (Windows or macOS), or Docker Engine with the Compose plugin (Linux). It runs MongoDB for you, so you don't install MongoDB itself.
- The **sypher-db-lab** folder. It contains the DVD Rental data and everything needed to load it, and it is supplied with this course as a ready-to-run folder: you do not download the data separately, and starting MongoDB only pulls the official MongoDB image from Docker Hub. If you do not have the folder yet, get it from whoever gave you this course before you continue.

Check that Docker works:

```bash
docker version
docker compose version
```

## Start MongoDB

Open a terminal in the `sypher-db-lab` folder and run:

```bash
docker compose up -d mongodb
docker compose ps
```

The first start downloads MongoDB and loads the DVD Rental documents, which takes a minute or two. Wait until the `STATUS` column says `healthy`.

## Connect

This command opens the MongoDB shell, **mongosh**, inside the running container, already connected to the course database:

```bash
docker compose exec mongodb mongosh -u sypher -p password --authenticationDatabase admin sypher-mongodb-DvdRental
```

Your prompt now looks like `sypher-mongodb-DvdRental>`. Type a command and press Enter. Try this one:

```js run
db.getName()
```

If you see the database name, you are connected to the right place. To leave the shell, type `exit`.

The connection details, in case a tool such as MongoDB Compass asks for them:

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `27018` |
| Database | `sypher-mongodb-DvdRental` |
| User | `sypher` |
| Password | `password` |
| Authentication database | `admin` |
| Connection string | `mongodb://sypher:password@localhost:27018/sypher-mongodb-DvdRental?authSource=admin` |

These simple credentials are fine for a practice database on your own machine. Never use them for anything real.

## Two ways to run commands

1. **The command line** (`mongosh`) you just used. Fast, and available everywhere.
2. **A visual tool** such as MongoDB Compass. Connect with the details above. Many people prefer it for browsing documents and building queries.

Use whichever you like. Every command in this course works in `mongosh`.

## Start again from scratch

You will practise inserts, updates, deletes and drops. The lab has a script that puts the database back exactly as it was, and checks that it did. Run it from the `sypher-db-lab` folder whenever you want a clean copy:

```bash
bash scripts/reset-mongodb.sh
```

It prints `RESTORED` when the database matches the original again. (On Windows use Git Bash, which comes with Git for Windows.)

## Watch out

- **The database name has hyphens and capitals.** Inside `mongosh`, `db` already points at it. To switch, write `use "sypher-mongodb-DvdRental"` or `db.getSiblingDB("sypher-mongodb-DvdRental")`.
- **Port 27018, not 27017.** The lab publishes MongoDB on 27018 so it does not clash with a MongoDB you may already have. Inside the container it is the usual 27017.
- **"Authentication failed".** The user is `sypher`, the password is `password`, and the authentication database is `admin`. The `--authenticationDatabase admin` part is required.
- **Quotes on the command line.** In the examples, strings use double quotes inside JavaScript. On a Windows command prompt, wrap a long `--eval` in single quotes, or paste commands inside `mongosh` instead.

## Interview corner

**"How would you run MongoDB locally without installing it?"**
In a container, for example with Docker Compose. It keeps the database isolated, makes it easy to reset, and matches how many teams run databases in development.
