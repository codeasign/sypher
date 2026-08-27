import { mdTable, round1, avg, sum, pct, chartBuilders, BUNNY, API, ROOT, execFileSync, fs, path } from './scratch-gen-metrics-batch.mjs';

// ============================================================
// Shared module-body composer (same pattern as the Developer/QA batch)
// ============================================================
function mod(order, title, bodyParts) {
  return { order, title, body: bodyParts.filter(Boolean).join('\n\n') };
}

function chartBlock(imgPlaceholder, alt, caption) {
  return `![${alt}](${imgPlaceholder})\n\n*${caption}*`;
}

function tryItBlock(items) {
  const parts = items.map((it, i) => `**${i + 1}. ${it.q}**\n\n**Suggested answer:** ${it.a}`);
  return `**TRY IT**\n\n${parts.join('\n\n')}`;
}

// ============================================================
// COURSE 1: choosing-product-metrics (Loomwork, 6 months)
// ============================================================
function courseChoosingMetrics() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const mrr = [18000, 19500, 21200, 23000, 25400, 28100];
  const wau = [1200, 1350, 1500, 1400, 1600, 1550];
  const wap = [340, 380, 430, 460, 520, 590]; // weekly active projects with >=1 completed task

  const idx = (arr) => arr.map((v) => round1((v / arr[0]) * 100));
  const mrrIdx = idx(mrr);
  const wauIdx = idx(wau);
  const wapIdx = idx(wap);

  const deltaDirection = (arr) => arr.slice(1).map((v, i) => v - arr[i]).map((d) => (d > 0 ? 1 : d < 0 ? -1 : 0));
  const mrrDir = deltaDirection(mrr);
  const wauDir = deltaDirection(wau);
  const wapDir = deltaDirection(wap);
  const agreementCount = (dir) => dir.filter((d, i) => d === mrrDir[i]).length;
  const wauAgree = agreementCount(wauDir);
  const wapAgree = agreementCount(wapDir);
  const wauAgreePct = round1((wauAgree / mrrDir.length) * 100);
  const wapAgreePct = round1((wapAgree / mrrDir.length) * 100);

  const oldDashboard = [
    { name: 'Signups', type: 'Vanity' },
    { name: 'Page views', type: 'Vanity' },
    { name: 'Weekly Active Users', type: 'Proxy' },
    { name: 'Weekly Active Projects (task completed)', type: 'Actionable' },
    { name: 'NPS', type: 'Actionable' },
    { name: 'Churned accounts', type: 'Actionable' },
    { name: 'MRR', type: 'Lagging outcome' },
    { name: 'Support tickets closed', type: 'Actionable' },
  ];
  const typeCounts = oldDashboard.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {});

  const charts = [
    { file: 'metric-types-mix.svg', alt: 'Donut chart of the eight metrics on Loomwork\'s old dashboard classified as vanity, proxy, actionable, or lagging outcome', caption: 'Shown as a donut chart because this is composition, what share of the old dashboard was actually vanity noise.',
      svg: chartBuilders.donut({ title: 'Loomwork: Old Dashboard, 8 Metrics by Type', segments: Object.entries(typeCounts).map(([name, value]) => ({ name, value })) }) },
    { file: 'indexed-trend.svg', alt: 'Line chart of Loomwork revenue, weekly active users, and weekly active projects, each indexed to January = 100, over six months', caption: 'Shown as a line chart because the point is comparing trend shape over time across three metrics on a common index scale.',
      svg: chartBuilders.line({ title: 'Loomwork: Revenue vs. Two Candidate Metrics (Jan = 100)', xLabels: months, series: [
        { name: 'MRR (index)', values: mrrIdx, color: '#4f46e5' },
        { name: 'WAU (index)', values: wauIdx, color: '#ef4444' },
        { name: 'WAP (index)', values: wapIdx, color: '#10b981' },
      ], yLabel: 'Index' }) },
    { file: 'directional-agreement.svg', alt: 'Bar chart comparing how often WAU and WAP moved in the same direction as revenue month over month', caption: 'Shown as a bar chart because this is a direct comparison between two candidate metrics on one score, not a trend.',
      svg: chartBuilders.bar({ title: 'Loomwork: Directional Agreement with Revenue', categories: ['WAU', 'WAP'], values: [wauAgreePct, wapAgreePct], valueSuffix: '%', yLabel: '%' }) },
  ];

  const modules = [
    mod(1, 'Loomwork Has Eight Metrics and No Answer', [
      'Loomwork\'s leadership meeting opened the same way every month: a dashboard with eight numbers on it, and no one able to say which one actually mattered. Signups were up. Page views were up. Nobody could say whether the product was actually getting better.',
      'The dataset for this course: Loomwork, a fictional project-planning tool for small teams. Six months of company data, January through June. All figures are illustrative.',
      mdTable(['Month', ...months], [['MRR ($)', ...mrr.map(String)], ['Weekly Active Users', ...wau.map(String)], ['Weekly Active Projects (task completed)', ...wap.map(String)]]),
      'Three questions this course answers with that data: which of Loomwork\'s existing metrics are actually vanity, which of two candidate "north star" metrics tracks revenue better, and what mistakes teams make when they pick a north star metric badly.',
    ]),
    mod(2, 'Vanity Metrics vs. Actionable Metrics', [
      'A vanity metric goes up no matter what you do and tells you nothing to act on. Signups climb because of ad spend, not because the product works. Page views climb because the app got chattier, not more useful. An actionable metric changes your next decision.',
      mdTable(['Metric', 'Type'], oldDashboard.map((m) => [m.name, m.type])),
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `${typeCounts.Vanity} of the 8 metrics on Loomwork\'s old dashboard were pure vanity, ${typeCounts.Proxy} was a proxy metric (real activity, but not directly tied to value), and only ${typeCounts.Actionable} were genuinely actionable day to day, with ${typeCounts['Lagging outcome']} lagging outcome metric (MRR) that confirms results after the fact but can\'t be acted on directly. A dashboard that is a quarter vanity metrics is not measuring the product, it is measuring activity.`,
      tryItBlock([
        { q: 'Loomwork also tracked "total accounts created (all time)". Is that vanity, proxy, or actionable, and why?', a: 'Vanity. It only grows, never reflects current health, and no decision changes based on it going up. A team could stop shipping entirely and the number would still climb.' },
        { q: 'A metric called "average session length" is proposed for the dashboard. What question would you ask before classifying it?', a: 'What is happening during that time. Long sessions could mean deep, valuable work, or they could mean the user is confused and struggling to find something. Without knowing what the time is spent on, the metric alone does not tell you whether to be happy or worried, which is a sign it needs a companion metric before it is actionable.' },
      ]),
    ]),
    mod(3, 'Leading Indicators vs. Lagging Indicators', [
      'MRR is the outcome Loomwork actually cares about, but it is a lagging indicator: by the time it moves, the quarter is already over. A north star metric should be a leading indicator, something that moves first and predicts where MRR is headed.',
      'Loomwork had two candidates for that leading indicator: Weekly Active Users (WAU), the obvious default, and Weekly Active Projects with at least one completed task (WAP), a metric that only counts real usage tied to output.',
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `Indexed to January, WAP climbed to ${wapIdx[5]} by June, a shape that closely tracks MRR\'s climb to ${mrrIdx[5]}. WAU is noisier: it climbed to ${wauIdx[2]} by March, then dropped to ${wauIdx[3]} in April even while revenue kept rising, before recovering and dropping again in June.`,
      'A metric that dips in the same month revenue keeps climbing is telling you something different than revenue is telling you, which makes it a weak leading indicator no matter how intuitive it feels to track logins.',
      tryItBlock([
        { q: 'WAU dropped from index 125.0 in March to 116.7 in April, while MRR kept rising every single month. What does that combination suggest about what WAU is actually measuring at Loomwork?', a: 'It suggests WAU is picking up something other than the value driving revenue, most likely casual logins that do not translate into completed work. If it tracked the same underlying reality as revenue, it should not fall in a month revenue rises.' },
        { q: 'Why is indexing all three metrics to "January = 100" more useful here than plotting their raw values (18000 vs 1200 vs 340) on one chart?', a: 'The raw values live on completely different scales, so a chart of MRR, WAU, and WAP together would show MRR as a tall line and the other two as flat lines near zero, hiding their shapes entirely. Indexing puts all three on a comparable 100-based scale so their trend shapes, not their absolute size, can be compared directly.' },
      ]),
    ]),
    mod(4, 'Picking a North Star With a Number, Not a Feeling', [
      'Instead of arguing about which metric "feels" more meaningful, Loomwork checked which one actually moved the same direction as revenue, month over month, across the whole dataset.',
      mdTable(['Change', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], [
        ['MRR direction', ...mrrDir.map((d) => (d > 0 ? 'up' : 'down'))],
        ['WAU direction', ...wauDir.map((d) => (d > 0 ? 'up' : 'down'))],
        ['WAP direction', ...wapDir.map((d) => (d > 0 ? 'up' : 'down'))],
      ]),
      `MRR rose every single month, 5 out of 5 month-over-month changes. WAU matched that direction in ${wauAgree} of those 5 months (${wauAgreePct}%), dropping in April and June even as revenue rose. WAP matched revenue\'s direction in ${wapAgree} of 5 months (${wapAgreePct}%), a perfect record.`,
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `That single number, ${wapAgreePct}% directional agreement versus ${wauAgreePct}%, is what actually settled the argument at Loomwork. WAP became the north star metric; WAU stayed on the dashboard as a secondary awareness metric, not the headline.`,
      tryItBlock([
        { q: 'A third candidate metric, "average time in app per session," rose in Feb, Mar, Apr, fell in May, and rose in Jun. Revenue rose every month (Feb through Jun, 5 changes). What is its directional agreement percentage with revenue?', a: '4 out of 5 months matched (Feb, Mar, Apr, Jun all rose alongside revenue; May fell while revenue rose), so 80%. That beats WAU\'s 60% but does not match WAP\'s 100%.' },
        { q: 'Suppose a metric had 100% directional agreement with revenue but only existed for the last 2 months of data instead of all 6. Would you trust it as much as WAP\'s 100% score?', a: 'No. Two data points agreeing is far weaker evidence than five, since a short run can agree by chance. The strength of a directional-agreement score depends on how many independent changes it was measured across, not just the percentage itself.' },
      ]),
    ]),
    mod(5, 'How Metric Selection Goes Wrong', [
      'Picking a good metric and picking it well are different skills. Loomwork\'s first attempt at fixing its dashboard problem actually made things worse, before it landed on WAP.',
      'Mistake one: no owner. The dashboard had eight metrics and nobody whose job was to move any single one of them, so nobody felt responsible when a number slipped.',
      'Mistake two: too many north stars. After the first review, three different teams each declared their own "north star", WAU for growth, NPS for product, ticket-close time for support, and leadership ended up back where it started: three numbers, no shared answer to "are we winning".',
      'Mistake three: optimizing for ease of measurement over meaning. Page views were on the dashboard for years mainly because the analytics tool made them easy to pull, not because anyone believed they mattered.',
      'A north star metric only works if exactly one number has an owner, everyone agrees it is the one that matters most this quarter, and it was chosen because it predicts outcomes, not because it was convenient to compute.',
      tryItBlock([
        { q: 'A startup picks "number of dashboards created" as its product north star because it is the easiest event to log. What is wrong with that reasoning?', a: 'The metric was chosen for measurement convenience, not because it was shown to predict a real outcome like retention or revenue. Easy to log is not the same as meaningful, and without checking whether it actually correlates with something the business cares about, it risks being vanity dressed up as a north star.' },
        { q: 'Two VPs at a company each insist their own metric is "the" north star, and neither will budge. What is the actual problem, and what would you push for instead of picking a winner yourself?', a: 'The real problem is not which metric is right, it is that the organization has not agreed on a single number to be accountable to, which means nobody experiences a real tradeoff when their favorite metric conflicts with the other. Instead of picking a winner unilaterally, push for a working session where both metrics get checked against actual outcomes (like WAP vs WAU\'s directional agreement with revenue in this course), so the choice is evidence-based rather than a turf negotiation.' },
      ]),
    ]),
    mod(6, 'Choosing a Metric: A Decision Cheat Sheet', [
      'Before adopting any metric as a headline number, run it through the same checks Loomwork used.',
      mdTable(
        ['Question', 'What it protects against'],
        [
          ['Is it vanity, proxy, or actionable?', 'Tracking activity instead of value'],
          ['Is it leading or lagging?', 'Finding out too late to act'],
          ['Does it move with the outcome you actually care about?', 'A metric that feels right but is not'],
          ['Does exactly one person or team own it?', 'A number nobody is accountable for'],
          ['Was it chosen because it is meaningful or because it is easy to measure?', 'Convenience metrics crowding out real ones'],
        ],
      ),
      'Loomwork\'s actual outcome: WAP replaced WAU as the north star, the old eight-metric dashboard was cut down to three (WAP, MRR, and NPS as a qualitative check), and each of the three got a named owner. None of that was visible from the original dashboard alone, it took checking each metric against the same data the way this course did.',
    ]),
  ];

  return { slug: 'choosing-product-metrics', name: 'Choosing Product Metrics', role: 'product-manager',
    description: 'Tell vanity metrics from actionable ones, pick a north star metric using evidence instead of opinion, and avoid the most common ways metric selection goes wrong, using one fictional product team\'s dataset.',
    datasetName: 'Loomwork', datasetNotes: `# Loomwork dataset notes\n\nFictional project-planning SaaS, 6 months (Jan-Jun).\n\nMRR ($): ${mrr.join(', ')}\nWAU: ${wau.join(', ')}\nWAP (weekly active projects, >=1 task completed): ${wap.join(', ')}\nOld dashboard metric types: ${JSON.stringify(typeCounts)}\nDirectional agreement vs revenue: WAU ${wauAgreePct}%, WAP ${wapAgreePct}%`,
    modules, charts };
}

// ============================================================
// COURSE 2: measuring-activation (Fernway, habit-tracking app)
// ============================================================
function courseActivation() {
  const funnelSteps = ['Signed up', 'Completed profile', 'Created first habit', 'Logged first check-in'];
  const funnelCounts = [500, 410, 340, 250];
  const s1 = pct(funnelCounts[1], funnelCounts[0]);
  const s2 = pct(funnelCounts[2], funnelCounts[1]);
  const s3 = pct(funnelCounts[3], funnelCounts[2]);
  const overallActivation = pct(funnelCounts[3], funnelCounts[0]);

  const ttaBuckets = [
    { label: '0-1 day', count: 110 },
    { label: '2-3 days', count: 70 },
    { label: '4-7 days', count: 45 },
    { label: '8+ days', count: 25 },
  ];
  const ttaTotal = sum(ttaBuckets.map((b) => b.count));

  const groupA = { label: 'Old onboarding', n: 260, activated: 118 };
  const groupB = { label: 'Guided setup (new)', n: 255, activated: 153 };
  const rateA = pct(groupA.activated, groupA.n);
  const rateB = pct(groupB.activated, groupB.n);

  const charts = [
    { file: 'activation-funnel.svg', alt: 'Bar chart of Fernway signup cohort narrowing across four activation funnel stages from 500 signups to 250 activated users', caption: 'Shown as a bar chart because this compares counts across four distinct stages, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Fernway: Activation Funnel (n=500 signups)', categories: funnelSteps, values: funnelCounts }) },
    { file: 'time-to-activate.svg', alt: 'Histogram of days between signup and first check-in among 250 activated Fernway users, most activating within a day', caption: 'Shown as a histogram because the point is the distribution of how long activation took, not a single average.',
      svg: chartBuilders.histogram({ title: 'Fernway: Time to First Check-in (activated users)', buckets: ttaBuckets, yLabel: 'users' }) },
    { file: 'onboarding-ab-test.svg', alt: 'Bar chart comparing activation rate between Fernway\'s old onboarding and a new guided-setup onboarding', caption: 'Shown as a bar chart because this is a direct comparison between two onboarding variants, not a trend.',
      svg: chartBuilders.bar({ title: 'Fernway: Activation Rate by Onboarding Variant', categories: [groupA.label, groupB.label], values: [rateA, rateB], valueSuffix: '%', yLabel: '%' }) },
  ];

  const modules = [
    mod(1, 'The Signup That Never Becomes a Habit', [
      'Fernway, a fictional habit-tracking app, had plenty of signups. What it did not have was a clear answer to how many of those signups ever actually experienced the product doing its job.',
      'Activation is the point where a new user reaches the product\'s real value for the first time, its "aha moment", not just the point where they made an account. For Fernway, that moment is logging a first check-in against a habit, proof the loop the whole app is built around actually happened once.',
      'The dataset: a cohort of 500 people who signed up for Fernway during the week of March 3. All figures are illustrative.',
      'This course walks through the activation funnel, how long activation takes, whether a change to onboarding actually moves the number, and the traps that make an activation metric lie.',
    ]),
    mod(2, 'The Activation Funnel', [
      'Every signup passes through the same sequence of steps on the way to being counted as activated.',
      mdTable(['Step', ...funnelSteps], [['Users remaining', ...funnelCounts.map(String)]]),
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `From signup to completed profile: ${s1}%. From completed profile to first habit created: ${s2}%. From first habit created to first check-in logged, the activation step itself: ${s3}%. Overall, ${overallActivation}% of the original 500 signups activated.`,
      `The biggest single drop is not where most teams assume. Signup to profile loses ${100 - s1}% of the cohort, but first-habit to first-check-in, the very last step, loses ${round1(100 - s3)}%, meaning a user can do almost everything right and still fall away before ever getting real value.`,
      tryItBlock([
        { q: 'Of the 340 users who created a first habit, 250 went on to log a first check-in. What is that step\'s conversion rate, and is it Fernway\'s strongest or weakest step?', a: '250/340 = 73.5%. Comparing all three steps (82.0%, 82.9%, 73.5%), this is the weakest step, the one losing the largest share of users who reach it.' },
        { q: 'A teammate says "activation is 68%" for Fernway. Using the numbers in this module, is that plausible, and what would you ask before trusting it?', a: 'Not plausible against this cohort, activation here is 50% (250/500). Before trusting a different number, ask what "activation" is being defined as, since a looser definition (like "completed profile" instead of "logged a first check-in") would produce a higher, more flattering, but less meaningful number.' },
      ]),
    ]),
    mod(3, 'How Long Activation Actually Takes', [
      'Knowing that 250 people activated is only half the picture. When they activated, relative to signing up, changes what Fernway should do about the users who have not yet.',
      mdTable(['Days to first check-in', ...ttaBuckets.map((b) => b.label)], [['Activated users', ...ttaBuckets.map((b) => String(b.count))]]),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `${ttaBuckets[0].count} of ${ttaTotal} activated users, ${pct(ttaBuckets[0].count, ttaTotal)}%, activated within a day of signing up. Only ${ttaBuckets[3].count} activated users, ${pct(ttaBuckets[3].count, ttaTotal)}%, took 8 or more days.`,
      'That shape says activation, when it happens, happens fast. It reframes the goal for the users who have not activated yet: a nudge on day 2 or 3 is working with the grain of the data, a nudge on day 10 is trying to revive something that has likely already gone cold.',
      tryItBlock([
        { q: 'Based on the bucket table, what share of activated users took 4 or more days (the "4-7 days" and "8+ days" buckets combined)?', a: '(45 + 25) / 250 = 70 / 250 = 28.0%. Just over a quarter of activations happen after the first few days, which is still worth designing reminders around even though most activation is fast.' },
        { q: 'If Fernway wanted to time a single reminder email to catch the largest number of not-yet-activated users at the moment they are statistically most likely to still activate, which bucket boundary would you target and why?', a: 'Around day 2, right at the edge of the "0-1 day" bucket. That is where the largest single group (110 of 250) activates, so a nudge landing just after day 1 is timed to catch the next-largest wave (the "2-3 days" bucket, 70 users) before they drift into the longer, smaller tail.' },
      ]),
    ]),
    mod(4, 'Does a New Onboarding Actually Change Activation', [
      'Fernway tested a "guided setup" onboarding flow against the existing one, splitting a later signup week into two parallel groups.',
      mdTable(['Group', 'Signups', 'Activated', 'Activation rate'], [
        [groupA.label, String(groupA.n), String(groupA.activated), `${rateA}%`],
        [groupB.label, String(groupB.n), String(groupB.activated), `${rateB}%`],
      ]),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `The guided setup lifted activation from ${rateA}% to ${rateB}%, a gain of ${round1(rateB - rateA)} percentage points, on comparably sized groups (${groupA.n} vs ${groupB.n} signups). That is large enough, and the groups similar enough in size, to act on rather than dismiss as noise.`,
      'Fernway rolled the guided setup out to all new signups the following week. The decision came directly from this comparison, not from which onboarding "felt" more polished.',
      tryItBlock([
        { q: 'Group A converted 118 of 260. If it had instead converted 118 of 130 (half the sample size, same activated count), would you trust the resulting rate as much?', a: 'No, even though the rate would look higher (90.8%), a sample of 130 is much smaller and more easily skewed by a handful of unusually engaged users. Trusting an A/B result also depends on the group sizes being large enough and comparable, not just on the headline rate.' },
        { q: 'What is one change other than onboarding that could produce a fake-looking lift in Group B\'s activation rate, and how would you rule it out?', a: 'If Group B happened to be recruited through a different, more highly-intentioned channel (say, an existing user\'s referral list) instead of a random split of the same signup pool, its higher activation could be about who joined, not about the onboarding flow. Ruling it out means confirming both groups were randomly assigned from the same signup source in the same week.' },
      ]),
    ]),
    mod(5, 'When Activation Numbers Lie', [
      'An activation rate is easy to inflate without actually helping anyone use the product.',
      'The most common trap is redefining the activation event to something easier to hit. If "activated" quietly changes from "logged a first check-in" to "created a first habit", Fernway\'s rate jumps from 50% to 68% (340/500) overnight, with nothing about real usage having changed.',
      'A second trap is counting an action that is easy but meaningless, like opening the app once from a push notification, as activation. That number can be pushed up with notification frequency alone, and it will not predict who sticks around.',
      'The check against both: does the activation event, on its own, predict whether someone is still using Fernway a month later? If a redefinition makes the rate go up but does not also improve month-later retention, the definition changed, not the product.',
      tryItBlock([
        { q: 'A PM proposes changing Fernway\'s activation definition from "logged a first check-in" to "opened the app on day 1". What question would you ask before agreeing?', a: 'Whether users who only open the app on day 1 (without creating a habit or logging a check-in) are actually more likely to stick around a month later than users who are not counted under the current definition. If opening the app alone does not predict later retention, the new definition would inflate the activation number without capturing anything real.' },
        { q: 'Fernway\'s activation rate jumps from 50% to 68% right after a definition change, with no product changes shipped that week. What is the appropriate reaction?', a: 'Treat it as a discontinuity in the metric\'s definition, not a real improvement, and hold both definitions side by side (or check the new definition against later retention) before reporting the jump as progress.' },
      ]),
    ]),
    mod(6, 'Activation: A Decision Cheat Sheet', [
      'Activation is the funnel step that turns a signup into someone who has actually experienced the product\'s value once.',
      mdTable(
        ['Question', 'What it tells you'],
        [
          ['Which funnel step loses the most users?', 'Where onboarding effort should focus first'],
          ['How long does activation typically take?', 'When a re-engagement nudge is still worth sending'],
          ['Did a specific change move the rate, on comparable groups?', 'Whether an onboarding bet paid off'],
          ['Does the activation event predict later retention?', 'Whether the definition is measuring something real'],
        ],
      ),
      'Fernway\'s actual result from this data: the guided setup shipped to everyone, and the day-2 reminder was retimed to land right after the "0-1 day" activation window closes, both decisions traceable straight back to the funnel and timing data in this course.',
    ]),
  ];

  return { slug: 'measuring-activation', name: 'Measuring Activation', role: 'product-manager',
    description: 'Read an activation funnel, understand how long activation takes, test whether onboarding changes actually move the number, and spot activation metrics that have been quietly inflated, using one fictional habit-tracking app\'s dataset.',
    datasetName: 'Fernway', datasetNotes: `# Fernway dataset notes\n\nFictional habit-tracking app.\n\nSignup cohort (n=500, week of Mar 3) funnel: ${funnelSteps.map((s, i) => `${s}=${funnelCounts[i]}`).join(', ')}\nTime to activate buckets (n=${ttaTotal}): ${JSON.stringify(ttaBuckets)}\nOnboarding A/B (week of Apr 7): ${groupA.label} n=${groupA.n} activated=${groupA.activated} (${rateA}%); ${groupB.label} n=${groupB.n} activated=${groupB.activated} (${rateB}%)`,
    modules, charts };
}

// ============================================================
// COURSE 3: measuring-retention (Briarcup, meal-planning app)
// ============================================================
function courseRetention() {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
  const cohorts = [
    { label: 'Jan cohort', n: 800, counts: [496, 408, 368, 344, 328, 320] },
    { label: 'Feb cohort', n: 850, counts: [571, 489, 447, 420, 404, 391] },
    { label: 'Mar cohort', n: 900, counts: [648, 558, 513, 486, 468, 459] },
  ];
  cohorts.forEach((c) => { c.pct = c.counts.map((v) => pct(v, c.n)); });

  const survey = [
    { reason: 'Too many notifications', count: 54 },
    { reason: 'Missing a feature', count: 40 },
    { reason: 'Lost interest', count: 38 },
    { reason: 'Switched to competitor', count: 29 },
    { reason: 'Price', count: 19 },
  ];
  const surveyTotal = sum(survey.map((s) => s.count));
  const topReason = survey.reduce((a, b) => (a.count > b.count ? a : b));

  const jan = cohorts[0];
  const w4 = { continuous: 290, resurrected: jan.counts[3] - 290 };
  const w5 = { continuous: 270, resurrected: jan.counts[4] - 270 };
  const w6 = { continuous: 255, resurrected: jan.counts[5] - 255 };

  const charts = [
    { file: 'retention-curves.svg', alt: 'Line chart of six-week retention percentage for three Briarcup signup cohorts, Jan, Feb, and Mar, showing each successive cohort retaining better', caption: 'Shown as a line chart because the point is the retention curve\'s shape across weeks, and how that shape shifts cohort over cohort.',
      svg: chartBuilders.line({ title: 'Briarcup: 6-Week Retention by Signup Cohort (%)', xLabels: weeks, series: [
        { name: cohorts[0].label, values: cohorts[0].pct, color: '#94a3b8' },
        { name: cohorts[1].label, values: cohorts[1].pct, color: '#0ea5e9' },
        { name: cohorts[2].label, values: cohorts[2].pct, color: '#10b981' },
      ], yLabel: '%' }) },
    { file: 'churn-reasons.svg', alt: 'Donut chart of exit survey reasons among 180 churned Briarcup users, split by too many notifications, missing a feature, lost interest, switched to competitor, and price', caption: 'Shown as a donut chart because this is composition, how the whole set of exit reasons splits, not a trend.',
      svg: chartBuilders.donut({ title: 'Briarcup: Why Users Churned (exit survey, n=180)', segments: survey.map((s) => ({ name: s.reason, value: s.count })) }) },
    { file: 'resurrected-users.svg', alt: 'Stacked bar chart of Jan cohort active users in weeks 4 through 6, split between continuously active and resurrected users', caption: 'Shown as a stacked bar chart because this is composition within each week, continuously active versus resurrected, not a single trend line.',
      svg: chartBuilders.stackedBar({ title: 'Briarcup: Jan Cohort Active Users, Weeks 4-6', categories: ['Week 4', 'Week 5', 'Week 6'], series: [
        { name: 'Continuously active', values: [w4.continuous, w5.continuous, w6.continuous], color: '#4f46e5' },
        { name: 'Resurrected', values: [w4.resurrected, w5.resurrected, w6.resurrected], color: '#f59e0b' },
      ] }) },
  ];

  const modules = [
    mod(1, 'A Retention Number Is Not a Retention Curve', [
      'Briarcup, a fictional meal-planning app, reported "45% week-one retention" every board meeting like it was the whole story. It is one point on a curve, and the curve is where the real signal lives.',
      'The dataset: three monthly signup cohorts at Briarcup, tracked for six weeks each after two product changes shipped between them, a meal-plan reminder notification (before the Feb cohort) and an onboarding tweak (before the Mar cohort). All figures are illustrative.',
      mdTable(['Cohort', 'Signups'], cohorts.map((c) => [c.label, String(c.n)])),
      'This course reads the full six-week curve across cohorts, digs into why users churn, and separates users who never left from users who came back after a gap.',
    ]),
    mod(2, 'Reading the Retention Curve', [
      'Retention here means the share of a signup cohort still logging at least one meal plan in a given week after joining.',
      mdTable(['Cohort', ...weeks], cohorts.map((c) => [`${c.label} (users)`, ...c.counts.map(String)])),
      mdTable(['Cohort', ...weeks], cohorts.map((c) => [`${c.label} (%)`, ...c.pct.map((p) => `${p}%`)])),
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `Every cohort's curve drops fastest in week 1 and flattens after that, a normal shape: the users who were never going to stick tend to leave early. What matters most for the business is where each curve flattens out, since that level is roughly what "long-term retained" looks like. The Jan cohort flattens around ${jan.pct[5]}%, the Mar cohort around ${cohorts[2].pct[5]}%.`,
      tryItBlock([
        { q: 'The Jan cohort drops from 62.0% in week 1 to 40.0% in week 6, a 22-point fall. Is most of that drop concentrated early or late in the curve?', a: 'Early. From week 1 to week 2 it falls from 62.0% to 51.0%, an 11-point drop, roughly half the entire six-week decline in a single week. From week 3 onward the curve barely moves (46.0% down to 40.0%), showing the curve has largely flattened.' },
        { q: 'A teammate wants to report "Briarcup retention is 68%" using only the Feb cohort\'s week-1 number. What is misleading about quoting that single figure?', a: 'Week 1 is the least stable point on any retention curve, before it has flattened out, so 68% overstates what will still be true by week 6 (47.5%). Quoting only the earliest week without the curve\'s later shape presents a temporary high point as if it were the steady-state number.' },
      ]),
    ]),
    mod(3, 'Did the Product Changes Actually Help', [
      'Two changes shipped between cohorts: a meal-plan reminder notification before the Feb cohort signed up, and an onboarding tweak before the Mar cohort signed up. The curves above are the evidence for whether either one worked.',
      `Week-6 retention moved from ${jan.pct[5]}% (Jan, before either change) to ${cohorts[1].pct[5]}% (Feb, after the reminder) to ${cohorts[2].pct[5]}% (Mar, after the onboarding tweak too), a gain of ${round1(cohorts[2].pct[5] - jan.pct[5])} percentage points across both changes.`,
      `The reminder notification alone accounts for ${round1(cohorts[1].pct[5] - jan.pct[5])} points of that gain (Jan to Feb), and the onboarding tweak for a further ${round1(cohorts[2].pct[5] - cohorts[1].pct[5])} points (Feb to Mar). Both moved the curve, not just one.`,
      'This is why Briarcup tracks retention cohort by cohort instead of as one rolling number: a rolling average would have blurred these two separate changes into a single vague upward drift, with no way to credit either one.',
      tryItBlock([
        { q: 'If Briarcup had shipped both the reminder notification and the onboarding tweak in the same week, instead of one cohort apart, what would be lost from this analysis?', a: 'The ability to attribute the retention gain to either change individually. With both bundled into one cohort transition, only the combined effect (all 9 points, Jan to Mar) would be visible, not the 5-point and 4-point contributions from each change separately.' },
        { q: 'Week-1 retention rose from 62.0% (Jan) to 70.0% (Mar), an 8-point gain, while week-6 retention rose only 9 points. Does the near-equal size of these two gains mean the changes affected early and late retention equally?', a: 'Not necessarily from these two numbers alone. Both weeks happened to move by a similar amount here, but that has to be checked at each week along the curve, not assumed. Modules 2\'s full week-by-week table shows the gains are not perfectly uniform across every week between Jan and Mar.' },
      ]),
    ]),
    mod(4, 'Why Users Actually Churn', [
      'Retention curves show that people leave. An exit survey sent to 180 churned Briarcup users in the same period shows why.',
      mdTable(['Reason', 'Respondents', 'Share'], survey.map((s) => [s.reason, String(s.count), `${pct(s.count, surveyTotal)}%`])),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `"${topReason.reason}" was the single largest reason, ${pct(topReason.count, surveyTotal)}% of the 180 respondents, ahead of missing features or price. That is an unusually fixable problem: it is a settings and defaults issue, not a product-market fit issue.`,
      'Briarcup\'s actual response: default notification frequency was cut from daily to twice weekly for new users, with an easy in-app control to change it, a direct action traceable to this chart rather than to price or feature complaints that would have needed a much bigger response.',
      tryItBlock([
        { q: 'If Briarcup had instead found "Price" was the top reason at 40% of 180 respondents, would the same notification-frequency fix make sense?', a: 'No. A price-driven churn problem calls for a pricing or value-communication response, not a notification setting change. The fix has to match the actual top reason in the data, not whichever fix is easiest to ship.' },
        { q: '"Missing a feature" and "Switched to competitor" together account for how many of the 180 respondents, and what does combining them (incorrectly) into one "product gap" bucket risk hiding?', a: '40 + 29 = 69 respondents (38.3% of 180). Combining them risks hiding that they call for different responses: missing a feature is an internal roadmap gap, while switching to a competitor could be about a gap, but could also be about pricing, brand, or something Briarcup does not offer at all, a broader competitive question than a feature list.' },
      ]),
    ]),
    mod(5, 'Retained vs. Resurrected: Not the Same User', [
      'A user active in week 6 is not necessarily someone who has been active every week since signup. Some left and came back, a "resurrected" user, and that group behaves differently from someone who never lapsed.',
      mdTable(['Week', 'Continuously active', 'Resurrected', 'Total active'], [
        ['Week 4', String(w4.continuous), String(w4.resurrected), String(jan.counts[3])],
        ['Week 5', String(w5.continuous), String(w5.resurrected), String(jan.counts[4])],
        ['Week 6', String(w6.continuous), String(w6.resurrected), String(jan.counts[5])],
      ]),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Resurrected users made up ${pct(w4.resurrected, jan.counts[3])}% of week 4\'s active total, ${pct(w5.resurrected, jan.counts[4])}% of week 5\'s, and ${pct(w6.resurrected, jan.counts[5])}% of week 6\'s, a share that grows slightly each week as more of the "continuously active" group naturally has a gap eventually.`,
      'This matters because a flat week-6 retention number treats a user who never left the same as one who lapsed for three weeks and quietly returned. If Briarcup wants to know whether its core loop keeps people engaged without interruption, the continuously-active count is the honest number, not the blended total.',
      tryItBlock([
        { q: 'Week 6 shows 320 total active users from the Jan cohort, with 255 continuously active. If a re-engagement email campaign specifically targeted lapsed users starting in week 5, what would you check to see if it worked?', a: 'Whether the resurrected count rose faster after the campaign than it would have on its own trend, for example by comparing the resurrected share in the weeks after the campaign against the weeks before it, rather than just looking at total active users, which blends resurrected and continuously-active users together.' },
        { q: 'Why might reporting only "320 users active in week 6" overstate the strength of Briarcup\'s core habit loop?', a: 'Because 65 of those 320 (20.3%) had already lapsed at least once and came back, meaning the app\'s core loop did not hold their attention continuously. A headline number that does not separate continuous from resurrected users credits the product with an unbroken habit that, for a fifth of active users, was not actually unbroken.' },
      ]),
    ]),
    mod(6, 'Retention: A Decision Cheat Sheet', [
      'A single retention percentage is a snapshot. The curve, the reasons behind it, and who is continuously active versus coming back are what turn it into something actionable.',
      mdTable(
        ['Question', 'What it tells you'],
        [
          ['Where does the curve flatten, and at what level?', 'What "long-term retained" actually looks like'],
          ['Did retention move after a specific shipped change?', 'Whether that change is worth keeping or repeating'],
          ['What does the exit survey say, ranked by share?', 'Which fix to prioritize first'],
          ['What share of active users are resurrected vs. continuous?', 'Whether the core loop truly holds attention without gaps'],
        ],
      ),
      'None of these four answers come from a single retention number reported in isolation. They come from the curve, the survey, and the week-by-week active breakdown together, the same three views this course walked through.',
    ]),
  ];

  return { slug: 'measuring-retention', name: 'Measuring Retention', role: 'product-manager',
    description: 'Read a cohort retention curve instead of a single percentage, connect curve changes to specific product changes, understand why users churn, and separate continuously active users from resurrected ones, using one fictional meal-planning app\'s dataset.',
    datasetName: 'Briarcup', datasetNotes: `# Briarcup dataset notes\n\nFictional meal-planning app. 3 monthly signup cohorts, 6 weeks tracked each.\n\n${cohorts.map((c) => `${c.label} (n=${c.n}): counts=${c.counts.join(',')} pct=${c.pct.join(',')}`).join('\n')}\nExit survey (n=${surveyTotal}): ${JSON.stringify(survey)}\nJan cohort weeks 4-6 continuous/resurrected: ${JSON.stringify({ w4, w5, w6 })}`,
    modules, charts };
}

// ============================================================
// COURSE 4: measuring-conversion (Ashgrove Journal, freemium -> paid)
// ============================================================
function courseConversion() {
  const funnelSteps = ['Trial started', 'Used core feature (3+ entries)', 'Hit paywall', 'Converted to paid'];
  const funnelCounts = [1000, 640, 410, 145];
  const s1 = pct(funnelCounts[1], funnelCounts[0]);
  const s2 = pct(funnelCounts[2], funnelCounts[1]);
  const s3 = pct(funnelCounts[3], funnelCounts[2]);
  const overall = pct(funnelCounts[3], funnelCounts[0]);

  const channels = [
    { name: 'Organic search', trials: 420, paid: 71 },
    { name: 'Paid social', trials: 310, paid: 32 },
    { name: 'Referral', trials: 150, paid: 34 },
    { name: 'Newsletter', trials: 120, paid: 8 },
  ];
  channels.forEach((c) => { c.rate = pct(c.paid, c.trials); });
  const bestChannel = channels.reduce((a, b) => (a.rate > b.rate ? a : b));
  const worstChannel = channels.reduce((a, b) => (a.rate < b.rate ? a : b));

  const planA = { label: 'Plan A ($8/mo)', n: 205, converted: 79, price: 8 };
  const planB = { label: 'Plan B ($12/mo, annual framing)', n: 205, converted: 66, price: 12 };
  const rateA = pct(planA.converted, planA.n);
  const rateB = pct(planB.converted, planB.n);
  const revenueA = planA.converted * planA.price;
  const revenueB = planB.converted * planB.price;

  const ttcBuckets = [
    { label: 'Same day', count: 52 },
    { label: '1-3 days', count: 48 },
    { label: '4-7 days', count: 28 },
    { label: '8+ days', count: 17 },
  ];
  const ttcTotal = sum(ttcBuckets.map((b) => b.count));

  const charts = [
    { file: 'conversion-funnel.svg', alt: 'Bar chart of Ashgrove Journal trial cohort narrowing across four stages from 1000 trial starts to 145 paid conversions', caption: 'Shown as a bar chart because this compares counts across four distinct funnel stages, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Ashgrove Journal: Trial-to-Paid Funnel (n=1000 trials)', categories: funnelSteps, values: funnelCounts }) },
    { file: 'conversion-by-channel.svg', alt: 'Bar chart of paid conversion rate by acquisition channel for Ashgrove Journal, organic search, paid social, referral, and newsletter', caption: 'Shown as a bar chart because this compares conversion rate across four acquisition channels, not a trend.',
      svg: chartBuilders.bar({ title: 'Ashgrove Journal: Conversion Rate by Channel', categories: channels.map((c) => c.name), values: channels.map((c) => c.rate), valueSuffix: '%', yLabel: '%' }) },
    { file: 'time-to-convert.svg', alt: 'Histogram of days between hitting the paywall and paying among 145 converted Ashgrove Journal users, most converting within three days', caption: 'Shown as a histogram because the point is the distribution of how long conversion took, not a single average.',
      svg: chartBuilders.histogram({ title: 'Ashgrove Journal: Time from Paywall to Payment', buckets: ttcBuckets, yLabel: 'users' }) },
  ];

  const modules = [
    mod(1, 'A Trial Is Not a Customer', [
      'Ashgrove Journal, a fictional subscription writing app, gives every new user a free trial: write freely, but past 3 entries the app asks for payment. Conversion is the step from "tried it" to "pays for it".',
      'The dataset: 1,000 trial starts in a single month at Ashgrove Journal, followed all the way through to payment or drop-off. All figures are illustrative.',
      mdTable(['Metric', 'Value'], [['Trial starts', '1000'], ['Tracking window', '1 month']]),
      'This course covers the conversion funnel itself, which acquisition channels actually convert, why the highest conversion rate is not always the best business decision, and how long it takes people to pay once they hit the paywall.',
    ]),
    mod(2, 'The Trial-to-Paid Funnel', [
      'Every trial user moves through the same four stages, and most drop off before ever seeing a bill.',
      mdTable(['Stage', ...funnelSteps], [['Users remaining', ...funnelCounts.map(String)]]),
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `Trial to core-feature use: ${s1}%. Core-feature use to hitting the paywall: ${s2}%. Paywall to paid: ${s3}%. Overall, ${overall}% of the original 1,000 trials became paying customers.`,
      `The paywall itself is not the biggest leak, only ${round1(100 - s3)}% of the people who hit it walk away without paying. The bigger leak is upstream: ${round1(100 - s1)}% of trials never even use the core feature enough to reach the paywall at all, meaning most lost revenue never reaches a pricing decision, it is lost to onboarding.`,
      tryItBlock([
        { q: 'Of the 640 users who used the core feature, 410 went on to hit the paywall. What is that step\'s conversion rate?', a: '410/640 = 64.1%.' },
        { q: 'A colleague argues the paywall page needs a redesign because "only 35.4% of people who hit it pay." Using the funnel numbers, would you prioritize that over fixing the trial-start-to-core-feature step?', a: 'No, not first. Only 64.0% of trial starts ever use the core feature enough to reach the paywall at all, a bigger absolute loss (360 users) than the 265 lost at the paywall itself. Fixing the earlier step would put more people in front of the paywall to begin with, which compounds with any later paywall improvement.' },
      ]),
    ]),
    mod(3, 'Which Channel Actually Converts', [
      'Not every trial user came from the same place, and the channels do not convert equally.',
      mdTable(['Channel', 'Trials', 'Paid', 'Conversion rate'], channels.map((c) => [c.name, String(c.trials), String(c.paid), `${c.rate}%`])),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `${bestChannel.name} converts best at ${bestChannel.rate}%, despite bringing in only ${bestChannel.trials} of the 1,000 trials, the smallest volume of any channel. ${worstChannel.name} converts worst at ${worstChannel.rate}%, even though it delivered ${worstChannel.trials} trials.`,
      'Volume and quality are not the same thing here. A channel spend decision based only on trial count, without checking through to paid conversion, would have kept funding the weakest channel and underfunding the strongest one.',
      tryItBlock([
        { q: 'Referral brought in 150 trials and converted 34 to paid. If Ashgrove Journal doubled referral volume to 300 trials at the same 22.7% rate, roughly how many paid customers would that produce?', a: 'Approximately 300 x 0.227 = 68 paid customers, versus 34 today, assuming the rate holds at higher volume (which is not guaranteed, but is the reasonable first estimate).' },
        { q: 'Newsletter delivered 120 trials at a 6.7% conversion rate, the worst of the four channels. Before cutting newsletter spend entirely, what would you want to check?', a: 'Whether the newsletter audience is systematically different (for example, casual subscribers who signed up for content, not for the app itself) versus whether the newsletter\'s trial-to-paid experience itself is broken. If it is an audience-fit issue, cutting spend is reasonable; if something in the funnel treats newsletter trials differently, that might be fixable instead of a reason to cut the channel.' },
      ]),
    ]),
    mod(4, 'A Higher Conversion Rate Is Not Always More Revenue', [
      'Ashgrove Journal tested two prices against separate, equally sized groups of users who had just hit the paywall.',
      mdTable(['Plan', 'Paywall hits', 'Converted', 'Conversion rate', 'Monthly revenue from this cohort'], [
        [planA.label, String(planA.n), String(planA.converted), `${rateA}%`, `$${revenueA}`],
        [planB.label, String(planB.n), String(planB.converted), `${rateB}%`, `$${revenueB}`],
      ]),
      `Plan A converted better, ${rateA}% versus ${rateB}%. But Plan A is a cheaper price, so its higher conversion rate produced less total revenue: ${planA.converted} customers at $${planA.price} is $${revenueA}, against ${planB.converted} customers at $${planB.price} which is $${revenueB}, ${round1(((revenueB - revenueA) / revenueA) * 100)}% more revenue from a lower conversion rate.`,
      'This is the trap in optimizing for conversion rate alone: it treats every conversion as equally valuable, when the actual business goal is revenue, not a percentage. Ashgrove Journal kept Plan B\'s pricing.',
      tryItBlock([
        { q: 'If Plan B had converted only 50 of 205 users instead of 66, would it still have out-earned Plan A?', a: '50 x $12 = $600, versus Plan A\'s $632. No, at 50 conversions Plan B would earn less than Plan A, so the revenue comparison genuinely depends on the actual conversion counts, not just which plan costs more.' },
        { q: 'Why is comparing "conversion rate" alone, without the price attached, an incomplete way to choose between the two plans?', a: 'Conversion rate only measures how many people said yes, not how much each yes is worth. Two plans can have very different rates and still produce the opposite revenue ranking once each conversion is weighted by its price, which is exactly what happened between Plan A and Plan B here.' },
      ]),
    ]),
    mod(5, 'How Long Until They Pay', [
      'Among the 145 users who did convert, most did not wait long once they hit the paywall.',
      mdTable(['Time from paywall to payment', ...ttcBuckets.map((b) => b.label)], [['Converted users', ...ttcBuckets.map((b) => String(b.count))]]),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `${ttcBuckets[0].count} of ${ttcTotal} converted users, ${pct(ttcBuckets[0].count, ttcTotal)}%, paid the same day they hit the paywall. Combined with the "1-3 days" bucket, ${pct(ttcBuckets[0].count + ttcBuckets[1].count, ttcTotal)}% converted within 3 days.`,
      'That shape sets the clock for follow-up: a payment-reminder email sent on day 5 is chasing the smallest, slowest-moving part of the converting population. Most of the decision, when it happens at all, happens fast.',
      tryItBlock([
        { q: 'What share of converted users took 4 or more days to pay (the "4-7 days" and "8+ days" buckets combined)?', a: '(28 + 17) / 145 = 45 / 145 = 31.0%.' },
        { q: 'Given this distribution, does it make more sense to send a single payment-reminder email on day 4, or two reminders, one on day 1 and one on day 5?', a: 'Two reminders timed that way fit the data better. A day-1 reminder would land right as the largest group (same-day and 1-3 day converters, 100 of 145, 69.0%) is actively deciding, while a day-5 reminder still reaches most of the smaller, slower-converting tail. A single day-4 reminder would miss the peak decision window for the majority.' },
      ]),
    ]),
    mod(6, 'Conversion: A Decision Cheat Sheet', [
      'Conversion is a funnel, a channel comparison, a revenue calculation, and a timing question, not just one rate.',
      mdTable(
        ['Question', 'What it tells you'],
        [
          ['Where in the funnel is the biggest absolute drop?', 'Whether to fix the paywall or fix what happens before it'],
          ['Which channel converts best, not just which brings the most trials?', 'Where to shift acquisition spend'],
          ['Does the higher conversion rate also mean higher revenue?', 'Whether price and rate are being weighed correctly'],
          ['How long does conversion typically take?', 'When follow-up outreach is still likely to work'],
        ],
      ),
      'Ashgrove Journal\'s actual decisions from this data: onboarding investment shifted to the trial-start-to-core-feature step, spend moved toward referral and away from newsletter, Plan B\'s pricing was kept, and payment reminders were retimed to day 1 and day 5. Every one of those traces back to a specific table in this course, not a gut call.',
    ]),
  ];

  return { slug: 'measuring-conversion', name: 'Measuring Conversion', role: 'product-manager',
    description: 'Read a trial-to-paid funnel, compare acquisition channels on conversion rather than volume, weigh conversion rate against actual revenue, and time follow-up outreach using real conversion timing, using one fictional subscription app\'s dataset.',
    datasetName: 'Ashgrove Journal', datasetNotes: `# Ashgrove Journal dataset notes\n\nFictional freemium subscription writing app. 1000 trial starts in one month.\n\nFunnel: ${funnelSteps.map((s, i) => `${s}=${funnelCounts[i]}`).join(', ')}\nChannels: ${JSON.stringify(channels)}\nPricing A/B (paywall-hit samples): ${JSON.stringify({ planA, planB, rateA, rateB, revenueA, revenueB })}\nTime to convert buckets (n=${ttcTotal}): ${JSON.stringify(ttcBuckets)}`,
    modules, charts };
}

// ============================================================
// COURSE 5: product-metrics-that-mislead (Nettleback, social bookmarking app)
// ============================================================
function courseMisleadingMetrics() {
  const weeks = Array.from({ length: 8 }, (_, i) => `W${i + 1}`);
  const dau = [12000, 12400, 12900, 13500, 14200, 15000, 15800, 16700];
  const realSessions = [9800, 9600, 9300, 9000, 8700, 8500, 8300, 8100];
  const ghostShareW1 = pct(dau[0] - realSessions[0], dau[0]);
  const ghostShareW8 = pct(dau[7] - realSessions[7], dau[7]);
  const dauGrowth = round1(((dau[7] - dau[0]) / dau[0]) * 100);
  const realChange = round1(((realSessions[7] - realSessions[0]) / realSessions[0]) * 100);

  const period1 = { power: { share: 200, retained: 160 }, casual: { share: 800, retained: 320 } };
  const period2 = { power: { share: 550, retained: 429 }, casual: { share: 450, retained: 171 } };
  const p1PowerRate = pct(period1.power.retained, period1.power.share);
  const p1CasualRate = pct(period1.casual.retained, period1.casual.share);
  const p2PowerRate = pct(period2.power.retained, period2.power.share);
  const p2CasualRate = pct(period2.casual.retained, period2.casual.share);
  const aggregate1 = pct(period1.power.retained + period1.casual.retained, period1.power.share + period1.casual.share);
  const aggregate2 = pct(period2.power.retained + period2.casual.retained, period2.power.share + period2.casual.share);

  const activeUsers = { n: 850, avgRating: 4.6 };
  const churnedUsers = { n: 150, avgRating: 2.1 };
  const blendedRating = round1((activeUsers.n * activeUsers.avgRating + churnedUsers.n * churnedUsers.avgRating) / (activeUsers.n + churnedUsers.n));

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const bookmarksSaved = [40, 48, 56, 68]; // thousands
  const bookmarksRevisited = [14, 14.5, 15, 15.5]; // thousands
  const bookmarkGrowth = round1(((bookmarksSaved[3] - bookmarksSaved[0]) / bookmarksSaved[0]) * 100);
  const revisitGrowth = round1(((bookmarksRevisited[3] - bookmarksRevisited[0]) / bookmarksRevisited[0]) * 100);

  const charts = [
    { file: 'dau-vs-real-engagement.svg', alt: 'Line chart comparing Nettleback daily active users, which climbs steadily, against real sessions with meaningful activity, which declines, over eight weeks', caption: 'Shown as a line chart because the point is comparing two trends over time that move in opposite directions.',
      svg: chartBuilders.line({ title: 'Nettleback: DAU vs. Real Engaged Sessions', xLabels: weeks, series: [
        { name: 'DAU', values: dau, color: '#4f46e5' },
        { name: 'Real sessions (>30s active)', values: realSessions, color: '#ef4444' },
      ], yLabel: 'users' }) },
    { file: 'mix-shift.svg', alt: 'Stacked bar chart of Nettleback user base composition by power users and casual users in two periods, showing the mix shifting heavily toward power users', caption: 'Shown as a stacked bar chart because the point is how the composition of the user base shifted between the two periods, not a single trend.',
      svg: chartBuilders.stackedBar({ title: 'Nettleback: User Base Mix, Period 1 vs. Period 2', categories: ['Period 1', 'Period 2'], series: [
        { name: 'Power users', values: [period1.power.share, period2.power.share], color: '#10b981' },
        { name: 'Casual users', values: [period1.casual.share, period2.casual.share], color: '#94a3b8' },
      ] }) },
    { file: 'active-only-vs-blended-rating.svg', alt: 'Bar chart comparing Nettleback\'s average rating counting only currently active users against a blended average that includes churned users\' exit survey ratings', caption: 'Shown as a bar chart because this is a direct comparison between two ways of computing the same average, not a trend.',
      svg: chartBuilders.bar({ title: 'Nettleback: Active-Only vs. Blended Average Rating', categories: ['Active users only', 'Blended (all users)'], values: [activeUsers.avgRating, blendedRating], yLabel: 'rating (out of 5)' }) },
  ];

  const modules = [
    mod(1, 'A Correct Number Can Still Mislead', [
      'Every metric in this course is computed correctly. That is what makes them dangerous: nobody caught a math error, the traps here are about what a correct number leaves out.',
      'Nettleback, a fictional social bookmarking app, is the setting for all four. All figures are illustrative.',
      'Four traps, in order: a growth metric that hides declining real engagement, an aggregate number that improves while every underlying group gets worse, an average that quietly excludes the people most likely to disagree with it, and a target that gets gamed the moment it becomes a target.',
    ]),
    mod(2, 'Trap One: The Vanity Metric Hiding a Decline', [
      'Nettleback\'s weekly DAU chart, shown to the board every quarter, climbed for eight straight weeks. Underneath it, a second number, sessions where a user was actually active on the page for more than 30 seconds, was falling the whole time.',
      mdTable(['Week', ...weeks], [['DAU', ...dau.map(String)], ['Real sessions (>30s active)', ...realSessions.map(String)]]),
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `DAU rose ${dauGrowth}% over the eight weeks. Real engaged sessions fell ${Math.abs(realChange)}% over the same period. The gap between the two, ghost sessions, bot traffic, and notification-triggered opens with no real activity, grew from ${ghostShareW1}% of DAU in week 1 to ${ghostShareW8}% by week 8.`,
      'By week 8, over half of what the DAU chart counted was not a real engaged visit. The chart that looked like Nettleback\'s best quarter was actually describing a bot problem getting worse.',
      tryItBlock([
        { q: 'DAU grew 39.2% over eight weeks. Using the ghost-session share figures, roughly how much of that headline growth is real versus ghost traffic?', a: 'None of the growth is real, real sessions actually fell 17.3% over the same period. All of DAU\'s 39.2% increase came from the ghost-session gap widening (from 18.3% to 51.5% of DAU), not from more real usage.' },
        { q: 'What is one metric Nettleback could add alongside DAU that would have caught this problem sooner than waiting eight weeks?', a: 'A metric like "sessions with 30+ seconds of active time" (the real-sessions line itself) or "DAU that also completed a core action" tracked alongside DAU from week 1, so a diverging gap between the two would show up immediately rather than only being noticed after the fact.' },
      ]),
    ]),
    mod(3, 'Trap Two: Simpson\'s Paradox in Aggregate Retention', [
      'Nettleback\'s aggregate week-6 retention jumped from 48% to 60% between two periods, a huge apparent win. Both of the two user segments that make up that aggregate, power users and casual users, individually got worse over the same stretch.',
      mdTable(['Segment', 'Period 1 users', 'Period 1 retained', 'Period 1 rate', 'Period 2 users', 'Period 2 retained', 'Period 2 rate'], [
        ['Power users', String(period1.power.share), String(period1.power.retained), `${p1PowerRate}%`, String(period2.power.share), String(period2.power.retained), `${p2PowerRate}%`],
        ['Casual users', String(period1.casual.share), String(period1.casual.retained), `${p1CasualRate}%`, String(period2.casual.share), String(period2.casual.retained), `${p2CasualRate}%`],
      ]),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `Power-user retention fell from ${p1PowerRate}% to ${p2PowerRate}%. Casual-user retention fell from ${p1CasualRate}% to ${p2CasualRate}%. Yet aggregate retention rose from ${aggregate1}% to ${aggregate2}%, because power users, who retain far better than casual users at both points in time, grew from ${pct(period1.power.share, period1.power.share + period1.casual.share)}% of the user base to ${pct(period2.power.share, period2.power.share + period2.casual.share)}%.`,
      'The aggregate number did not lie about its own arithmetic. It lied about the story, because the mix of who is in the average shifted enough to overwhelm two real declines. Reporting "retention is up" off the aggregate alone would have missed that the product got worse for both types of user.',
      tryItBlock([
        { q: 'Aggregate retention rose 12 points (48% to 60%) even though both segments declined 2 points each. What single change in the data is responsible?', a: 'The composition shift: power users (who retain much higher than casual users in both periods) grew from 20% to 55% of the user base. Since the aggregate is a weighted average, weighting more heavily toward the higher-retaining segment raises the aggregate even while both segments individually decline.' },
        { q: 'What check would have caught this before it was reported to leadership as a retention win?', a: 'Breaking the aggregate down by segment before reporting it, the same table shown in this module. Any time an aggregate metric is reported, checking it against its major underlying segments catches a mix-shift illusion that the single number alone cannot reveal.' },
      ]),
    ]),
    mod(4, 'Trap Three: Survivorship Bias in the Average Rating', [
      'Nettleback reported an average in-app rating of 4.6 out of 5 for a quarter. That average only ever included users still active enough to be asked, current users. Churned users were never in the sample.',
      mdTable(['Group', 'Users', 'Average rating'], [
        ['Active users (surveyed in-app)', String(activeUsers.n), String(activeUsers.avgRating)],
        ['Churned users (exit survey)', String(churnedUsers.n), String(churnedUsers.avgRating)],
      ]),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Blending both groups: (${activeUsers.n} x ${activeUsers.avgRating} + ${churnedUsers.n} x ${churnedUsers.avgRating}) / (${activeUsers.n} + ${churnedUsers.n}) = ${blendedRating}, a full ${round1(activeUsers.avgRating - blendedRating)} points lower than the reported 4.6.`,
      'The 4.6 was not a false number, it was an honest average of the wrong population: the people who liked the product enough to still be using it. Anyone who disliked it enough to leave was excluded from the sample by definition, which is exactly what survivorship bias means.',
      tryItBlock([
        { q: 'If churned users\' average rating had been 4.0 instead of 2.1, much closer to the active users\' 4.6, would the survivorship bias problem still matter?', a: 'It would matter less in this specific case, since the two populations would agree more closely and the blended average would land close to 4.6 anyway. The bias is still present in principle (churned users are still excluded from the "active only" number by construction), but its practical impact shrinks when the excluded group does not actually feel differently.' },
        { q: 'Name one other Nettleback metric, besides average rating, that would likely suffer from the same survivorship bias if computed only from current users.', a: 'Average session length, feature satisfaction scores, or NPS collected only through the app, any metric gathered by asking currently active users would systematically exclude the people who disliked the product enough to already leave, the same structural bias as the rating example.' },
      ]),
    ]),
    mod(5, 'Trap Four: When the Metric Becomes the Target', [
      'Nettleback\'s growth team set "bookmarks saved per week" as a quarterly OKR. The number rose. Whether people actually came back to use what they saved did not rise nearly as much.',
      mdTable(['Quarter', ...quarters], [['Bookmarks saved (thousands)', ...bookmarksSaved.map(String)], ['Bookmarks later revisited (thousands)', ...bookmarksRevisited.map(String)]]),
      `Bookmarks saved grew ${bookmarkGrowth}% across the year. Bookmarks that were ever revisited later grew only ${revisitGrowth}%, essentially flat. Once "bookmarks saved" became the number the growth team was measured on, features nudged users to save more (one-tap save prompts, save streaks) without any corresponding push to make saved items useful again.`,
      'This is Goodhart\'s law in practice: a measure that was a reasonable proxy for engagement, back when nobody was optimizing it directly, stopped being a good proxy the moment it became the target itself. The number the team was accountable for kept climbing while the behavior it was supposed to represent did not.',
      tryItBlock([
        { q: 'Bookmarks saved rose 70.0% while revisits rose 10.7%. If Nettleback\'s leadership only looked at "bookmarks saved" on a dashboard, what conclusion would they wrongly draw?', a: 'That user engagement with saved content nearly doubled, when in fact the far more meaningful number, whether people ever came back to something they saved, barely moved. The save count alone paints a much rosier picture than the revisit data supports.' },
        { q: 'What companion metric would you pair with "bookmarks saved" to make the OKR harder to game?', a: 'A ratio or rate metric like "revisit rate" (bookmarks revisited within some window, divided by bookmarks saved), tracked alongside the raw save count. A raw count is easy to inflate with UI nudges; a rate tied to actual later use is much harder to game without genuinely improving the underlying behavior.' },
      ]),
    ]),
    mod(6, 'Misleading Metrics: A Decision Cheat Sheet', [
      'Before trusting a metric that is moving in a good direction, check it against the same four traps covered here.',
      mdTable(
        ['Trap', 'Question to ask'],
        [
          ['Vanity growth', 'Does a "real activity" companion metric agree with the headline number?'],
          ['Simpson\'s paradox', 'Does the aggregate still hold up when broken down by segment?'],
          ['Survivorship bias', 'Does the sample include people who left, not just people who stayed?'],
          ['Goodhart\'s law', 'Has this number become someone\'s target, and if so, is a harder-to-game companion metric tracked alongside it?'],
        ],
      ),
      'Every trap in this course produced a technically correct number. The failure was never arithmetic, it was trusting one number in isolation instead of checking it against the segment, the excluded population, or the behavior it was meant to represent.',
    ]),
  ];

  return { slug: 'product-metrics-that-mislead', name: 'Product Metrics That Mislead', role: 'product-manager',
    description: 'Learn to catch vanity-metric growth that hides real decline, Simpson\'s paradox in aggregate numbers, survivorship bias in averages, and Goodhart\'s law when a metric becomes a target, using one fictional social bookmarking app\'s dataset.',
    datasetName: 'Nettleback', datasetNotes: `# Nettleback dataset notes\n\nFictional social bookmarking app.\n\nDAU vs real sessions (8 weeks): DAU=${dau.join(',')} real=${realSessions.join(',')}\nMix-shift retention: period1=${JSON.stringify(period1)} period2=${JSON.stringify(period2)} aggregate1=${aggregate1}% aggregate2=${aggregate2}%\nRating survivorship: active n=${activeUsers.n} avg=${activeUsers.avgRating}; churned n=${churnedUsers.n} avg=${churnedUsers.avgRating}; blended=${blendedRating}\nBookmarks Goodhart: saved(000s)=${bookmarksSaved.join(',')} revisited(000s)=${bookmarksRevisited.join(',')}`,
    modules, charts };
}

console.log('[data] all 5 Product Manager courses built');
export { mod, chartBlock, tryItBlock, mdTable, round1, avg, sum, pct, chartBuilders, BUNNY, API, ROOT, execFileSync, fs, path,
  courseChoosingMetrics, courseActivation, courseRetention, courseConversion, courseMisleadingMetrics };
