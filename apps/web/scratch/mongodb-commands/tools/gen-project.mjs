// Generates src/18-01-final-project.md and src/18-02-project-solutions.md from ONE list of questions,
// so the question text, the expected result and the solution can never disagree.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

const Q = [
  {
    title: 'Which store earns the most?',
    text: 'Management wants to know how much money each store has taken in. Show each store (`_id`) and its total revenue (`revenue`, rounded to 2 decimals), highest first. (A payment belongs to the store of the rental it pays for.)',
    skills: '`$unwind`, `$group`, `$sum`, `$round` (modules 10.1 to 10.4)',
    hint: 'Payments live inside rentals, which live inside customers: unwind twice.',
    how: 'Each customer holds rentals and each rental holds payments, so two `$unwind` stages reach one document per payment. Grouping by the rental\'s `storeId` and summing the amounts gives the revenue per store.',
    lines: 12,
    code: `db.customers.aggregate([
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: "$rentals.storeId", revenue: { $sum: "$rentals.payments.amount" } } },
  { $project: { revenue: { $round: ["$revenue", 2] } } },
  { $sort: { revenue: -1, _id: 1 } }
])`,
  },
  {
    title: 'Who are our five best customers?',
    text: 'Show the five customers who have paid the most: their `_id`, full name as `name`, and `total_spent` (rounded to 2 decimals). Break ties by `_id`.',
    skills: '`$reduce` or `$unwind`, `$concat`, `$sort`, `$limit` (modules 10.3, 10.10, 10.11)',
    hint: 'You can total the payments inside each customer document with `$reduce`, without unwinding.',
    how: '`$reduce` walks each customer\'s rentals and adds the sum of every rental\'s payment amounts. The customers are then sorted by that total, with `_id` as a tie-breaker so the order is repeatable, and the first five are kept.',
    lines: 20,
    code: `db.customers.aggregate([
  { $project: {
      name: { $concat: ["$name.first", " ", "$name.last"] },
      total_spent: { $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } }
  } },
  { $project: { name: 1, total_spent: { $round: ["$total_spent", 2] } } },
  { $sort: { total_spent: -1, _id: 1 } },
  { $limit: 5 }
])`,
  },
  {
    title: 'Which film categories make the most money?',
    text: 'Show the five categories that have brought in the most revenue, with the category name as `_id` and its `revenue` (rounded to 2 decimals). Break ties by name.',
    skills: '`$lookup`, `$unwind`, `$group` (modules 10.4, 10.5)',
    hint: 'A payment belongs to a rental, which points at a film through `filmId`. The film knows its category.',
    how: 'After unwinding rentals, a `$lookup` attaches the film (only its category name is needed, so a small sub-pipeline keeps the documents light). Unwinding the payments and grouping by the category name adds the money up.',
    lines: 20,
    code: `db.customers.aggregate([
  { $unwind: "$rentals" },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { "category.name": 1 } }] } },
  { $unwind: "$f" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: "$f.category.name", revenue: { $sum: "$rentals.payments.amount" } } },
  { $project: { revenue: { $round: ["$revenue", 2] } } },
  { $sort: { revenue: -1, _id: 1 } },
  { $limit: 5 }
])`,
  },
  {
    title: 'Which films have never been rented?',
    text: 'List the films that no customer has ever rented: their `_id` and `title`, alphabetical by title. Show the first ten only, and also tell how many there are in total.',
    skills: 'anti-join with `$lookup`, `$facet` (modules 10.5, 10.8, 11.6)',
    hint: 'A film is never rented if the customers collection has no rental with that `filmId`. The index on `rentals.filmId` makes the lookup cheap.',
    how: 'The `$lookup` looks for at most one renting customer per film (`$limit: 1` in the sub-pipeline stops at the first). Films with an empty result were never rented. `$facet` returns the first ten titles and the total count in one answer.',
    lines: 30,
    code: `db.films.aggregate([
  { $lookup: { from: "customers", localField: "_id", foreignField: "rentals.filmId", as: "renters", pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }] } },
  { $match: { renters: { $size: 0 } } },
  { $facet: {
      total: [{ $count: "n" }],
      firstTen: [{ $sort: { title: 1 } }, { $limit: 10 }, { $project: { title: 1 } }]
  } }
])`,
  },
  {
    title: 'Which month was the busiest?',
    text: 'Count the rentals per month (`YYYY-MM`) and show all months, busiest first, as `_id` and `rentals`.',
    skills: '`$substrCP` on text dates, `$group`, `$sort` (modules 10.10, 11.5)',
    hint: 'The dates are text like "2005-05-25 11:30:37", so the first 7 characters are the month.',
    how: 'Every rental has a text `rentalDate` in year-first format. Taking its first seven characters gives the month, and grouping counts the rentals per month.',
    lines: 12,
    code: `db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: { $substrCP: ["$rentals.rentalDate", 0, 7] }, rentals: { $sum: 1 } } },
  { $sort: { rentals: -1, _id: 1 } }
])`,
  },
  {
    title: 'Who has kept a film the longest without returning it?',
    text: 'Among the rentals that have not been returned, show the five oldest: the `rentalId`, the customer\'s full name as `customer`, the film `title` and the `rentalDate`. Oldest first, ties by `rentalId`.',
    skills: '`$unwind`, `$match` on null, `$lookup` (modules 6.3, 10.4, 10.5)',
    hint: 'A missing return is stored as `null`, and text dates sort correctly.',
    how: 'After unwinding, `returnDate: null` keeps the open rentals. Sorting by the rental date puts the oldest first, and only then is the film looked up, for five rentals instead of thousands.',
    lines: 45,
    code: `db.customers.aggregate([
  { $unwind: "$rentals" },
  { $match: { "rentals.returnDate": null } },
  { $sort: { "rentals.rentalDate": 1, "rentals.rentalId": 1 } },
  { $limit: 5 },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $project: { _id: 0, rentalId: "$rentals.rentalId", customer: { $concat: ["$name.first", " ", "$name.last"] }, title: { $arrayElemAt: ["$f.title", 0] }, rentalDate: "$rentals.rentalDate" } }
])`,
  },
  {
    title: 'What are the top three films of each store?',
    text: 'For each store show its three most rented films: `store`, `title` and `rentals`. Break ties by the film `_id` (lower first). Order by store, then by rentals descending.',
    skills: '`$group`, `$setWindowFields` with `$documentNumber`, `$lookup` (modules 10.3, 10.9, 11.1)',
    hint: 'Count rentals per (store, film), number the films inside each store, keep the first three, and join the titles last.',
    how: 'Grouping by store and film counts the rentals. A document number needs one sort key, so a single number combines the rental count and the film id (more rentals wins, the lower film id wins ties). `$setWindowFields` numbers the films inside each store, only the first three per store survive, and the titles are joined last, for six rows.',
    lines: 30,
    code: `db.customers.aggregate([
  { $unwind: "$rentals" },
  { $group: { _id: { store: "$rentals.storeId", film: "$rentals.filmId" }, rentals: { $sum: 1 } } },
  { $set: { key: { $subtract: [{ $multiply: ["$rentals", 100000] }, "$_id.film"] } } },
  { $setWindowFields: { partitionBy: "$_id.store", sortBy: { key: -1 }, output: { n: { $documentNumber: {} } } } },
  { $match: { n: { $lte: 3 } } },
  { $lookup: { from: "films", localField: "_id.film", foreignField: "_id", as: "f", pipeline: [{ $project: { title: 1 } }] } },
  { $project: { _id: 0, store: "$_id.store", title: { $arrayElemAt: ["$f.title", 0] }, rentals: 1, n: 1 } },
  { $sort: { store: 1, n: 1 } },
  { $project: { store: 1, title: 1, rentals: 1 } }
])`,
  },
  {
    title: 'Which actors appear in the most films?',
    text: 'Show the five actors with the most films: `_id` (the actor id), full name as `name` and `films`. Ties by actor id.',
    skills: '`$unwind`, `$group`, `$concat` (modules 10.4, 11.6)',
    hint: 'The cast is an array inside each film.',
    how: 'Unwinding the cast gives one document per (film, actor). Grouping by the actor counts the films, and the name is built once per group with `$first`.',
    lines: 20,
    code: `db.films.aggregate([
  { $unwind: "$actors" },
  { $group: { _id: "$actors.actorId", name: { $first: { $concat: ["$actors.firstName", " ", "$actors.lastName"] } }, films: { $sum: 1 } } },
  { $sort: { films: -1, _id: 1 } },
  { $limit: 5 }
])`,
  },
  {
    title: 'How long do customers keep a film?',
    text: 'For each rating, show the average number of days between rental and return (only returned rentals), rounded to 1 decimal, as `avgDays`. Order by rating.',
    skills: 'date conversion, `$subtract`, `$lookup`, `$group` (modules 10.5, 10.10, 11.5)',
    hint: 'Convert both text dates with `$dateFromString` before you subtract.',
    how: 'Only rentals with a return date are kept. Both text dates are converted, and subtracting them gives milliseconds, which are divided by the length of a day (so the average is not rounded early). The rating comes from a small `$lookup` on the film.',
    lines: 20,
    code: `db.customers.aggregate([
  { $unwind: "$rentals" },
  { $match: { "rentals.returnDate": { $ne: null } } },
  { $lookup: { from: "films", localField: "rentals.filmId", foreignField: "_id", as: "f", pipeline: [{ $project: { rating: 1 } }] } },
  { $project: { rating: { $arrayElemAt: ["$f.rating", 0] }, days: { $divide: [{ $subtract: [{ $dateFromString: { dateString: "$rentals.returnDate" } }, { $dateFromString: { dateString: "$rentals.rentalDate" } }] }, 86400000] } } },
  { $group: { _id: "$rating", avgDays: { $avg: "$days" } } },
  { $project: { avgDays: { $round: ["$avgDays", 1] } } },
  { $sort: { _id: 1 } }
])`,
  },
  {
    title: 'How many customers still have a film out?',
    text: 'Return how many customers have at least one unreturned rental, and what percentage of all customers that is (rounded to 1 decimal). A single document with `withOpenRental`, `customers` and `pct`.',
    skills: '`$elemMatch`, `$facet`, arithmetic (modules 6.5, 10.7, 11.3)',
    hint: 'A customer has a film out when some element of `rentals` has `returnDate: null`.',
    how: '`$elemMatch` on the rentals array keeps the customers with an open rental. `$facet` counts them next to the total number of customers in the same pass, and a last stage turns the two counts into a percentage.',
    lines: 12,
    code: `db.customers.aggregate([
  { $facet: {
      open: [{ $match: { rentals: { $elemMatch: { returnDate: null } } } }, { $count: "n" }],
      all: [{ $count: "n" }]
  } },
  { $project: { _id: 0, withOpenRental: { $arrayElemAt: ["$open.n", 0] }, customers: { $arrayElemAt: ["$all.n", 0] } } },
  { $set: { pct: { $round: [{ $multiply: [{ $divide: ["$withOpenRental", "$customers"] }, 100] }, 1] } } }
])`,
  },
];

let a = `---
title: "Final Project: Sypher DVD Rentals Analyst"
order: 0
---

Time to use everything. In this project you are the new data analyst at **Sypher DVD Rentals**, a small chain with two stores. The owner has ten questions, and the answers must come from the MongoDB database you have been exploring.

There is no lesson to read and no hand-holding. For each question you get the question in plain business language, the skills it involves, and **what your result must look like**. Your job is to write the pipeline.

## How to work

1. Make sure your lab is running (*Set Up Your Lab*) and connect to the DVD Rental database.
2. Do the questions in any order, but try each before you look at a hint.
3. For each question, run your pipeline and compare with the **Expected result**: same fields, same order, same first documents, same values.
4. If your numbers differ, run the pipeline one stage at a time (add the stages one by one) and find where it goes wrong. That is the real skill.
5. When you have tried all ten, do the stretch goals, then read the solutions.

## The data

Three collections: \`films\` (with the cast embedded), \`customers\` (with rentals and payments embedded) and \`stores\` (with staff and inventory embedded). Dates are text in \`YYYY-MM-DD hh:mm:ss\` form; an unreturned rental has \`returnDate: null\`.

## The ten questions

`;
Q.forEach((q, i) => {
  a += `### Question ${i + 1}: ${q.title}\n\n${q.text}\n\nSkills you need: ${q.skills}.\n\n<details>\n<summary>Hint: where to look</summary>\n\n${q.hint}\n\n</details>\n\n\`\`\`js expect lines=${q.lines}\n${q.code}\n\`\`\`\n\n`;
});
a += `## Stretch goals

1. **Make the slowest one fast.** Questions 3 and 5 unwind every rental. Create a scratch collection with one document per rental (module 13.4), add the indexes a question needs, and compare \`explain("executionStats")\` before and after.
2. **Make it reusable.** Turn question 1 into a **view** and question 2 into a small JavaScript function that takes a number of customers.
3. **Back it up.** Dump the \`customers\` collection, restore it into a different database, and compare the counts (module 15.4).
4. **Explain it out loud.** Pick question 7 and explain, stage by stage, what each part of the pipeline does and why the tie-breaker is there. If you can explain it, you understand it.

## When you are done

Read *Project Solutions*. Compare your pipelines with the model answers. Different is fine, as long as the result matches.
`;
fs.writeFileSync(path.join(SRC, '18-01-final-project.md'), a);

let s = `---
title: "Project Solutions"
order: 0
---

Only open this page after you have tried all ten questions yourself. Each solution shows a full pipeline, the real result, and a short explanation. There are many correct ways to write a pipeline; yours may look different and still be right, as long as the result matches.

Every pipeline below was run against the database to produce the result shown.

`;
Q.forEach((q, i) => {
  s += `## Question ${i + 1}: ${q.title}\n\n${q.text}\n\n\`\`\`js run lines=${q.lines}\n${q.code}\n\`\`\`\n\n**How it works.** ${q.how}\n\n`;
});
s += `## Stretch goals: solutions

### 1. Make the slowest one fast

Build the flat collection of rentals once, then compare a customer lookup with and without an index:

\`\`\`js run destructive
const lab = db.getSiblingDB("lab_project");
db.customers.aggregate([
  { $unwind: "$rentals" },
  { $replaceWith: { _id: "$rentals.rentalId", customerId: "$_id", filmId: "$rentals.filmId", storeId: "$rentals.storeId", rentalDate: "$rentals.rentalDate" } },
  { $out: { db: "lab_project", coll: "rentals" } }
]);
const stat = (q) => { const e = lab.rentals.find(q).explain("executionStats").executionStats; return { returned: e.nReturned, docsExamined: e.totalDocsExamined }; };
stat({ customerId: 3 })
\`\`\`

\`\`\`js run destructive
lab.rentals.createIndex({ customerId: 1, rentalDate: -1 });
stat({ customerId: 3 })
\`\`\`

The same answer, but the server now examines only the documents it returns instead of all 16,044.

\`\`\`js run destructive
lab.dropDatabase()
\`\`\`

### 2. Make it reusable

A view for question 1 and a function for question 2:

\`\`\`js run destructive
db.createView("store_revenue", "customers", [
  { $unwind: "$rentals" },
  { $unwind: "$rentals.payments" },
  { $group: { _id: "$rentals.storeId", revenue: { $sum: "$rentals.payments.amount" } } },
  { $project: { revenue: { $round: ["$revenue", 2] } } },
  { $sort: { _id: 1 } }
]);
db.store_revenue.find().toArray()
\`\`\`

\`\`\`js run destructive
const topCustomers = (n) => db.customers.aggregate([
  { $project: { name: { $concat: ["$name.first", " ", "$name.last"] }, total: { $reduce: { input: "$rentals", initialValue: 0, in: { $add: ["$$value", { $sum: "$$this.payments.amount" }] } } } } },
  { $project: { name: 1, total: { $round: ["$total", 2] } } },
  { $sort: { total: -1, _id: 1 } },
  { $limit: n }
]).toArray();
topCustomers(2)
\`\`\`

\`\`\`js run destructive
db.store_revenue.drop()
\`\`\`

### 3. Back it up

Dump \`customers\`, restore the archive into a **different** database (\`project_restore\`) with \`--nsFrom\` and \`--nsTo\`, count what arrived, and clean up:

\`\`\`bash run
docker compose exec -T mongodb mongodump --uri "mongodb://sypher:password@localhost:27017/?authSource=admin" --db sypher-mongodb-DvdRental --collection customers --archive=/tmp/customers.archive --gzip 2>&1 | grep -o "done dumping [^ ]* ([0-9]* documents)"
docker compose exec -T mongodb mongorestore --uri "mongodb://sypher:password@localhost:27017/?authSource=admin" --archive=/tmp/customers.archive --gzip --nsFrom "sypher-mongodb-DvdRental.customers" --nsTo "project_restore.customers" 2>&1 | grep -o "[0-9]* document(s) restored successfully"
docker compose exec -T mongodb mongosh --quiet -u sypher -p password --authenticationDatabase admin project_restore --eval 'const n = db.customers.countDocuments(); db.dropDatabase(); print(n)'
docker compose exec -T mongodb rm /tmp/customers.archive
\`\`\`

The restored copy has the same 599 customers as the original.

### 4. Explain it out loud

A good explanation of question 7 sounds like this: "First I unwind the rentals and count them per store and film. Then I number the films inside each store, best first, with a window function. A document number needs a single sort key, so I build one number that combines the rental count and the film id: more rentals wins, and the lower film id wins ties, which makes the result repeatable. I keep the first three per store, and only then join the titles, so the lookup runs for six documents instead of thousands."

## What next?

You have worked through the ideas behind almost every MongoDB interview question: documents and BSON, reading and shaping data, operators, writes, aggregation, indexes, data modelling, transactions, security and drivers. Keep practising on your own data: pick a dataset you care about, model it, load it, ask ten questions and answer them with pipelines, and always check the answer a second way.
`;
fs.writeFileSync(path.join(SRC, '18-02-project-solutions.md'), s);
console.log('generated 18-01 and 18-02');
