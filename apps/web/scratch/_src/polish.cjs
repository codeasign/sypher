const fs = require('fs');
const D = __dirname + '/';
const R = {
  'critical-thinking': [
    ['Answers vary. A good one names specific evidence, such as "seeing the real numbers instead of hearing a summary", which shows what to ask for next time.', 'For example: "I believed the new tool would halve our reporting time. I should have asked to see the actual before and after timings, not the sales pitch." Naming the missing evidence tells you what to ask for next time.'],
    ['Answers vary. For example: "I think Sam is disorganized. But last month he delivered the launch checklist ahead of time." The act of looking for the exception is the skill.', 'For example: "I think Sam is disorganized. But last month he delivered the launch checklist ahead of time." Looking for the exception is the skill.'],
    ['Answers vary. A strong one ends with a next step, such as "I will look for the original data before sharing this."', 'For example: "Claim: a four day week doubles output. Type: assumption. Source: one blog post. Evidence: none linked. Other side: some teams need daily coverage. Next step: I will look for the original data before sharing this."'],
  ],
  'decision-making': [
    ['Answers vary. Check that yours has a deadline and names what you hope the decision will achieve.', 'For example: "By the 15th, I need to decide whether to sign up for the evening course. I want a qualification that helps me change roles within two years." A useful statement has a deadline and a goal.'],
    ['Answers vary. For example: "If my friend had this offer and these worries, I would tell her to negotiate the start date, not refuse."', 'For example: "If my friend had this offer and these worries, I would tell her to negotiate the start date, not refuse."'],
    ['Answers vary. A strong one gives a specific deadline, at least three options, and criteria written before the options.', 'For example: "Decision: which flat to rent by Friday. Options: Oak Street, the studio near work, or staying put for now. Criteria written first: under 40 minutes to work, rent below my limit, quiet street."'],
  ],
  'memory-techniques': [
    ['Answers vary. For example: "My memory works best when I see it, draw it, or explain it to someone."', 'For example: "My memory works best when I see it, draw it, or explain it to someone."'],
  ],
  'problem-solving': [
    ['Answers vary. A good one sounds like: "I spend about two hours a day answering messages and get little else done. I want two clear hours for focused work."', 'For example: "I spend about two hours a day answering messages and get little else done. I want two clear hours for focused work."'],
    ['Answers vary. What matters is that the second and third ideas are not small variations of the first.', 'For example, if your first idea is "hire a helper", the next two might be "ask the supplier to deliver in the morning" and "stop offering the slow service on busy days". They differ in kind, not just in detail.'],
    ['Answers vary. A good one names something specific that helped, like "asking a colleague early", and one change, like "start the checklist before the deadline week".', 'For example: "What helped: asking a colleague early. What slowed us: nobody knew who owned the login. Change: add the owner to the project sheet on day one."'],
    ['Answers vary. A strong answer has a problem statement with a number in it and a first small piece to work on.', 'For example: "Problem: three of the last ten reports went out with wrong totals. First piece: check where the totals are copied by hand."'],
  ],
  'time-management': [
    ['Answers vary. Check that each is specific enough to finish, such as "write the first page of the report", not "work on the report".', 'For example: "Send the invoice to Acme, write the first page of the report, book the venue." Each one is small enough to finish in a sitting.'],
    ['Answers vary. For example: "The presentation took 5 hours, not 2, because I redid the slides after feedback. Next time I will plan a feedback round."', 'For example: "The presentation took 5 hours, not 2, because I redid the slides after feedback. Next time I will plan a feedback round."'],
    ['Answers vary. For example: "I feel unsure how to start. I will ask a colleague for one example first."', 'For example: "I feel unsure how to start. I will ask a colleague for one example first."'],
  ],
};
// vary the "works because" sentence
const VAR = ['The better version works because ', 'It works because ', 'This is better because ', 'That change matters because ', 'What makes it better: '];
function varyBecause(t) {
  let i = 0;
  return t.replace(/The better version works because /g, () => {
    const v = VAR[i % VAR.length]; i++;
    return v;
  });
}
for (const [slug, pairs] of Object.entries(R)) {
  let t = fs.readFileSync(D + slug + '.txt', 'utf8');
  for (const [a, b] of pairs) { if (!t.includes(a)) throw new Error(slug + ' missing: ' + a.slice(0, 50)); t = t.replace(a, () => b); }
  fs.writeFileSync(D + slug + '.txt', t);
}
for (const slug of ['critical-thinking', 'problem-solving', 'decision-making', 'memory-techniques', 'time-management']) {
  let t = fs.readFileSync(D + slug + '.txt', 'utf8');
  t = varyBecause(t);
  fs.writeFileSync(D + slug + '.txt', t);
}
console.log('polished');
