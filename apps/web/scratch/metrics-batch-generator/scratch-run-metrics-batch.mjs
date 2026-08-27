import { mdTable, round1, avg, sum, pct, chartBuilders, BUNNY, API, ROOT, execFileSync, fs, path } from './scratch-gen-metrics-batch.mjs';

// ============================================================
// Shared module-body composer
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
// COURSE 1: measuring-developer-productivity (Relay, 8 engineers, 12 weeks)
// ============================================================
function courseDeveloperProductivity() {
  const engineers = ['Priya', 'Tom', 'Wei', 'Nadia', 'Sam', 'Ines', 'Marcus', 'Yuki'];
  const weeks = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
  const cycleTimeHrs = [38, 41, 36, 44, 52, 49, 33, 30, 28, 31, 27, 26]; // trending down
  const deepWork = [18, 22, 14, 20, 26, 12, 19, 24]; // per engineer, hrs/week
  const meetingLoad = [12, 9, 15, 11, 6, 17, 10, 8];
  const teamHours = { coding: 620, reviewing: 210, meetings: 340, support: 180 };
  const teamTotal = sum(Object.values(teamHours));

  const charts = [
    {
      file: 'cycle-time-trend.svg',
      alt: 'Line chart of Relay PR cycle time in hours across 12 weeks, trending from the high 30s down to the mid 20s',
      caption: 'Shown as a line chart because the point is the trend across 12 weeks, not a single comparison.',
      svg: chartBuilders.line({ title: 'Relay: PR Cycle Time by Week (hours)', xLabels: weeks, series: [{ name: 'Cycle time', values: cycleTimeHrs }], yLabel: 'hours' }),
    },
    {
      file: 'deep-work-vs-meetings.svg',
      alt: 'Bar chart comparing deep work hours per week across 8 Relay engineers',
      caption: 'Shown as a bar chart because the point is comparing eight engineers against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Relay: Deep Work Hours per Week by Engineer', categories: engineers, values: deepWork, yLabel: 'hours' }),
    },
    {
      file: 'where-hours-go.svg',
      alt: 'Donut chart showing how the Relay team’s total weekly hours split across coding, reviewing, meetings, and support',
      caption: 'Shown as a donut chart because this is composition, how one whole (the team’s total hours) splits into parts, not a comparison across separate items.',
      svg: chartBuilders.donut({ title: 'Relay: Where the Team’s Hours Go', segments: Object.entries(teamHours).map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value })) }),
    },
  ];

  const avgCycleStart = round1(avg(cycleTimeHrs.slice(0, 3)));
  const avgCycleEnd = round1(avg(cycleTimeHrs.slice(-3)));
  const topDeepWork = engineers[deepWork.indexOf(Math.max(...deepWork))];
  const lowDeepWork = engineers[deepWork.indexOf(Math.min(...deepWork))];
  const meetingPct = pct(teamHours.meetings, teamTotal);

  const modules = [
    mod(1, 'What "Developer Productivity" Actually Means', [
      'A manager once asked Relay’s tech lead to rank engineers by lines of code shipped that quarter. The tech lead refused, and this course is basically the long version of why.',
      'This course uses one dataset throughout: Relay, a fictional 8-engineer platform team, tracked over a 12-week quarter. Eight engineers: Priya, Tom, Wei, Nadia, Sam, Ines, Marcus, and Yuki. All figures below are illustrative, built for this course, not benchmarks from any real company.',
      'Every module follows the same shape: a raw data table, the arithmetic worked out in the open, a chart, and what the number should change about how the team works. None of these metrics matter in isolation. They matter because they point at a decision.',
      'Charts in this course use whichever form fits the data: a line for something that changes week to week, a bar for comparing separate items side by side, a donut for showing how one whole splits into parts. The caption under each chart says why that shape was picked.',
    ]),
    mod(2, 'PR Cycle Time: From Open to Merged', [
      'Cycle time is the hours between opening a pull request and it landing in main. It is the single number that captures how long code sits waiting, not how long it takes to write.',
      mdTable(['Week', ...weeks], [['Cycle time (hrs)', ...cycleTimeHrs.map(String)]]),
      `The first three weeks averaged ${avgCycleStart} hours per PR. The last three weeks averaged ${avgCycleEnd} hours, a drop of ${round1(avgCycleStart - avgCycleEnd)} hours. Nothing about how fast engineers type changed in that window. What changed, according to Relay’s retro notes, was that the team moved from a single shared reviewer queue to review being assigned automatically the moment a PR opened.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `A cycle time chart trending down is good news, but only if PR size stayed flat. A team can also cut cycle time by quietly shipping smaller, less risky PRs. Relay’s median PR size held at 180 lines across the whole quarter, so the drop here is a real process win, not a size trick.`,
      tryItBlock([
        { q: 'Weeks 4 and 5 spike to 44 and 52 hours. What is one non-obvious explanation that has nothing to do with the engineers being slower?', a: 'A likely explanation is reviewer availability, someone key to the review queue was out (leave, an incident, a conference) and PRs simply waited longer for a first look. The fix is a backup reviewer rule, not asking engineers to work faster.' },
        { q: 'If Relay wanted to cut cycle time further, would you rather they reduce PR size or add more reviewers? Use the data to justify your answer.', a: 'Reduce PR size. Median size already held flat while cycle time fell through a process change (auto-assignment), which suggests the bottleneck was queueing, not reviewer count. Smaller PRs get reviewed faster per PR and are easier to reason about, compounding the existing gain instead of just adding more people to the same queue.' },
      ]),
    ]),
    mod(3, 'Deep Work Time: The Metric Meetings Are Fighting', [
      'Deep work time is the hours per week an engineer spends in an uninterrupted block of 90 minutes or longer, actually writing or debugging code. Relay tracked this via calendar analysis for one representative week.',
      mdTable(['Engineer', ...engineers], [['Deep work (hrs)', ...deepWork.map(String)]]) + '\n\n' + mdTable(['Engineer', ...engineers], [['Meeting load (hrs)', ...meetingLoad.map(String)]]),
      `${topDeepWork} logged the most deep work at ${Math.max(...deepWork)} hours; ${lowDeepWork} logged the least at ${Math.min(...deepWork)} hours. Lining the two tables up, ${lowDeepWork}'s meeting load sits at ${meetingLoad[engineers.indexOf(lowDeepWork)]} hours, the highest in the team. That is not a coincidence: every hour in a meeting is an hour that cannot become a 90-minute focus block.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      'This is not a case for zero meetings. It is a case for looking at who is structurally unable to get a focus block, and asking whether their meeting load is actually load-bearing or just habit (a standing sync that could be an async update, a review meeting that could be comments on the PR).',
      tryItBlock([
        { q: 'Sam has the lowest deep work hours in the team. What single change to Sam’s calendar would you investigate first?', a: 'Check whether Sam’s meetings are clustered or scattered across the week. Six scattered one-hour meetings can destroy far more deep work time than the same six hours clustered into one afternoon, because scattering breaks every remaining block below the 90-minute threshold this metric requires.' },
        { q: 'Would giving every engineer one meeting-free day per week guarantee more deep work hours for everyone? Why or why not?', a: 'Not guaranteed. It removes scheduled meetings but not other interruptions (Slack pings, on-call pages, ad hoc requests), and it only helps the engineers whose meetings were the actual bottleneck. Ines already logs 26 deep work hours with a fairly light 6-hour meeting load; a meeting-free day would not move her number much, while it could meaningfully help Sam or Wei.' },
      ]),
    ]),
    mod(4, 'Where the Team’s Hours Actually Go', [
      `Relay logged every engineer-hour across the quarter into four buckets: writing code, reviewing others' code, meetings, and cross-team support. The totals: coding ${teamHours.coding}, reviewing ${teamHours.reviewing}, meetings ${teamHours.meetings}, support ${teamHours.support}, out of ${teamTotal} total hours.`,
      mdTable(['Category', 'Hours', 'Share of total'], Object.entries(teamHours).map(([k, v]) => [k[0].toUpperCase() + k.slice(1), String(v), `${pct(v, teamTotal)}%`])),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Meetings take up ${meetingPct}% of the team’s total hours, more than reviewing and support combined. That is the number that should end the "why does everything take so long" conversation with actual evidence instead of a feeling.`,
      'This breakdown is a lagging indicator, not a lever you pull directly. You cannot order a team to "have fewer meeting hours" the way you can order a code freeze. You use this chart to find which meetings are the biggest chunk of that slice, and cut those specifically.',
      tryItBlock([
        { q: 'Reviewing takes up a smaller share than meetings, yet PR cycle time (Module 2) was the team’s biggest complaint. Is that a contradiction?', a: 'No. Cycle time measures elapsed wall-clock time a PR waits, not hours spent reviewing. A PR can wait 40 hours for review while the actual reviewing takes 20 minutes, if the reviewer is busy in meetings during that window. Low reviewing hours and high cycle time can coexist and often point at the same root cause: meeting load crowding out quick review turnaround.' },
        { q: 'If you could move 5% of total hours from one category to another, which move would most likely also improve cycle time from Module 2?', a: 'Move hours from meetings to reviewing. Since Module 2 traced the cycle time improvement to faster review turnaround, giving engineers more protected time for reviewing (funded by fewer or shorter meetings) directly attacks the same bottleneck, rather than adding more coding time, which does not touch the queueing problem.' },
      ]),
    ]),
    mod(5, 'Reading Developer Productivity: A Decision Cheat Sheet', [
      'None of the three metrics in this course tell you anything on their own. Cycle time without PR size context can reward shrinking scope. Deep work time without knowing which meetings are load-bearing can justify cutting the wrong ones. Hours-by-category without a specific complaint to trace back to is just an audit nobody asked for.',
      mdTable(
        ['Metric', 'Healthy signal', 'Warning signal', 'What to do next'],
        [
          ['PR cycle time', 'Falling or flat, with PR size flat too', 'Falling because PR size is shrinking', 'Check median PR size before celebrating a cycle time drop'],
          ['Deep work hours', 'Most engineers clear 15+ hrs/week', 'One or two engineers consistently near zero', 'Look at whether their meetings are load-bearing or habitual'],
          ['Hours by category', 'Meetings under a third of total', 'Meetings rival or exceed coding hours', 'Find the specific meetings driving the share, cut those, not "all meetings"'],
        ],
      ),
      'The team that gets this right treats every one of these numbers as the start of a conversation with the engineers involved, not the end of one. Relay’s own retro put it plainly: the cycle time chart told them where to look, the engineers told them what was actually happening there.',
      'Two things not covered here on purpose: individual output rankings and any single "productivity score." Both invite gaming the very system they are meant to measure, and neither one changes what a team should actually do differently on Monday morning.',
    ]),
  ];

  return { slug: 'measuring-developer-productivity', name: 'Measuring Developer Productivity', role: 'developer',
    description: 'A short, practical course on reading developer productivity signals without falling into the vanity-metric trap, using one fictional 8-engineer team’s real quarter of data.',
    datasetName: 'Relay', datasetNotes: `# Relay dataset notes\n\n8 engineers: ${engineers.join(', ')}. 12-week quarter.\n\nCycle time by week (hrs): ${cycleTimeHrs.join(', ')}\nDeep work by engineer (hrs/wk): ${engineers.map((e,i)=>`${e}=${deepWork[i]}`).join(', ')}\nMeeting load by engineer (hrs/wk): ${engineers.map((e,i)=>`${e}=${meetingLoad[i]}`).join(', ')}\nTeam hours by category: ${JSON.stringify(teamHours)}, total ${teamTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 2: measuring-code-review (Fenwick, 6 backend engineers, 8 weeks)
// ============================================================
function courseCodeReview() {
  const engineers = ['Diego', 'Hana', 'Owen', 'Rasha', 'Leif', 'Mei'];
  const weeks = Array.from({ length: 8 }, (_, i) => `W${i + 1}`);
  const timeToFirstReview = [9.5, 8.2, 10.1, 7.4, 6.8, 5.9, 5.2, 4.8]; // hours, trending down
  const reviewsCompleted = [22, 15, 19, 11, 26, 17];
  const outcomeMix = { 'Approved as-is': 84, 'Approved with changes': 61, Rejected: 15 };
  const outcomeTotal = sum(Object.values(outcomeMix));

  const charts = [
    { file: 'time-to-first-review.svg', alt: 'Line chart of Fenwick time to first review in hours across 8 weeks, falling from about 9.5 to under 5', caption: 'Shown as a line chart because the point is the trend across 8 weeks, not a single comparison.',
      svg: chartBuilders.line({ title: 'Fenwick: Time to First Review (hours)', xLabels: weeks, series: [{ name: 'Hours', values: timeToFirstReview }], yLabel: 'hours' }) },
    { file: 'review-load.svg', alt: 'Bar chart comparing PRs reviewed per engineer across 6 Fenwick engineers', caption: 'Shown as a bar chart because the point is comparing six engineers’ review load against each other, not a trend.',
      svg: chartBuilders.bar({ title: 'Fenwick: PRs Reviewed per Engineer (8 weeks)', categories: engineers, values: reviewsCompleted }) },
    { file: 'review-outcomes.svg', alt: 'Donut chart of Fenwick review outcomes split across approved as-is, approved with changes, and rejected', caption: 'Shown as a donut chart because this is composition, how the whole set of reviews splits into outcome types.',
      svg: chartBuilders.donut({ title: 'Fenwick: Review Outcome Mix', segments: Object.entries(outcomeMix).map(([name, value]) => ({ name, value })) }) },
  ];

  const maxLoad = engineers[reviewsCompleted.indexOf(Math.max(...reviewsCompleted))];
  const minLoad = engineers[reviewsCompleted.indexOf(Math.min(...reviewsCompleted))];
  const loadRatio = round1(Math.max(...reviewsCompleted) / Math.min(...reviewsCompleted));
  const rejectPct = pct(outcomeMix.Rejected, outcomeTotal);

  const modules = [
    mod(1, 'Code Review Is a Queue, Not a Skill Check', [
      'Fenwick’s backend team spent a whole retro arguing about whether their reviewers were "too picky." Nobody had actually looked at how long PRs sat waiting versus how long the review itself took. This course fixes that gap.',
      'The dataset: Fenwick, a fictional 6-engineer backend team, tracked over 8 weeks. Engineers: Diego, Hana, Owen, Rasha, Leif, Mei. All numbers are illustrative and built for this course.',
      'Three questions, three modules: how long do PRs wait for a first look, who is actually carrying the review load, and what happens once a review starts. Each one uses a different chart shape because each question has a different shape.',
    ]),
    mod(2, 'Time to First Review: The Silent Bottleneck', [
      'Time to first review counts the hours between a PR opening and any reviewer leaving the first comment. It says nothing about review quality, only about how long the PR sat untouched.',
      mdTable(['Week', ...weeks], [['Hours', ...timeToFirstReview.map(String)]]),
      `Week 1 averaged ${timeToFirstReview[0]} hours before anyone looked at a new PR. By week 8 that fell to ${timeToFirstReview[7]} hours, a drop of ${round1(timeToFirstReview[0] - timeToFirstReview[7])} hours. Fenwick’s change: they added a Slack bot that pings a random available reviewer the moment a PR opens, instead of relying on someone noticing it in a dashboard.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'A falling time-to-first-review number is close to a pure process win, since it does not depend on PR size or difficulty the way review outcome does. It is one of the cleanest signals in this whole course precisely because it is hard to game without actually reviewing faster.',
      tryItBlock([
        { q: 'Week 3 ticks up to 10.1 hours after week 2’s 8.2. Before assuming the bot broke, what would you check first?', a: 'Check whether week 3 had unusually high PR volume or a public holiday reducing available reviewers. A spike in supply-demand mismatch explains a one-week blip without implicating the tooling, and checking it first avoids a wasted debugging session on the bot itself.' },
        { q: 'A team with time-to-first-review under 2 hours could still have a slow overall cycle time. What number from a different course module would you need to confirm that?', a: 'You would need PR cycle time (open to merge), not just first review. A fast first comment followed by several slow rounds of change requests and re-review still adds up to a long total cycle time, so first-review speed alone cannot confirm the PR actually merged quickly.' },
      ]),
    ]),
    mod(3, 'Review Load: Who Is Actually Carrying It', [
      'Review load counts completed reviews per engineer over the same 8 weeks, regardless of PR size or how long each review took.',
      mdTable(['Engineer', ...engineers], [['Reviews', ...reviewsCompleted.map(String)]]),
      `${maxLoad} completed ${Math.max(...reviewsCompleted)} reviews; ${minLoad} completed ${Math.min(...reviewsCompleted)}, a ${loadRatio}x gap between the busiest and quietest reviewer on a 6-person team.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `A gap this size is not automatically a problem. ${maxLoad} might simply own the modules that get touched most. It becomes a problem when it is invisible: nobody on the team could name this number before Fenwick started tracking it, which meant nobody could ask whether it was sustainable.`,
      tryItBlock([
        { q: `${minLoad} reviewed the fewest PRs. List two very different explanations for that number, one concerning and one not.`, a: `Not concerning: ${minLoad} works in an area of the codebase with fewer PRs to review, or was out for part of the 8 weeks. Concerning: ${minLoad} is being routed around because reviews take too long or are seen as unhelpful, meaning the low number reflects an avoidance pattern rather than low opportunity.` },
        { q: 'Would you fix a 2.4x review load gap by assigning reviews evenly across all six engineers? Why or why not?', a: 'Not necessarily. Even assignment ignores codebase ownership and expertise, someone forced to review unfamiliar code reviews it slower and worse. The better fix is checking whether the gap tracks ownership (fine) or avoidance (not fine) before changing the assignment process at all.' },
      ]),
    ]),
    mod(4, 'What Happens Once a Review Actually Starts', [
      `Every completed review in the 8 weeks landed in one of three buckets: approved as-is, approved after requested changes, or rejected outright. Totals: ${outcomeMix['Approved as-is']} approved as-is, ${outcomeMix['Approved with changes']} approved with changes, ${outcomeMix.Rejected} rejected, out of ${outcomeTotal} reviews.`,
      mdTable(['Outcome', 'Count', 'Share'], Object.entries(outcomeMix).map(([k, v]) => [k, String(v), `${pct(v, outcomeTotal)}%`])),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Rejections sit at ${rejectPct}%, a small slice, but they are the most expensive kind of review: a rejected PR usually needs a full rewrite, not a quick fix. The much bigger slice, approved with changes, is where most of the actual review value happens, since it means the reviewer caught something worth fixing before it shipped.`,
      'A team that only tracks the rejection rate misses the story. A near-zero rejection rate could mean the code is excellent, or it could mean reviewers are rubber-stamping. The approved-with-changes share is a better signal that reviewers are actually engaging, as long as it is not so high that it signals PRs arrive in bad shape.',
      tryItBlock([
        { q: 'If Fenwick’s rejection rate dropped to 2% next quarter, is that unambiguously good news?', a: 'No. It could mean code quality genuinely improved, or it could mean reviewers stopped pushing back and started approving marginal PRs to clear the queue faster (especially plausible right after Module 2’s speed improvements). Check whether approved-with-changes also dropped; if both fell together, it looks more like rubber-stamping than improved quality.' },
      ]),
    ]),
    mod(5, 'Code Review Metrics: A Decision Cheat Sheet', [
      'Time to first review is the cleanest number in this course: falling is almost always good, and it is hard to game. Review load needs a second look before acting, since an uneven load can be ownership or avoidance, and those call for opposite fixes. Outcome mix needs the other two numbers around it to mean anything at all.',
      mdTable(
        ['Metric', 'Healthy signal', 'Warning signal', 'What to do next'],
        [
          ['Time to first review', 'Falling and staying low', 'Rising for more than a week', 'Check reviewer availability before assuming the process broke'],
          ['Review load', 'Gap tracks codebase ownership', 'Gap tracks who gets routed around', 'Ask engineers directly before rebalancing assignments'],
          ['Outcome mix', 'Meaningful approved-with-changes share', 'Rejection or approval rate moves alone', 'Check the paired metric before reacting to either rate alone'],
        ],
      ),
      'Fenwick’s actual takeaway after 8 weeks: the bot fixed the queueing problem, but it could not fix an uneven review load, because that was a people problem wearing a metrics costume. The chart pointed at where to look. A conversation with the team explained what it meant.',
    ]),
  ];

  return { slug: 'measuring-code-review', name: 'Measuring Code Review Effectiveness', role: 'developer',
    description: 'Read code review health through queue time, review load, and outcome mix, using one fictional backend team’s 8-week dataset, without mistaking speed for quality.',
    datasetName: 'Fenwick', datasetNotes: `# Fenwick dataset notes\n\n6 engineers: ${engineers.join(', ')}. 8-week window.\n\nTime to first review by week (hrs): ${timeToFirstReview.join(', ')}\nReviews completed by engineer: ${engineers.map((e,i)=>`${e}=${reviewsCompleted[i]}`).join(', ')}\nOutcome mix: ${JSON.stringify(outcomeMix)}, total ${outcomeTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 3: measuring-delivery-speed (Northbeam, 10-engineer squad, 12 weeks / 3 pods)
// ============================================================
function courseDeliverySpeed() {
  const weeks = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
  const leadTimeDays = [6.2, 5.8, 6.5, 5.1, 4.6, 4.9, 3.8, 3.5, 3.9, 3.2, 2.9, 2.7]; // trending down
  const pods = ['Checkout', 'Search', 'Notifications'];
  const featuresShipped = [14, 9, 11];
  const releases = Array.from({ length: 8 }, (_, i) => `R${i + 1}`);
  const changeFailureRate = [18, 15, 20, 12, 9, 11, 7, 6]; // % of deploys causing incident, trending down

  const charts = [
    { file: 'lead-time-trend.svg', alt: 'Line chart of Northbeam lead time for changes in days across 12 weeks, falling from about 6 to under 3', caption: 'Shown as a line chart because the point is the trend across 12 weeks, not a single comparison.',
      svg: chartBuilders.line({ title: 'Northbeam: Lead Time for Changes (days)', xLabels: weeks, series: [{ name: 'Days', values: leadTimeDays }], yLabel: 'days' }) },
    { file: 'throughput-by-pod.svg', alt: 'Bar chart comparing features shipped across the Checkout, Search, and Notifications pods', caption: 'Shown as a bar chart because the point is comparing three pods against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Northbeam: Features Shipped by Pod (one quarter)', categories: pods, values: featuresShipped }) },
    { file: 'change-failure-rate.svg', alt: 'Line chart of Northbeam change failure rate percentage across 8 releases, falling from 18% to 6%', caption: 'Shown as a line chart because the point is the trend across 8 releases, not a single comparison.',
      svg: chartBuilders.line({ title: 'Northbeam: Change Failure Rate by Release (%)', xLabels: releases, series: [{ name: '% of deploys', values: changeFailureRate, color: '#ef4444' }], yLabel: '%' }) },
  ];

  const leadTimeStart = round1(avg(leadTimeDays.slice(0, 3)));
  const leadTimeEnd = round1(avg(leadTimeDays.slice(-3)));
  const topPod = pods[featuresShipped.indexOf(Math.max(...featuresShipped))];
  const cfrStart = round1(avg(changeFailureRate.slice(0, 3)));
  const cfrEnd = round1(avg(changeFailureRate.slice(-3)));

  const modules = [
    mod(1, 'Fast Delivery That Does Not Break Things', [
      'Northbeam’s leadership wanted "faster shipping" as a quarterly goal, which is a fine goal and a useless metric on its own, since shipping fast and shipping recklessly look identical for about a week.',
      'The dataset: Northbeam, a fictional 10-engineer product squad split into three pods, Checkout, Search, and Notifications, tracked across one 12-week quarter with 8 production releases. All figures are illustrative.',
      'This course pairs two numbers on purpose: lead time (how fast) against change failure rate (how safely). A team that improves one while ignoring the other has not actually gotten better at shipping.',
    ]),
    mod(2, 'Lead Time for Changes', [
      'Lead time for changes measures the days between a commit landing and it reaching production. It is the delivery-speed half of this course’s pair.',
      mdTable(['Week', ...weeks], [['Lead time (days)', ...leadTimeDays.map(String)]]),
      `The first three weeks averaged ${leadTimeStart} days. The last three averaged ${leadTimeEnd}, a fall of ${round1(leadTimeStart - leadTimeEnd)} days. Northbeam’s retro traced this to smaller batch sizes: pods moved from shipping once a week to shipping whenever a feature was ready, cutting the time any single change spent waiting behind unrelated work.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'Falling lead time on its own is easy to celebrate and easy to misread. Shipping smaller, more frequent changes is generally healthy, but it can also mean corners got cut on testing. That is exactly why this course pairs it with change failure rate in Module 4, not on its own.',
      tryItBlock([
        { q: 'Lead time falls fairly steadily except for a small bump at week 3 (6.5, up from 5.8). What would you check before treating this as noise?', a: 'Check whether week 3 included an unusually large or risky change, a migration, a dependency upgrade, something that legitimately needed more testing time before release. A single-week bump tied to one identifiable large change is expected variation, not a trend reversal.' },
      ]),
    ]),
    mod(3, 'Throughput by Pod', [
      'Throughput counts shipped features per pod across the quarter. It answers a different question than lead time: not how fast any one change moves, but how much each pod actually delivers.',
      mdTable(['Pod', ...pods], [['Features shipped', ...featuresShipped.map(String)]]),
      `${topPod} shipped ${Math.max(...featuresShipped)} features, the most of the three pods, against Search’s ${featuresShipped[pods.indexOf('Search')]} and Notifications' ${featuresShipped[pods.indexOf('Notifications')]}.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `Comparing pods by raw feature count only works if the features are roughly comparable in size, which is rarely true. ${topPod} might simply own smaller, more numerous features. Northbeam uses this chart to spot a pod that is stuck, not to rank pods against each other on effort.`,
      tryItBlock([
        { q: 'Notifications shipped the fewest features. Name one legitimate reason that has nothing to do with the pod being slower.', a: 'Notifications features might be larger and more complex on average (cross-cutting infrastructure work, for instance), or the pod might be carrying more production support load that quietly eats into feature time. Raw feature count does not normalize for size or hidden work, so a low count alone does not prove low output.' },
      ]),
    ]),
    mod(4, 'Change Failure Rate: The Other Half of Speed', [
      'Change failure rate is the percentage of production deploys that caused an incident requiring a fix, rollback, or hotfix. This is the safety half of the speed-and-safety pair this course is built around.',
      mdTable(['Release', ...releases], [['CFR (%)', ...changeFailureRate.map(String)]]),
      `Releases 1 through 3 averaged ${cfrStart}% change failure rate. Releases 6 through 8 averaged ${cfrEnd}%. Read together with Module 2: lead time fell while change failure rate ALSO fell. That combination, faster and safer at the same time, is the actual win. Either number improving alone would be a much weaker story.`,
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      'This is the chart that answers the objection every "ship faster" initiative eventually faces: did going faster break more things? Here, no. Smaller batch sizes meant smaller blast radius per change, which is a big part of why both numbers moved the same direction.',
      tryItBlock([
        { q: 'Suppose lead time had fallen the same way, but change failure rate had risen from 18% to 30% instead of falling to 6%. What would that change about the story?', a: 'It would flip the takeaway entirely: the team would be delivering less carefully, not more efficiently, trading safety for speed. Smaller batches were assumed to help both numbers together; if failure rate rose instead, the real cause would need investigating (skipped testing, less review time) rather than treating the faster lead time as a win worth keeping.' },
        { q: 'Why does this course insist on reading lead time and change failure rate together instead of picking whichever one looks better this quarter?', a: 'Because either number alone can be gamed in a direction that hurts the other: shipping faster without care raises failure rate, and being maximally careful raises lead time. Reading them together is what stops "we shipped fast" or "we shipped safely" from being used as a cover story for the metric nobody wants to mention.' },
      ]),
    ]),
    mod(5, 'Delivery Speed: A Decision Cheat Sheet', [
      'The single rule this course keeps coming back to: never read lead time without change failure rate next to it, and never read change failure rate without lead time next to it. Either one alone tells half a story.',
      mdTable(
        ['Signal combination', 'What it means', 'What to do next'],
        [
          ['Lead time down, CFR down', 'Genuine delivery improvement', 'Find the specific process change and protect it'],
          ['Lead time down, CFR up', 'Speed gained by cutting corners', 'Slow down, restore testing or review steps that got skipped'],
          ['Lead time flat, CFR down', 'Safety improved without a speed cost', 'Worth keeping, look for what else improved quality'],
          ['Lead time up, CFR up', 'Both delivery and safety degrading', 'Stop and investigate immediately, this is the worst quadrant'],
        ],
      ),
      'Throughput by pod is useful for spotting a stuck pod, but Northbeam explicitly does not use it to rank pods against each other, since feature size varies too much for raw counts to be fair. Use it as a conversation starter, not a scoreboard.',
    ]),
  ];

  return { slug: 'measuring-delivery-speed', name: 'Measuring Delivery Speed', role: 'developer',
    description: 'Pair lead time for changes with change failure rate to tell whether a team is actually delivering faster, or just cutting corners, using one fictional squad’s quarter of data.',
    datasetName: 'Northbeam', datasetNotes: `# Northbeam dataset notes\n\n10-engineer squad, 3 pods: ${pods.join(', ')}. 12-week quarter, 8 releases.\n\nLead time by week (days): ${leadTimeDays.join(', ')}\nFeatures shipped by pod: ${pods.map((p,i)=>`${p}=${featuresShipped[i]}`).join(', ')}\nChange failure rate by release (%): ${changeFailureRate.join(', ')}`,
    modules, charts };
}

// ============================================================
// COURSE 4: measuring-rework (Cascade, 7-engineer mobile team, 10 sprints)
// ============================================================
function courseRework() {
  const engineers = ['Ana', 'Ben', 'Chidi', 'Dana', 'Elio', 'Farah', 'Gus'];
  const sprints = Array.from({ length: 10 }, (_, i) => `S${i + 1}`);
  const reworkRate = [24, 21, 26, 19, 15, 17, 12, 10, 11, 8]; // % of PRs needing a follow-up fix, trending down
  const causes = { 'Unclear requirements': 46, 'Missed in review': 28, 'Late scope change': 19, 'Flaky test masked it': 12 };
  const causesTotal = sum(Object.values(causes));
  const reworkByEngineer = [9, 22, 14, 6, 18, 11, 15]; // hours

  const charts = [
    { file: 'rework-rate-trend.svg', alt: 'Line chart of Cascade rework rate percentage across 10 sprints, falling from 24% to 8%', caption: 'Shown as a line chart because the point is the trend across 10 sprints, not a single comparison.',
      svg: chartBuilders.line({ title: 'Cascade: Rework Rate by Sprint (%)', xLabels: sprints, series: [{ name: '% of PRs', values: reworkRate, color: '#ef4444' }], yLabel: '%' }) },
    { file: 'rework-by-cause.svg', alt: 'Bar chart comparing rework hours by root cause across four categories', caption: 'Shown as a bar chart because the point is comparing four causes by how many hours each one costs, which is what decides what to fix first.',
      svg: chartBuilders.bar({ title: 'Cascade: Rework Hours by Root Cause', categories: Object.keys(causes), values: Object.values(causes), yLabel: 'hours' }) },
    { file: 'rework-by-engineer.svg', alt: 'Bar chart comparing rework hours across 7 Cascade engineers', caption: 'Shown as a bar chart because the point is comparing seven engineers against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Cascade: Rework Hours by Engineer', categories: engineers, values: reworkByEngineer, yLabel: 'hours' }) },
  ];

  const rateStart = round1(avg(reworkRate.slice(0, 3)));
  const rateEnd = round1(avg(reworkRate.slice(-3)));
  const topCause = Object.keys(causes).reduce((a, b) => (causes[a] > causes[b] ? a : b));
  const topEngineer = engineers[reworkByEngineer.indexOf(Math.max(...reworkByEngineer))];

  const modules = [
    mod(1, 'The Work You Do Twice', [
      'Cascade’s mobile team noticed sprints felt busy but shipped less than expected. The missing piece turned out to be rework: PRs that merged, then needed a follow-up fix within two weeks because something was wrong the first time.',
      'The dataset: Cascade, a fictional 7-engineer mobile team, tracked across 10 sprints. Engineers: Ana, Ben, Chidi, Dana, Elio, Farah, Gus. All figures are illustrative.',
      'Rework is invisible in a sprint burndown, since the follow-up fix looks like new work, not a symptom. This course tracks it separately: how often it happens, what causes it, and who is absorbing it.',
    ]),
    mod(2, 'Rework Rate Across Ten Sprints', [
      'Rework rate is the percentage of merged PRs that needed a follow-up fix within two weeks of shipping, for a bug, a missed edge case, or a requirement that turned out wrong.',
      mdTable(['Sprint', ...sprints], [['Rework rate (%)', ...reworkRate.map(String)]]),
      `Sprints 1 through 3 averaged ${rateStart}% rework. Sprints 8 through 10 averaged ${rateEnd}%, a drop of ${round1(rateStart - rateEnd)} points. The team’s change, starting sprint 5: a mandatory "what could go wrong here" checklist item added to their PR template, forcing a moment of explicit review before merge.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `A rate this high at the start, roughly one in four PRs needing a redo, means the team was effectively doing a quarter of its work twice. That is capacity lost to symptoms nobody had named yet.`,
      tryItBlock([
        { q: 'Sprint 3 spikes to 26%, the highest point in the whole series. What would you check before assuming something got worse?', a: 'Check what shipped in sprint 3, specifically whether it included a larger or riskier feature than usual. A single high-risk sprint can spike the rate without indicating a trend reversal, especially this early before the checklist change in sprint 5 had even started.' },
        { q: 'Why measure rework rate as a percentage of PRs instead of a raw count of follow-up fixes per sprint?', a: 'PR volume varies sprint to sprint, so a raw count conflates "more rework happened" with "more work happened overall." A team shipping 40 PRs with 4 follow-ups (10%) is healthier than one shipping 15 PRs with 3 follow-ups (20%), even though the raw counts look similar. The percentage isolates the actual quality signal from volume.' },
      ]),
    ]),
    mod(3, 'What Actually Causes Rework', [
      `Cascade tagged every follow-up fix with a root cause. Across the 10 sprints: ${causes['Unclear requirements']} hours traced to unclear requirements, ${causes['Missed in review']} to something missed in review, ${causes['Late scope change']} to scope changing after work started, and ${causes['Flaky test masked it']} to a flaky test hiding a real failure.`,
      mdTable(['Cause', 'Hours', 'Share'], Object.entries(causes).map(([k, v]) => [k, String(v), `${pct(v, causesTotal)}%`])),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `${topCause} costs the most hours by a wide margin, at ${pct(causes[topCause], causesTotal)}% of all rework time. That is the fix-first target, not because it is the most interesting cause, but because it is the biggest number on the chart.`,
      'This is where a lot of teams get the fix wrong: they invest in better code review tooling because "missed in review" feels like an engineering problem, while the actual biggest cost is a product and planning problem that no amount of review tooling touches.',
      tryItBlock([
        { q: 'Given this breakdown, would investing in a stronger code review checklist meaningfully reduce Cascade’s total rework hours? Defend your answer with the numbers.', a: 'Only marginally. Missed in review accounts for 28 of 105 total hours, about 27%. Even eliminating it entirely would leave unclear requirements, the largest single cause at 46 hours, completely untouched. The bigger lever is tightening how requirements get written and confirmed before work starts, not review tooling.' },
      ]),
    ]),
    mod(4, 'Rework Hours by Engineer', [
      'The same rework hours, split by which engineer absorbed the follow-up fix, regardless of who caused the original issue.',
      mdTable(['Engineer', ...engineers], [['Rework hours', ...reworkByEngineer.map(String)]]),
      `${topEngineer} absorbed ${Math.max(...reworkByEngineer)} hours of rework, the most on the team, more than double the team average of ${round1(avg(reworkByEngineer))} hours.`,
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `This number needs the most care of anything in this course. It is tempting to read a high rework number as "this engineer makes more mistakes." Often the truer read is the opposite: ${topEngineer} may own the highest-traffic, most ambiguous part of the codebase, the exact area where unclear requirements (Module 3’s biggest cause) do the most damage.`,
      tryItBlock([
        { q: `${topEngineer} has the highest rework hours on the team. Name one way to check whether this reflects individual mistakes versus which area of the codebase they own, using data this course has already introduced.`, a: `Cross-reference which root cause (Module 3) shows up most in ${topEngineer}'s follow-up fixes. If most of their rework traces to unclear requirements or late scope change, the problem sits upstream of them, in planning. If most traces to missed in review, that points more toward the individual PR or the review process around it.` },
        { q: 'Would you ever use this chart in a performance review? Explain your reasoning.', a: 'No, not on its own. Rework hours are downstream of codebase ownership, requirement clarity, and code area risk, none of which are solely under an individual engineer’s control. Using it in a performance review without the root-cause context from Module 3 would punish people for owning hard, ambiguous parts of the product, which is the opposite of what the metric should encourage.' },
      ]),
    ]),
    mod(5, 'Rework: A Decision Cheat Sheet', [
      'Rework rate tells you whether the problem is getting better or worse. Root cause tells you what to actually fix. Per-engineer hours tell you almost nothing useful without the other two numbers next to it, and used alone, it actively misleads.',
      mdTable(
        ['Metric', 'Use it to', 'Do not use it to'],
        [
          ['Rework rate over time', 'Track whether process changes are working', 'Compare against another team without matching PR size and risk profile'],
          ['Rework by root cause', 'Decide what to fix first, by hours saved', 'Assume the biggest category is the most "interesting" engineering problem'],
          ['Rework by engineer', 'Start a conversation about codebase ownership and risk', 'Rank individuals or feed a performance review'],
        ],
      ),
      'Cascade’s actual fix after this analysis was not a tooling change. It was a rule that any ticket without acceptance criteria could not enter a sprint. Rework rate kept falling for two more quarters after that, well past what the review checklist alone had achieved.',
    ]),
  ];

  return { slug: 'measuring-rework', name: 'Measuring Rework', role: 'developer',
    description: 'Track the work a team does twice, why it happens, and who absorbs it, using one fictional mobile team’s 10-sprint dataset, without turning the numbers into a blame tool.',
    datasetName: 'Cascade', datasetNotes: `# Cascade dataset notes\n\n7 engineers: ${engineers.join(', ')}. 10 sprints.\n\nRework rate by sprint (%): ${reworkRate.join(', ')}\nRework hours by cause: ${JSON.stringify(causes)}, total ${causesTotal}\nRework hours by engineer: ${engineers.map((e,i)=>`${e}=${reworkByEngineer[i]}`).join(', ')}`,
    modules, charts };
}

// ============================================================
// COURSE 5: measuring-code-quality (Ledger, 9-engineer fintech backend, 12 weeks)
// ============================================================
function courseCodeQuality() {
  const weeks = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
  const coverage = [61, 63, 62, 65, 68, 70, 71, 74, 76, 78, 79, 81]; // % trending up
  const files = ['payments/ledger.py', 'auth/session.py', 'billing/invoice.py', 'core/reconcile.py', 'api/webhooks.py', 'reports/export.py'];
  const complexity = [42, 38, 31, 27, 24, 19];
  const severity = { Critical: 6, Major: 24, Minor: 58 };
  const severityTotal = sum(Object.values(severity));

  const charts = [
    { file: 'coverage-trend.svg', alt: 'Line chart of Ledger code coverage percentage across 12 weeks, rising from 61% to 81%', caption: 'Shown as a line chart because the point is the trend across 12 weeks, not a single comparison.',
      svg: chartBuilders.line({ title: 'Ledger: Code Coverage by Week (%)', xLabels: weeks, series: [{ name: 'Coverage %', values: coverage, color: '#10b981' }], yLabel: '%' }) },
    { file: 'complexity-hotspots.svg', alt: 'Bar chart comparing cyclomatic complexity scores across six Ledger files', caption: 'Shown as a bar chart because the point is comparing six files against each other to find the worst offenders, not a trend.',
      svg: chartBuilders.bar({ title: 'Ledger: Cyclomatic Complexity by File', categories: files.map((f) => f.split('/')[1]), values: complexity }) },
    { file: 'issue-severity-mix.svg', alt: 'Donut chart of Ledger static analysis issues split across critical, major, and minor severity', caption: 'Shown as a donut chart because this is composition, how the whole set of flagged issues splits by severity.',
      svg: chartBuilders.donut({ title: 'Ledger: Static Analysis Issues by Severity', segments: Object.entries(severity).map(([name, value]) => ({ name, value, color: name === 'Critical' ? '#ef4444' : name === 'Major' ? '#f59e0b' : '#94a3b8' })) }) },
  ];

  const covStart = coverage[0], covEnd = coverage[coverage.length - 1];
  const worstFile = files[complexity.indexOf(Math.max(...complexity))];
  const criticalPct = pct(severity.Critical, severityTotal);

  const modules = [
    mod(1, 'Code Quality Is Not a Vibe', [
      'Ledger’s backend team, fintech, so mistakes here mean real money, wanted to "improve code quality" as a quarterly OKR. Their tech lead pointed out that nobody could say what that meant in a number. This course is what they built instead.',
      'The dataset: Ledger, a fictional 9-engineer fintech backend team, tracked over a 12-week quarter. All figures below are illustrative, not real financial data or a real company.',
      'Three angles: test coverage over time, where complexity concentrates, and what static analysis is actually flagging. None of these is "code quality" by itself. Together they give a team something concrete to act on.',
    ]),
    mod(2, 'Coverage Is Rising, But Rising From What', [
      'Code coverage is the percentage of code lines exercised by automated tests. It says nothing about whether those tests check anything meaningful, only whether the lines ran.',
      mdTable(['Week', ...weeks], [['Coverage (%)', ...coverage.map(String)]]),
      `Coverage climbed from ${covStart}% in week 1 to ${covEnd}% in week 12, a gain of ${covEnd - covStart} points. Ledger’s driver: a new rule that no PR touching the payments module could merge without a test for the changed code path.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      `A rising line here is genuinely encouraging, but only because Ledger paired it with a rule that targets meaningful paths, not a blanket "hit 90% coverage" mandate. A team chasing a coverage number with no rule about what gets tested ends up with tests that assert nothing, just to move the line.`,
      tryItBlock([
        { q: 'Coverage rose steadily with no big jumps or dips across 12 weeks. Is a smooth trend like this always a good sign?', a: 'Not automatically. A smooth trend rules out a single reckless push for coverage (which often means shallow, assertion-free tests written in a rush), but it does not prove the tests are meaningful. You would still need to sample a few of the newly added tests and check whether they actually assert on behavior, not just execute the code path.' },
        { q: 'Ledger targeted coverage rules specifically at the payments module rather than the whole codebase. Why might that be a better choice than a single company-wide coverage target?', a: 'A single target treats all code as equally risky, which it is not, a reporting export script failing is a very different outcome from a payments calculation being wrong. Targeting the highest-consequence module concentrates testing effort where a bug is most expensive, instead of spreading effort evenly and under-testing the part that actually matters most.' },
      ]),
    ]),
    mod(3, 'Where Complexity Concentrates', [
      'Cyclomatic complexity counts the number of independent paths through a function or file, roughly, how many different ways execution can branch. Higher numbers mean more paths to reason about and more places for a bug to hide.',
      mdTable(['File', ...files.map((f) => f.split('/')[1])], [['Complexity', ...complexity.map(String)]]),
      `${worstFile} scores ${Math.max(...complexity)}, the highest in the codebase, more than double the lowest-scoring file at ${Math.min(...complexity)}.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `A complexity score is not automatically a problem. Some domains are inherently branchy. But ${worstFile} sitting at the top of this list, in a payments-adjacent module, in a fintech codebase, is exactly the kind of file that deserves deliberate refactoring attention before its complexity causes a bug that is expensive to find.`,
      tryItBlock([
        { q: 'Should Ledger set a hard complexity limit and block any PR that exceeds it?', a: 'A hard limit risks blocking legitimate, necessarily branchy business logic (tax rules, currency conversion edge cases) while missing that complexity concentrated in a critical file matters more than complexity spread evenly. A better approach: flag files above a threshold for review priority, not automatic rejection, and weight the review by how critical the file is, not just its raw score.' },
      ]),
    ]),
    mod(4, 'What Static Analysis Is Actually Flagging', [
      `Ledger runs a static analyzer on every merge. Over the quarter it flagged ${severity.Critical} critical issues, ${severity.Major} major issues, and ${severity.Minor} minor issues, ${severityTotal} total.`,
      mdTable(['Severity', 'Count', 'Share'], Object.entries(severity).map(([k, v]) => [k, String(v), `${pct(v, severityTotal)}%`])),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Critical issues are only ${criticalPct}% of the total, but they are the ${severity.Critical} that matter most. The other ${100 - criticalPct}%, mostly minor style and lint-level flags, is useful signal in aggregate but should never compete for attention with a critical finding.`,
      'The mistake this chart helps a team avoid: treating "we closed 40 static analysis tickets this sprint" as progress, when 38 of them were minor and the 2 critical ones sat untouched. Total ticket count and severity-weighted priority are different measures of progress, and only one of them is the one that protects the business.',
      tryItBlock([
        { q: 'A sprint report says "45 static analysis issues resolved this sprint, up from 30 last sprint." What is missing from that sentence that this module’s data says you should demand?', a: 'The severity breakdown of what got resolved. Resolving 45 minor issues while 2 critical ones from last sprint remain open is worse progress than resolving 15 issues if all 6 critical ones are among them. A raw resolved-count without severity weighting can look like improvement while the actual risk profile stays flat or worsens.' },
      ]),
    ]),
    mod(5, 'Code Quality: A Decision Cheat Sheet', [
      'No single number in this course is "code quality." Coverage without a rule about what gets tested is a vanity metric. Complexity without knowing which file it sits in is just a list of numbers. Severity mix without weighting by severity hides the two issues that actually matter inside forty that do not.',
      mdTable(
        ['Signal', 'Use it for', 'Common misread'],
        [
          ['Coverage trend', 'Confirming testing discipline is holding on critical paths', 'Chasing a percentage target with no rule about what "counts"'],
          ['Complexity by file', 'Prioritizing refactoring effort where it is riskiest', 'Treating every high-complexity file as equally urgent'],
          ['Issue severity mix', 'Making sure critical findings get attention first', 'Reporting total resolved count without severity weighting'],
        ],
      ),
      'Ledger’s actual quarterly review led with one sentence: "all 6 critical findings closed, coverage on payments code up to 94%." Everything else, the minor lint flags, the complexity scores on low-risk files, was mentioned once and moved past. That ordering is the whole point of this course.',
    ]),
  ];

  return { slug: 'measuring-code-quality', name: 'Measuring Code Quality', role: 'developer',
    description: 'Read coverage, complexity, and static analysis severity together to find where code quality actually needs attention, using one fictional fintech backend team’s quarter of data.',
    datasetName: 'Ledger', datasetNotes: `# Ledger dataset notes\n\n9-engineer fintech backend team. 12-week quarter.\n\nCoverage by week (%): ${coverage.join(', ')}\nComplexity by file: ${files.map((f,i)=>`${f}=${complexity[i]}`).join(', ')}\nStatic analysis severity mix: ${JSON.stringify(severity)}, total ${severityTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 6: measuring-technical-debt (Anchor, 12-engineer platform org, 6 months)
// ============================================================
function courseTechnicalDebt() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const opened = [14, 18, 12, 20, 16, 11];
  const closed = [8, 10, 9, 13, 17, 19]; // catching up
  const categories = { 'Dependency upgrades': 34, 'Test gaps': 41, 'Architecture': 22, 'Documentation': 15 };
  const categoriesTotal = sum(Object.values(categories));
  const teams = ['Platform Core', 'Identity', 'Billing', 'Notifications'];
  const debtIncidentHours = [62, 28, 45, 19];

  const charts = [
    { file: 'backlog-growth.svg', alt: 'Line chart of Anchor debt tickets opened versus closed per month across 6 months, showing closed catching up to opened by June', caption: 'Shown as a line chart with two series because the point is comparing two trends against each other over time.',
      svg: chartBuilders.line({ title: 'Anchor: Debt Tickets Opened vs Closed by Month', xLabels: months, series: [{ name: 'Opened', values: opened, color: '#ef4444' }, { name: 'Closed', values: closed, color: '#10b981' }], yLabel: 'tickets' }) },
    { file: 'debt-by-category.svg', alt: 'Donut chart of Anchor debt backlog split across dependency upgrades, test gaps, architecture, and documentation', caption: 'Shown as a donut chart because this is composition, how the whole open backlog splits by category.',
      svg: chartBuilders.donut({ title: 'Anchor: Debt Backlog by Category', segments: Object.entries(categories).map(([name, value]) => ({ name, value })) }) },
    { file: 'debt-incident-hours.svg', alt: 'Bar chart comparing hours lost to debt-related incidents across four Anchor teams', caption: 'Shown as a bar chart because the point is comparing four teams against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Anchor: Hours Lost to Debt-Related Incidents by Team', categories: teams, values: debtIncidentHours, yLabel: 'hours' }) },
  ];

  const netJan = opened[0] - closed[0];
  const netJun = opened[5] - closed[5];
  const topCategory = Object.keys(categories).reduce((a, b) => (categories[a] > categories[b] ? a : b));
  const worstTeam = teams[debtIncidentHours.indexOf(Math.max(...debtIncidentHours))];

  const modules = [
    mod(1, 'Debt You Can See Is Debt You Can Manage', [
      'Anchor’s platform org had a debt backlog nobody had looked at end to end in over a year. Individual teams knew their own corner of it. Nobody could say whether the total was growing or shrinking.',
      'The dataset: Anchor, a fictional 12-engineer platform org spanning four teams, Platform Core, Identity, Billing, Notifications, tracked over 6 months of debt ticket activity. All figures are illustrative.',
      'This course treats technical debt the way Anchor eventually did: as a backlog with an opened rate and a closed rate, a category breakdown, and a cost, measured in incident hours, not a vague feeling that "the codebase is old."',
    ]),
    mod(2, 'Is the Backlog Growing or Shrinking', [
      'The simplest debt question a team can ask: are more tickets opening than closing? Anchor tracked both counts monthly.',
      mdTable(['Month', ...months], [['Opened', ...opened.map(String)], ['Closed', ...closed.map(String)]]),
      `In January, ${opened[0]} tickets opened against ${closed[0]} closed, a net growth of ${netJan}. By June, ${opened[5]} opened against ${closed[5]} closed, a net growth of ${netJun}, nearly flat. The turning point was March, when Anchor started dedicating one fixed day per sprint to debt work instead of treating it as leftover time.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'Net-negative backlog growth (closing more than opening) does not mean debt is solved. It means the org stopped falling further behind. Anchor’s next goal after this chart flattened was to start actually shrinking the backlog, not just stop it from growing.',
      tryItBlock([
        { q: 'April shows a spike in opened tickets (20) even after the March process change started. Does that mean the dedicated debt day failed?', a: 'Not necessarily. New process changes often surface previously-invisible debt as teams start actively looking for it, which can temporarily raise the opened count even while the underlying trend improves. Check whether closed count also rose in April (it did, from 9 to 13) before concluding the change failed; a rising closed rate alongside a temporary opened spike is consistent with the process working, not breaking.' },
      ]),
    ]),
    mod(3, 'What Kind of Debt Is Actually in the Backlog', [
      `Anchor tagged the current open backlog by category: ${categories['Dependency upgrades']} dependency upgrade tickets, ${categories['Test gaps']} test gap tickets, ${categories.Architecture} architecture tickets, ${categories.Documentation} documentation tickets.`,
      mdTable(['Category', 'Count', 'Share'], Object.entries(categories).map(([k, v]) => [k, String(v), `${pct(v, categoriesTotal)}%`])),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `${topCategory} is the largest slice at ${pct(categories[topCategory], categoriesTotal)}%. That matters for planning: test gaps are usually cheaper to close incrementally (add a test alongside the next PR that touches that code) than architecture debt, which often needs dedicated project time.`,
      'A category breakdown like this is what turns "we have a lot of debt" into a plan. Dependency upgrades can often be batched and mostly automated. Architecture debt cannot be squeezed into spare sprint capacity the same way, it needs to be scheduled like a project.',
      tryItBlock([
        { q: 'Test gaps are the largest category by count, but architecture debt is only 22 tickets. Does that mean architecture debt is the lower priority?', a: 'Not necessarily, ticket count does not equal effort or risk. A single architecture ticket can represent months of work and carry far more risk than dozens of small test-gap tickets. Category share tells you where volume sits, not where the most consequential work sits; you would need effort or risk estimates per ticket to answer the priority question properly.' },
      ]),
    ]),
    mod(4, 'The Interest Payment: Incidents Caused by Debt', [
      `Debt has a cost beyond the backlog count: incidents traced back to a known, unaddressed debt ticket. Over the 6 months: Platform Core lost ${debtIncidentHours[0]} engineer-hours to debt-related incidents, Identity ${debtIncidentHours[1]}, Billing ${debtIncidentHours[2]}, Notifications ${debtIncidentHours[3]}.`,
      mdTable(['Team', ...teams], [['Incident hours', ...debtIncidentHours.map(String)]]),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `${worstTeam} lost ${Math.max(...debtIncidentHours)} hours, more than the other three teams combined. This is the number that actually justifies dedicating sprint time to debt work: it is not abstract code cleanliness, it is ${Math.max(...debtIncidentHours)} hours of engineering time that could have shipped features instead of firefighting.`,
      'This chart is also the strongest argument a tech lead has in a roadmap planning meeting. "Our backlog has 112 debt tickets" is easy to deprioritize. "Debt-related incidents cost Platform Core 62 engineer-hours last quarter, more than a full sprint" is much harder to wave away.',
      tryItBlock([
        { q: `${worstTeam} owns most of the "Test gaps" category debt from Module 3, Anchor’s biggest category by count. Is that connection likely coincidental?`, a: 'Unlikely to be coincidental. Test gaps are precisely the kind of debt that manifests as production incidents, since a missing test means a regression ships undetected. The link between Module 3’s category breakdown and Module 4’s incident hours is exactly the kind of cross-module read this course is built to encourage: category tells you what kind of debt exists, incident hours tell you which team is actually paying for it.' },
        { q: 'If Anchor could only fund one team’s debt work next quarter, which team’s data from this course makes the strongest case, and why?', a: 'Platform Core, on the strength of the incident-hours chart alone (62 hours, more than double the next-highest team). Combined with the likely link to test-gap debt from Module 3, funding Platform Core’s debt work targets both the largest incident cost and probably the largest single category of open debt at once, giving the clearest return for the investment.' },
      ]),
    ]),
    mod(5, 'Technical Debt: A Decision Cheat Sheet', [
      'Backlog growth tells you the trend. Category breakdown tells you what kind of work is needed and how it should be scheduled. Incident hours tell you the actual cost, in the currency that gets budget approved: engineer time.',
      mdTable(
        ['Signal', 'What it answers', 'What it does not answer'],
        [
          ['Opened vs closed', 'Is the backlog growing or shrinking', 'Whether the debt in the backlog is dangerous or trivial'],
          ['Category breakdown', 'What kind of work is needed, how it should be scheduled', 'Which team is actually being hurt by it'],
          ['Incident hours by team', 'Which team’s debt is costing the most right now', 'What to fix, only that something needs attention'],
        ],
      ),
      'Anchor’s actual quarterly debt review after building these three charts took fifteen minutes instead of the usual hour of debate, because the room could agree on the numbers even when they disagreed on the plan. That is what a decent set of debt metrics actually buys a team: a shorter argument about the right thing.',
    ]),
  ];

  return { slug: 'measuring-technical-debt', name: 'Measuring Technical Debt', role: 'developer',
    description: 'Turn a vague sense of "the codebase is old" into a backlog trend, a category breakdown, and a real incident cost, using one fictional platform org’s 6-month dataset.',
    datasetName: 'Anchor', datasetNotes: `# Anchor dataset notes\n\n12-engineer platform org, 4 teams: ${teams.join(', ')}. 6 months.\n\nOpened by month: ${opened.join(', ')}\nClosed by month: ${closed.join(', ')}\nBacklog by category: ${JSON.stringify(categories)}\nIncident hours by team: ${teams.map((t,i)=>`${t}=${debtIncidentHours[i]}`).join(', ')}`,
    modules, charts };
}

// ============================================================
// COURSE 7: measuring-test-effectiveness (Harbor QA, 5-person team, "Ferry" checkout service, 8 releases)
// ============================================================
function courseTestEffectiveness() {
  const releases = Array.from({ length: 8 }, (_, i) => `R${i + 1}`);
  const ddp = [71, 74, 78, 76, 82, 85, 88, 91]; // defect detection percentage, trending up
  const suites = ['Regression', 'Smoke', 'Exploratory'];
  const defectsFoundBySuite = [34, 8, 27];
  const technique = { Scripted: 38, Exploratory: 27, Automated: 24 };
  const techniqueTotal = sum(Object.values(technique));

  const charts = [
    { file: 'ddp-trend.svg', alt: 'Line chart of Harbor QA defect detection percentage across 8 releases, rising from 71% to 91%', caption: 'Shown as a line chart because the point is the trend across 8 releases, not a single comparison.',
      svg: chartBuilders.line({ title: 'Harbor QA: Defect Detection Percentage by Release', xLabels: releases, series: [{ name: 'DDP %', values: ddp, color: '#10b981' }], yLabel: '%' }) },
    { file: 'defects-by-suite.svg', alt: 'Bar chart comparing defects found across the regression, smoke, and exploratory test suites', caption: 'Shown as a bar chart because the point is comparing three suites against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Harbor QA: Defects Found by Suite (8 releases)', categories: suites, values: defectsFoundBySuite }) },
    { file: 'defects-by-technique.svg', alt: 'Donut chart of Harbor QA defects found split across scripted, exploratory, and automated testing techniques', caption: 'Shown as a donut chart because this is composition, how the whole set of found defects splits by which technique caught them.',
      svg: chartBuilders.donut({ title: 'Harbor QA: Defects Found by Technique', segments: Object.entries(technique).map(([name, value]) => ({ name, value })) }) },
  ];

  const ddpStart = round1(avg(ddp.slice(0, 3)));
  const ddpEnd = round1(avg(ddp.slice(-3)));
  const topSuite = suites[defectsFoundBySuite.indexOf(Math.max(...defectsFoundBySuite))];
  const smokeShare = pct(defectsFoundBySuite[suites.indexOf('Smoke')], sum(defectsFoundBySuite));

  const modules = [
    mod(1, 'Testing More Is Not the Same as Testing Well', [
      'Harbor QA ran more test cases every release and still kept missing the same class of bug in production. More tests were not the problem. Nobody was measuring whether the tests actually caught anything.',
      'The dataset: Harbor QA, a fictional 5-person QA team testing Ferry, a fictional checkout service, tracked across 8 releases. All figures below are illustrative.',
      'This course tracks effectiveness three ways: how many bugs testing catches before production, which suite actually earns its runtime, and which technique, scripted, exploratory, or automated, is doing the real work.',
    ]),
    mod(2, 'Defect Detection Percentage', [
      'Defect detection percentage (DDP) is the share of all defects (found in testing plus found in production) that testing caught before release. DDP = defects found in testing divided by total defects found, times 100.',
      mdTable(['Release', ...releases], [['DDP (%)', ...ddp.map(String)]]),
      `Releases 1 through 3 averaged ${ddpStart}% DDP. Releases 6 through 8 averaged ${ddpEnd}%, a rise of ${round1(ddpEnd - ddpStart)} points. Harbor QA’s change: they started writing a short exploratory charter for every release’s highest-risk area instead of only running the fixed regression suite.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'DDP rising is close to a direct measure of testing value, since it is defined against defects that exist either way, testing did not create them, it only decides whether they get caught before or after shipping. A team cannot game this number by writing more low-value tests, since a test that finds nothing does not move DDP at all.',
      tryItBlock([
        { q: 'DDP is calculated as testing defects divided by (testing defects plus production defects). If production defects fell to zero one release but testing also found nothing, what would DDP show, and would that be a fair reading?', a: 'DDP would be undefined (division by zero) or conventionally reported as 100% by some formulas, and neither is a fair reading of "great testing." Zero total defects found most likely means a very light or bug-free release, not necessarily excellent testing. DDP needs a reasonable defect volume in the denominator to mean anything; a near-zero-defect release is a case where this metric should be set aside, not celebrated.' },
        { q: 'Would a QA team’s DDP naturally trend toward 100% forever if they kept improving? What would eventually cap it?', a: 'No metric like this improves without limit. Some defects are inherently hard or impossible to catch pre-release: ones caused by production-only conditions (real traffic patterns, third-party outages, data at production scale). DDP realistically caps somewhere below 100% for any live system, and a team reporting DDP suspiciously close to 100% is worth double-checking for a measurement problem, not assuming perfection.' },
      ]),
    ]),
    mod(3, 'Which Suite Actually Earns Its Runtime', [
      `Harbor QA runs three suites: Regression, Smoke, and Exploratory. Over 8 releases, Regression found ${defectsFoundBySuite[0]} defects, Smoke found ${defectsFoundBySuite[1]}, Exploratory found ${defectsFoundBySuite[2]}.`,
      mdTable(['Suite', ...suites], [['Defects found', ...defectsFoundBySuite.map(String)]]),
      `${topSuite} found the most defects at ${Math.max(...defectsFoundBySuite)}, but Smoke, which runs on every single commit, found only ${defectsFoundBySuite[suites.indexOf('Smoke')]}, just ${smokeShare}% of the total across all three suites.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      'A low defect count for smoke tests is not automatically bad. Smoke suites are meant to catch catastrophic breakage fast, not find subtle bugs, so a low count can mean the codebase rarely breaks catastrophically, which is itself a win. The number becomes a problem only when a suite runs constantly and consistently finds almost nothing, which is when it is worth asking whether that runtime is earning its keep.',
      tryItBlock([
        { q: 'Smoke found the fewest defects but runs on every commit, dozens of times per release, while Exploratory runs once per release. Is defect count per suite a fair way to compare their value?', a: 'Not without adjusting for run frequency and purpose. Smoke exists to catch build-breaking failures fast, not to find deep bugs, so a low defect count against a high run count can still mean high value, catching a handful of critical breakages instantly is worth more than its raw count suggests. Comparing suites fairly needs defects-per-run or defects-per-purpose, not a flat count.' },
      ]),
    ]),
    mod(4, 'Which Technique Is Actually Finding Bugs', [
      `The same defects, tagged by which technique caught them: ${technique.Scripted} from scripted test cases, ${technique.Exploratory} from unscripted exploratory sessions, ${technique.Automated} from the automated suite.`,
      mdTable(['Technique', 'Defects found', 'Share'], Object.entries(technique).map(([k, v]) => [k, String(v), `${pct(v, techniqueTotal)}%`])),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Scripted testing found the most at ${pct(technique.Scripted, techniqueTotal)}%, but exploratory testing, unplanned, tester-driven sessions with no fixed script, found ${pct(technique.Exploratory, techniqueTotal)}%, a substantial share for something that costs no authoring time and adapts instantly to whatever changed that release.`,
      'This chart is the strongest argument Harbor QA had for protecting exploratory testing time when release schedules got tight. It is often the first thing cut under deadline pressure, and this breakdown shows that cutting it would have meant missing over a quarter of the defects testing actually caught.',
      tryItBlock([
        { q: 'Under release pressure, a team proposes cutting exploratory testing time to speed up the release. Using this module’s numbers, what would you tell them?', a: `Exploratory testing accounted for ${pct(technique.Exploratory, techniqueTotal)}% of defects found across the 8 releases, more than a quarter of everything testing caught. Cutting it to save time would not just reduce testing effort proportionally; it would remove a technique that catches a different class of bug than scripted or automated testing does, since exploratory sessions are the only ones not constrained to a predefined script.` },
      ]),
    ]),
    mod(5, 'Test Effectiveness: A Decision Cheat Sheet', [
      'DDP tells you whether testing overall is catching more or less. Suite comparison tells you where runtime is and is not earning its keep. Technique comparison tells you which kind of testing effort to protect when time gets cut.',
      mdTable(
        ['Signal', 'Use it to', 'Common misread'],
        [
          ['DDP trend', 'Track whether testing is catching more of what exists', 'Chase 100% without a realistic defect volume to measure against'],
          ['Defects by suite', 'Decide whether a suite’s runtime is worth its frequency', 'Judge a smoke suite by raw count instead of its actual purpose'],
          ['Defects by technique', 'Protect the techniques doing the real work under schedule pressure', 'Assume the technique with the highest headline count is the only one that matters'],
        ],
      ),
      'Harbor QA’s actual takeaway after this analysis: they kept the smoke suite exactly as-is (it was doing its job, catastrophic-breakage detection, not defect-hunting), and they made exploratory testing a protected line item in every release plan instead of the first thing cut when a deadline slipped.',
    ]),
  ];

  return { slug: 'measuring-test-effectiveness', name: 'Measuring Test Effectiveness', role: 'qa',
    description: 'Read defect detection percentage, suite value, and testing technique together to tell whether QA effort is actually catching bugs, using one fictional team’s 8-release dataset.',
    datasetName: 'Harbor QA', datasetNotes: `# Harbor QA dataset notes\n\n5-person QA team testing "Ferry" checkout service. 8 releases.\n\nDDP by release (%): ${ddp.join(', ')}\nDefects found by suite: ${suites.map((s,i)=>`${s}=${defectsFoundBySuite[i]}`).join(', ')}\nDefects found by technique: ${JSON.stringify(technique)}, total ${techniqueTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 8: measuring-test-automation (Beacon Test Guild, automation suite for "Lighthouse" app, 10 weeks)
// ============================================================
function courseTestAutomation() {
  const weeks = Array.from({ length: 10 }, (_, i) => `W${i + 1}`);
  const automationCoverage = [34, 38, 41, 47, 52, 58, 63, 68, 71, 74]; // % of regression suite automated
  const suiteNames = ['Login', 'Checkout', 'Search', 'Admin'];
  const hoursSaved = [6, 14, 9, 4]; // manual hours saved per week
  const outcomeMix = { Pass: 168, Fail: 19, 'Flaky retry': 13 };
  const outcomeTotal = sum(Object.values(outcomeMix));

  const charts = [
    { file: 'automation-coverage.svg', alt: 'Line chart of Beacon Test Guild automation coverage percentage across 10 weeks, rising from 34% to 74%', caption: 'Shown as a line chart because the point is the trend across 10 weeks, not a single comparison.',
      svg: chartBuilders.line({ title: 'Beacon: Automation Coverage by Week (%)', xLabels: weeks, series: [{ name: 'Coverage %', values: automationCoverage, color: '#10b981' }], yLabel: '%' }) },
    { file: 'manual-hours-saved.svg', alt: 'Bar chart comparing manual hours saved per week across the login, checkout, search, and admin suites', caption: 'Shown as a bar chart because the point is comparing four suites against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Beacon: Manual Hours Saved per Week by Suite', categories: suiteNames, values: hoursSaved, yLabel: 'hours' }) },
    { file: 'run-outcome-mix.svg', alt: 'Donut chart of Beacon automation run outcomes split across pass, fail, and flaky retry across the last 200 runs', caption: 'Shown as a donut chart because this is composition, how the whole set of runs splits by outcome.',
      svg: chartBuilders.donut({ title: 'Beacon: Suite Run Outcomes (last 200 runs)', segments: Object.entries(outcomeMix).map(([name, value]) => ({ name, value, color: name === 'Pass' ? '#10b981' : name === 'Fail' ? '#ef4444' : '#f59e0b' })) }) },
  ];

  const covStart = automationCoverage[0], covEnd = automationCoverage[automationCoverage.length - 1];
  const topSuite = suiteNames[hoursSaved.indexOf(Math.max(...hoursSaved))];
  const totalWeeklySaved = sum(hoursSaved);
  const flakyPct = pct(outcomeMix['Flaky retry'], outcomeTotal);

  const modules = [
    mod(1, 'Automation Coverage Is Not the Goal, It Is the Input', [
      'Beacon Test Guild was asked to hit "80% automation coverage" as a quarterly target. Nobody had asked what that percentage was supposed to buy the team. This course tracks that instead: coverage, the hours it actually saves, and whether the automated runs can be trusted.',
      'The dataset: Beacon Test Guild, a fictional automation team building the regression suite for Lighthouse, a fictional app, tracked over 10 weeks. All figures below are illustrative.',
      'Three questions: how fast is coverage growing, which parts of the app does automating actually pay off for, and can the team trust a red result when they see one. That last question matters more than the first two put together.',
    ]),
    mod(2, 'Automation Coverage Growth', [
      'Automation coverage is the percentage of the regression suite that runs automated rather than manually, tracked weekly as Beacon converted manual test cases to scripts.',
      mdTable(['Week', ...weeks], [['Coverage (%)', ...automationCoverage.map(String)]]),
      `Coverage rose from ${covStart}% in week 1 to ${covEnd}% by week 10, a gain of ${covEnd - covStart} points. Beacon prioritized converting the highest-frequency manual test cases first, the ones run on every release, rather than working through the suite in whatever order the test cases happened to be filed.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'A rising coverage line only means something if the team can say what got automated and why. Automating a test case that runs once a year to hit a percentage target wastes engineering time that converting a test run on every release would have spent far better.',
      tryItBlock([
        { q: 'Two automation teams both report 70% coverage. Why might one of those numbers be worth far more than the other?', a: 'Coverage percentage says nothing about which 70% got automated. A team that automated its highest-frequency, highest-risk test cases first delivers real ongoing time savings and confidence, while a team that automated the easiest 70% (regardless of how often those cases run) could hit the same number with much less actual value. The percentage needs the frequency-and-risk context from how it was built.' },
        { q: 'Would you expect this growth curve to keep climbing at the same rate toward 100%, or to slow down? Why?', a: 'It should slow down. The earliest conversions target the highest-value, usually simplest-to-automate cases. What remains later tends to be harder to automate (complex setup, flaky UI interactions, cases needing special environments), so the same effort per week produces smaller coverage gains as the suite approaches completion.' },
      ]),
    ]),
    mod(3, 'Where Automation Actually Pays Off', [
      `Beacon tracked manual hours saved per week, by suite, once each suite was automated: Login saves ${hoursSaved[0]} hours weekly, Checkout ${hoursSaved[1]}, Search ${hoursSaved[2]}, Admin ${hoursSaved[3]}, ${totalWeeklySaved} hours total across the team every week.`,
      mdTable(['Suite', ...suiteNames], [['Hours saved/week', ...hoursSaved.map(String)]]),
      `${topSuite} saves ${Math.max(...hoursSaved)} hours a week, more than the other three suites combined. That is not because checkout has the most test cases. It is because checkout is tested on every single release, while admin, the lowest saver, changes rarely enough that its manual suite only ran a handful of times all quarter.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      'This chart is the answer to "what should we automate next." A suite that runs constantly and takes an hour to run manually is worth automating even if it has few test cases. A suite with hundreds of test cases that runs once a year might not be worth automating at all.',
      tryItBlock([
        { q: 'Admin saves the fewest hours weekly. Does that mean automating the admin suite was a mistake?', a: 'Not necessarily a mistake, but it does mean the ROI is much lower than the other three suites, and the team should ask whether that time would have paid off more elsewhere. If admin changes rarely and runs rarely, automating it earlier than a higher-frequency suite (if that tradeoff happened) would have been a sequencing mistake even if the automation itself has some value.' },
      ]),
    ]),
    mod(4, 'Can You Trust a Red Result', [
      `Of the last 200 automated runs: ${outcomeMix.Pass} passed clean, ${outcomeMix.Fail} failed with a real defect, and ${outcomeMix['Flaky retry']} needed a retry before the suite reported a stable result.`,
      mdTable(['Outcome', 'Count', 'Share'], Object.entries(outcomeMix).map(([k, v]) => [k, String(v), `${pct(v, outcomeTotal)}%`])),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Flaky retries make up ${flakyPct}% of runs. That number matters more than pass rate or fail rate on their own, because every flaky run erodes trust in the whole suite. A team that sees enough flaky results starts assuming every red run is "probably just flaky" and stops investigating, which is exactly the failure mode automation was supposed to prevent.`,
      'Coverage growth (Module 2) and hours saved (Module 3) both look good even while flakiness quietly undermines the entire investment. This is why this course treats flaky rate as a required companion metric, not an optional one, to any automation coverage report.',
      tryItBlock([
        { q: `Beacon's coverage keeps growing and hours saved keeps rising, but flaky retries sit at ${flakyPct}%. Should the team keep automating more of the suite, or pause and fix flakiness first?`, a: `Pause and address flakiness first, or at minimum run it in parallel. Adding more automated coverage on top of an already-flaky foundation compounds the trust problem, more suites means more flaky results means more ignored red runs. A team should get flaky rate under control (typically well under 5%) before scaling coverage further, since the value of automation depends entirely on people trusting its results.` },
      ]),
    ]),
    mod(5, 'Test Automation: A Decision Cheat Sheet', [
      'Coverage percentage tells you how much got automated. Hours saved tells you whether the right things got automated. Flaky rate tells you whether anyone can trust the result. All three are required together; any one alone is easy to misread.',
      mdTable(
        ['Metric', 'Healthy signal', 'Warning signal', 'What to do next'],
        [
          ['Coverage growth', 'Rising, prioritized by frequency and risk', 'Rising but nobody can say what got automated first and why', 'Ask for the prioritization logic, not just the percentage'],
          ['Hours saved by suite', 'Concentrated where test frequency is highest', 'Spread evenly regardless of run frequency', 'Redirect future automation effort toward high-frequency suites'],
          ['Flaky retry rate', 'Under about 5% of runs', 'Rising, or high enough that red results get ignored', 'Stop scaling coverage, fix flaky tests first'],
        ],
      ),
      'Beacon’s actual next step after this analysis was a two-week flakiness sprint before touching coverage again. Coverage numbers look better on a slide. Trustworthy results are what actually let a team stop running things manually.',
    ]),
  ];

  return { slug: 'measuring-test-automation', name: 'Measuring Test Automation', role: 'qa',
    description: 'Read automation coverage, hours saved, and flaky rate together to tell whether an automation investment is actually paying off, using one fictional team’s 10-week dataset.',
    datasetName: 'Beacon Test Guild', datasetNotes: `# Beacon Test Guild dataset notes\n\nAutomation team for "Lighthouse" app. 10 weeks.\n\nCoverage by week (%): ${automationCoverage.join(', ')}\nHours saved by suite: ${suiteNames.map((s,i)=>`${s}=${hoursSaved[i]}`).join(', ')}\nRun outcome mix (last 200 runs): ${JSON.stringify(outcomeMix)}, total ${outcomeTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 9: measuring-defects (Meridian product, 6 releases)
// ============================================================
function courseDefects() {
  const releases = Array.from({ length: 6 }, (_, i) => `R${i + 1}`);
  const critical = [3, 2, 4, 1, 2, 1];
  const major = [11, 9, 13, 8, 7, 6];
  const minor = [22, 19, 24, 20, 18, 15];
  const modulesList = ['Auth', 'Catalog', 'Cart', 'Payments', 'Notifications'];
  const density = [2.1, 1.4, 3.2, 4.6, 1.8]; // bugs per 1000 lines
  const ageBuckets = [
    { label: '0-2d', count: 34 },
    { label: '3-7d', count: 22 },
    { label: '8-14d', count: 13 },
    { label: '15-30d', count: 7 },
    { label: '30d+', count: 4 },
  ];
  const ageTotal = sum(ageBuckets.map((b) => b.count));

  const charts = [
    { file: 'defects-by-severity.svg', alt: 'Line chart of Meridian defects found by severity, critical, major, and minor, across 6 releases', caption: 'Shown as a line chart with three series because the point is comparing how each severity trends across releases, not a single snapshot.',
      svg: chartBuilders.line({ title: 'Meridian: Defects Found by Severity by Release', xLabels: releases, series: [
        { name: 'Critical', values: critical, color: '#ef4444' },
        { name: 'Major', values: major, color: '#f59e0b' },
        { name: 'Minor', values: minor, color: '#94a3b8' },
      ], yLabel: 'defects' }) },
    { file: 'defect-density-by-module.svg', alt: 'Bar chart comparing defect density per 1000 lines of code across five Meridian modules', caption: 'Shown as a bar chart because the point is comparing five modules against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Meridian: Defect Density by Module (bugs / 1000 lines)', categories: modulesList, values: density, yLabel: 'bugs/1000 lines' }) },
    { file: 'defect-age-distribution.svg', alt: 'Histogram of Meridian defect age in days open, bucketed from 0-2 days to 30+ days', caption: 'Shown as a histogram because the point is the distribution of how long defects stay open, not a comparison of separate categories.',
      svg: chartBuilders.histogram({ title: 'Meridian: Defect Age Distribution (days open)', buckets: ageBuckets, yLabel: 'defects' }) },
  ];

  const criticalTotal = sum(critical), majorTotal = sum(major), minorTotal = sum(minor);
  const worstModule = modulesList[density.indexOf(Math.max(...density))];
  const oldPct = pct(ageBuckets[3].count + ageBuckets[4].count, ageTotal);

  const modules = [
    mod(1, 'Not All Defects Deserve the Same Reaction', [
      'Meridian’s team reported "42 open defects" every sprint and watched leadership’s reaction swing wildly for no clear reason, sometimes alarmed at 30, sometimes calm at 50. The raw count was hiding three completely different stories.',
      'The dataset: Meridian, a fictional e-commerce product with five modules, Auth, Catalog, Cart, Payments, Notifications, tracked across 6 releases. All figures are illustrative.',
      'This course splits the single defect count into three lenses: severity trend over time, density by module (normalized for code size), and how long defects actually sit open. Each answers a different question a raw count cannot.',
    ]),
    mod(2, 'Defects by Severity Over Time', [
      'Every defect gets a severity: critical (breaks core functionality or loses money), major (broken but has a workaround), or minor (cosmetic or edge case). Tracking them separately, not as one combined count, is the whole point of this module.',
      mdTable(['Release', ...releases], [['Critical', ...critical.map(String)], ['Major', ...major.map(String)], ['Minor', ...minor.map(String)]]),
      `Critical defects totaled ${criticalTotal} across all 6 releases, major totaled ${majorTotal}, minor totaled ${minorTotal}. Critical count fell from ${critical[0]} in release 1 to ${critical[5]} in release 6, while minor count also fell from ${minor[0]} to ${minor[5]}, both trending down together.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'A combined "total defects" number would have shown a fall from 36 to 22 total, which looks like the same story, but only by coincidence. If critical had risen while minor fell, a combined total could easily have looked flat or even improving while the actual risk profile got worse. Tracking severity as separate lines is what protects against that.',
      tryItBlock([
        { q: 'Release 3 shows a spike in critical defects (4, the highest in the series) alongside a spike in major (13) and minor (24). What does the fact that all three spiked together suggest, versus if only critical had spiked?', a: 'All three spiking together suggests a release-wide quality issue, likely a rushed release, reduced testing time, or a large risky change that touched many parts of the system. If only critical had spiked while major and minor stayed flat, that would point at something more specific: one narrow, high-consequence bug rather than a broad quality dip.' },
        { q: 'A team reports "total defects down 30% this quarter." What is the first follow-up question this module’s framework tells you to ask?', a: 'Down 30% in which severity, or all three proportionally? A 30% total fall could mean minor defects fell sharply while critical stayed flat or rose, in which case the headline number is masking the metric that actually matters most. Always ask for the severity breakdown before treating an aggregate change as good or bad news.' },
      ]),
    ]),
    mod(3, 'Defect Density by Module', [
      `Defect density normalizes defect count by code size, bugs per 1000 lines, so modules of different sizes can be compared fairly. Auth: ${density[0]}, Catalog: ${density[1]}, Cart: ${density[2]}, Payments: ${density[3]}, Notifications: ${density[4]}.`,
      mdTable(['Module', ...modulesList], [['Density', ...density.map(String)]]),
      `${worstModule} has the highest density at ${Math.max(...density)} bugs per 1000 lines, more than double Catalog’s ${density[modulesList.indexOf('Catalog')]}, the lowest.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `Raw defect counts would have been misleading here, since Payments is a smaller module than Catalog in total lines of code. A raw count might have shown Catalog with more bugs simply because it is bigger, hiding that Payments is proportionally far riskier per line written, in the module where a bug is also the most expensive.`,
      tryItBlock([
        { q: 'Why does normalizing by lines of code matter more for a module comparison than it would for the severity-over-time chart in Module 2?', a: 'Module 2 tracks the same codebase against itself over time, so its size is roughly constant release to release, making a raw count fair for that comparison. Module 3 compares different modules of genuinely different sizes to each other, where a raw count would just reflect module size rather than code quality. Normalizing (density) is what makes a fair apples-to-apples comparison possible across differently-sized things; it is not automatically needed when comparing one thing to its own past.' },
      ]),
    ]),
    mod(4, 'How Long Do Defects Actually Stay Open', [
      'Defect age groups every currently-open defect by how many days it has been open, regardless of severity.',
      mdTable(['Age', ...ageBuckets.map((b) => b.label)], [['Count', ...ageBuckets.map((b) => String(b.count))]]),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Most defects close within a week, ${ageBuckets[0].count + ageBuckets[1].count} of ${ageTotal}, but ${oldPct}% have been open more than two weeks. A defect that has survived that long usually is not waiting on someone to notice it, it is waiting on something structural: unclear ownership, low priority relative to feature work, or a fix that turned out harder than expected.`,
      'This distribution shape matters more than the total open count. A team with 80 open defects, mostly closing within 2 days, is in a healthier position than a team with 40 open defects where half have sat for a month, even though the second team’s raw number looks better.',
      tryItBlock([
        { q: `${ageBuckets[4].count} defects have been open 30+ days. What would you check before assuming these are simply low priority and fine to ignore?`, a: 'Check the severity of those specific aged defects (using Module 2’s severity tagging). A 30-day-old minor cosmetic bug is genuinely low priority and fine to age. A 30-day-old critical or major defect sitting untouched that long is a real risk signal, regardless of the age distribution looking mostly healthy overall, since the shape of this chart alone does not show severity.' },
        { q: 'Would you rather see a distribution shifted heavily toward "0-2 days" with a long thin tail out to 30+ days, or one evenly spread across all five buckets? Explain.', a: 'The heavily front-loaded shape with a thin tail is healthier. It shows most defects get triaged and fixed fast (a functioning process), with only a small number of genuinely hard or deprioritized cases lingering, which is expected and manageable. An even spread across all buckets suggests no consistent triage process at all, meaning fix time is closer to random than driven by priority.' },
      ]),
    ]),
    mod(5, 'Defects: A Decision Cheat Sheet', [
      'A single "open defects" number answers almost no useful question. Severity trend tells you if risk is rising or falling. Density by module tells you where the codebase is structurally weakest. Age distribution tells you whether the triage process is actually working.',
      mdTable(
        ['Signal', 'Answers', 'Does not answer'],
        [
          ['Severity trend', 'Is overall risk rising or falling', 'Where in the codebase the risk concentrates'],
          ['Density by module', 'Which module is structurally the weakest, size-adjusted', 'Whether that module’s defects are urgent or trivial'],
          ['Age distribution', 'Whether triage and fixing are keeping pace', 'Whether the aged defects specifically matter'],
        ],
      ),
      `Meridian’s actual next move: a dedicated stabilization sprint for Payments (the density outlier), plus a rule that any defect open past 14 days automatically escalates for a priority re-check. Neither decision would have been obvious from "42 open defects" alone.`,
    ]),
  ];

  return { slug: 'measuring-defects', name: 'Measuring Defects', role: 'qa',
    description: 'Split a single defect count into severity trend, module density, and age distribution to see what a raw number hides, using one fictional product’s 6-release dataset.',
    datasetName: 'Meridian', datasetNotes: `# Meridian dataset notes\n\nE-commerce product, 5 modules: ${modulesList.join(', ')}. 6 releases.\n\nCritical by release: ${critical.join(', ')}\nMajor by release: ${major.join(', ')}\nMinor by release: ${minor.join(', ')}\nDensity by module: ${modulesList.map((m,i)=>`${m}=${density[i]}`).join(', ')}\nAge buckets: ${JSON.stringify(ageBuckets)}, total ${ageTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 10: measuring-defect-leakage (Tidewater, 8 releases)
// ============================================================
function courseDefectLeakage() {
  const releases = Array.from({ length: 8 }, (_, i) => `R${i + 1}`);
  const leakageRate = [22, 19, 24, 17, 14, 11, 9, 7]; // % of defects that escaped to prod, trending down
  const rootCause = { 'Missed test case': 18, 'Environment difference': 11, 'Late requirement change': 9, 'Flaky test masked it': 6 };
  const causeTotal = sum(Object.values(rootCause));
  const escapedSeverity = { Critical: 4, Major: 15, Minor: 25 };
  const escapedTotal = sum(Object.values(escapedSeverity));

  const charts = [
    { file: 'leakage-rate-trend.svg', alt: 'Line chart of Tidewater defect leakage rate percentage across 8 releases, falling from 22% to 7%', caption: 'Shown as a line chart because the point is the trend across 8 releases, not a single comparison.',
      svg: chartBuilders.line({ title: 'Tidewater: Defect Leakage Rate by Release (%)', xLabels: releases, series: [{ name: 'Leakage %', values: leakageRate, color: '#ef4444' }], yLabel: '%' }) },
    { file: 'leakage-by-cause.svg', alt: 'Bar chart comparing escaped defects by root cause across four categories', caption: 'Shown as a bar chart because the point is comparing four causes by count, to decide what to fix first.',
      svg: chartBuilders.bar({ title: 'Tidewater: Escaped Defects by Root Cause', categories: Object.keys(rootCause), values: Object.values(rootCause) }) },
    { file: 'leakage-severity-mix.svg', alt: 'Donut chart of Tidewater escaped defects split by severity, critical, major, and minor', caption: 'Shown as a donut chart because this is composition, how the whole set of escaped defects splits by severity.',
      svg: chartBuilders.donut({ title: 'Tidewater: Escaped Defects by Severity', segments: Object.entries(escapedSeverity).map(([name, value]) => ({ name, value, color: name === 'Critical' ? '#ef4444' : name === 'Major' ? '#f59e0b' : '#94a3b8' })) }) },
  ];

  const rateStart = round1(avg(leakageRate.slice(0, 3)));
  const rateEnd = round1(avg(leakageRate.slice(-3)));
  const topCause = Object.keys(rootCause).reduce((a, b) => (rootCause[a] > rootCause[b] ? a : b));
  const criticalEscapedPct = pct(escapedSeverity.Critical, escapedTotal);

  const modules = [
    mod(1, 'The Defects That Get Past You', [
      'Tidewater’s QA team had a healthy overall defect-catching record, but leadership kept asking the same question after every incident: how did this one get through? This course is built entirely around that specific question, escaped defects, not defects in general.',
      'The dataset: Tidewater, a fictional QA team, tracked across 8 releases. All figures are illustrative. Note the difference from a general defect-tracking course: this one looks only at the subset that escaped testing and reached production.',
      'Three angles: how the leakage rate is trending, why defects escape when they do, and how severe the ones that get through actually are. A team that only tracks the rate misses the second and third questions entirely.',
    ]),
    mod(2, 'Leakage Rate Across Eight Releases', [
      'Leakage rate is the percentage of all defects found (in testing plus in production) that were found in production, defects testing missed. It is the mirror image of defect detection percentage from a different course: what testing missed instead of what it caught.',
      mdTable(['Release', ...releases], [['Leakage rate (%)', ...leakageRate.map(String)]]),
      `Releases 1 through 3 averaged ${rateStart}% leakage. Releases 6 through 8 averaged ${rateEnd}%, a drop of ${round1(rateStart - rateEnd)} points. Tidewater’s change: they added a staging environment that mirrors production configuration exactly, closing a gap that had been letting environment-specific bugs through untested.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'A falling leakage rate is good news on its own, more so than most metrics in this course family, since it is hard to improve this number without genuinely catching more defects before release. But it says nothing about how bad the defects that still get through are, which is exactly what the next two modules cover.',
      tryItBlock([
        { q: 'Leakage rate fell steadily from 22% to 7% over 8 releases. Would you expect it to keep falling toward 0% indefinitely with continued investment?', a: 'No. Some leakage is close to unavoidable: production-scale traffic patterns, real user data combinations, and third-party service behavior can surface conditions no pre-release environment fully replicates. A realistic floor exists somewhere above 0%, and a team reporting leakage suspiciously close to zero is worth double-checking for under-reporting rather than assuming a perfect testing process.' },
      ]),
    ]),
    mod(3, 'Why Defects Actually Escape', [
      `Tidewater tagged every escaped defect with a root cause. Across 8 releases: ${rootCause['Missed test case']} traced to a test case that should have existed but did not, ${rootCause['Environment difference']} to staging not matching production, ${rootCause['Late requirement change']} to a requirement changing after test cases were written, and ${rootCause['Flaky test masked it']} to a flaky test that had actually caught the bug but got dismissed as noise.`,
      mdTable(['Cause', 'Count', 'Share'], Object.entries(rootCause).map(([k, v]) => [k, String(v), `${pct(v, causeTotal)}%`])),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `${topCause} accounts for ${pct(rootCause[topCause], causeTotal)}% of escapes, the largest single cause. That is the fix-first target for reducing leakage further, and it points at a test-case-writing gap, not a tooling or environment gap.`,
      'The fourth cause, a flaky test that had actually caught the bug, deserves special attention even at its smaller count. It means the defect was not actually missed by testing at all, it was caught and then ignored because the team had learned not to trust that particular test. This is the same trust erosion problem a different course in this series covers for automation specifically.',
      tryItBlock([
        { q: `${rootCause['Flaky test masked it']} escapes trace to a flaky test that had actually flagged the bug. Is this the same root cause as "missed test case," and should Tidewater fix it the same way?`, a: 'No, it is a fundamentally different problem with a different fix. A missed test case means the test never existed and needs to be written. A flaky-test-masked escape means the test existed and worked, but the team stopped trusting its results due to noise, so the fix is stabilizing that specific test (removing its flakiness), not writing a new one. Treating both the same way, by adding more tests, would not address the trust problem behind the flaky-masked cases at all.' },
        { q: 'Would investing entirely in environment parity (closing the staging gap further) address most of Tidewater’s remaining leakage?', a: `No. Environment difference accounts for only ${pct(rootCause['Environment difference'], causeTotal)}% of escapes, well behind missed test cases at ${pct(rootCause['Missed test case'], causeTotal)}%. Environment parity work already paid off (it is what drove the Module 2 trend), but further investment there would have a much smaller ceiling than addressing test coverage gaps directly.` },
      ]),
    ]),
    mod(4, 'How Bad Are the Ones That Get Through', [
      `The ${escapedTotal} escaped defects across the 8 releases, by severity: ${escapedSeverity.Critical} critical, ${escapedSeverity.Major} major, ${escapedSeverity.Minor} minor.`,
      mdTable(['Severity', 'Count', 'Share'], Object.entries(escapedSeverity).map(([k, v]) => [k, String(v), `${pct(v, escapedTotal)}%`])),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `Critical escapes are only ${criticalEscapedPct}% of the total, but every one of those ${escapedSeverity.Critical} defects reached a real user before anyone caught it. A falling leakage rate (Module 2) that still lets critical defects through is a very different situation from one where the leakage that remains is entirely minor and cosmetic.`,
      'This chart is why Tidewater does not treat leakage rate as the only success measure. A team could theoretically hold leakage rate flat while shifting the mix toward fewer, more severe escapes, which would be a worse outcome dressed up as a stable metric. Severity mix among the escapes is the check against that blind spot.',
      tryItBlock([
        { q: 'If next quarter’s leakage rate held flat at 7% but the critical share of escapes rose from 12% to 40%, would that be an improvement, a decline, or impossible to say from leakage rate alone?', a: 'A decline, and impossible to detect from leakage rate alone, which is exactly the point of tracking severity mix separately. The same overall rate can hide a shift toward far more consequential escapes. This scenario is precisely why leakage rate should never be reported without its accompanying severity breakdown.' },
      ]),
    ]),
    mod(5, 'Defect Leakage: A Decision Cheat Sheet', [
      'Leakage rate tells you the trend. Root cause tells you what to fix first. Severity mix tells you whether the escapes that remain are dangerous or just annoying. All three are needed to know whether "leakage is improving" is actually true in the way that matters.',
      mdTable(
        ['Signal', 'Use it to', 'Common misread'],
        [
          ['Leakage rate trend', 'Track whether the overall miss rate is improving', 'Assume improving rate means improving outcomes without checking severity'],
          ['Escapes by root cause', 'Decide where to invest next (test cases vs environment vs process)', 'Treat every cause as fixable the same way'],
          ['Escapes by severity', 'Catch a shift toward more dangerous escapes hiding behind a stable rate', 'Ignore severity because the rate alone looks fine'],
        ],
      ),
      'Tidewater’s actual next investment, after this analysis, was not more environment work (already paying diminishing returns) but a requirement-change protocol: any requirement change after test cases are written triggers an automatic test-case review, directly targeting the largest remaining cause of escapes.',
    ]),
  ];

  return { slug: 'measuring-defect-leakage', name: 'Measuring Defect Leakage', role: 'qa',
    description: 'Track the defects that get past testing specifically, why they escape and how severe they are, using one fictional QA team’s 8-release dataset, distinct from general defect tracking.',
    datasetName: 'Tidewater', datasetNotes: `# Tidewater dataset notes\n\nQA team tracking escaped defects. 8 releases.\n\nLeakage rate by release (%): ${leakageRate.join(', ')}\nEscapes by root cause: ${JSON.stringify(rootCause)}, total ${causeTotal}\nEscapes by severity: ${JSON.stringify(escapedSeverity)}, total ${escapedTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 11: measuring-test-stability (Driftwood CI, 30 days)
// ============================================================
function courseTestStability() {
  const days = Array.from({ length: 30 }, (_, i) => `D${i + 1}`);
  const flakyRate = [18, 16, 20, 15, 14, 12, 13, 11, 9, 10, 8, 9, 7, 8, 6, 7, 5, 6, 5, 4, 5, 4, 3, 4, 3, 3, 2, 3, 2, 2]; // % of runs with a flaky failure, trending down
  const flakyTests = ['test_checkout_timing', 'test_upload_large_file', 'test_search_pagination', 'test_login_oauth_redirect', 'test_notification_delay', 'test_cart_sync'];
  const failCount = [34, 27, 21, 18, 12, 9];
  const timeToGreenBuckets = [
    { label: '<5m', count: 61 },
    { label: '5-15m', count: 84 },
    { label: '15-30m', count: 38 },
    { label: '30-60m', count: 14 },
    { label: '60m+', count: 6 },
  ];
  const ttgTotal = sum(timeToGreenBuckets.map((b) => b.count));

  const charts = [
    { file: 'flaky-rate-trend.svg', alt: 'Line chart of Driftwood CI flaky test rate percentage across 30 days, falling from 18% to 2%', caption: 'Shown as a line chart because the point is the trend across 30 days, not a single comparison.',
      svg: chartBuilders.line({ title: 'Driftwood CI: Flaky Test Rate by Day (%)', xLabels: days, series: [{ name: 'Flaky rate %', values: flakyRate, color: '#ef4444' }], yLabel: '%' }) },
    { file: 'top-flaky-tests.svg', alt: 'Bar chart comparing fail counts across the top six flakiest tests in the Driftwood CI suite', caption: 'Shown as a bar chart because the point is comparing six specific tests against each other, not a trend over time.',
      svg: chartBuilders.bar({ title: 'Driftwood CI: Top Flaky Tests by Fail Count', categories: flakyTests.map((t) => t.replace('test_', '')), values: failCount }) },
    { file: 'time-to-green.svg', alt: 'Histogram of Driftwood CI time to green in minutes, from push to a stable passing pipeline', caption: 'Shown as a histogram because the point is the distribution of how long a pipeline takes to go green, not a comparison of separate categories.',
      svg: chartBuilders.histogram({ title: 'Driftwood CI: Time to Green Distribution (minutes)', buckets: timeToGreenBuckets, color: '#0ea5e9', yLabel: 'pipeline runs' }) },
  ];

  const rateStart = round1(avg(flakyRate.slice(0, 5)));
  const rateEnd = round1(avg(flakyRate.slice(-5)));
  const worstTest = flakyTests[failCount.indexOf(Math.max(...failCount))].replace('test_', '');
  const under15minPct = pct(timeToGreenBuckets[0].count + timeToGreenBuckets[1].count, ttgTotal);

  const modules = [
    mod(1, 'A Red Pipeline Nobody Believes', [
      'Driftwood CI’s engineers had developed a habit: see a red pipeline, click retry without looking, move on. That habit is the actual failure mode this course is about, not any individual bug.',
      'The dataset: Driftwood CI, a fictional pipeline serving one product team, tracked over 30 days of runs. All figures are illustrative.',
      'Three angles: how the flaky rate trended after the team focused on it, which specific tests cause most of the noise, and how long a pipeline actually takes to reach a trustworthy green.',
    ]),
    mod(2, 'Flaky Test Rate Across Thirty Days', [
      'Flaky rate is the percentage of pipeline runs that had at least one test fail, then pass on retry with no code change, in other words, a false alarm.',
      mdTable(['Day', ...days.slice(0, 15)], [['Rate (%)', ...flakyRate.slice(0, 15).map(String)]]) + '\n\n' + mdTable(['Day', ...days.slice(15)], [['Rate (%)', ...flakyRate.slice(15).map(String)]]),
      `The first five days averaged ${rateStart}% flaky rate. The last five days averaged ${rateEnd}%, a fall of ${round1(rateStart - rateEnd)} points. Driftwood’s fix was not a tooling change: they instituted a rule that any test failing twice in one week without a related code change gets quarantined out of the main suite until someone fixes it.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'This is one of the highest-value trends a CI-owning team can chase, since flakiness compounds. Every flaky run trains engineers to distrust red pipelines, and a team that distrusts its pipeline eventually stops reacting to genuine failures too.',
      tryItBlock([
        { q: 'The flaky rate falls almost every single day with barely any noise in the trend line. Is a curve this smooth suspicious?', a: 'A smooth downward curve is plausible here because the fix (quarantining repeat offenders) is a continuous, incremental process, tests get quarantined steadily as they hit the two-failures-in-a-week threshold, rather than one big sweeping change. A smooth trend like this is consistent with steady process improvement rather than automatically suspicious, but it would be worth confirming the quarantine list actually grew steadily too, matching the story.' },
      ]),
    ]),
    mod(3, 'Which Tests Are Actually the Problem', [
      `Driftwood identified its six flakiest tests by fail count over the 30 days: ${flakyTests.map((t, i) => `${t.replace('test_', '')} (${failCount[i]})`).join(', ')}.`,
      mdTable(['Test', ...flakyTests.map((t) => t.replace('test_', ''))], [['Fail count', ...failCount.map(String)]]),
      `${worstTest} failed ${Math.max(...failCount)} times, nearly four times the count of the least flaky test on this list.`,
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `Flaky rate as a single team-wide percentage (Module 2) hides that flakiness is rarely evenly distributed. It concentrates in a small number of genuinely bad tests, usually ones with a real timing dependency (a checkout test waiting on an animation, in this case) rather than a systemic problem with the whole suite.`,
      tryItBlock([
        { q: `${worstTest} accounts for the most failures on this list. If Driftwood could only fix one test this week, would fixing ${worstTest} alone meaningfully move the overall flaky rate from Module 2?`, a: `Very likely yes, more than fixing any other single test on the list, since it accounts for the largest share of failures among the six worst offenders. This is the same logic as Pareto-style prioritization elsewhere in this course family: fixing the single biggest contributor usually returns more than spreading the same effort evenly across all flaky tests.` },
        { q: 'What does the test name pattern here (timing, file upload, pagination, redirect, delay, sync) suggest about the common root cause of flakiness in this suite?', a: 'All six involve some form of waiting on an external or asynchronous condition, network timing, animation completion, a redirect round-trip, background sync, rather than pure logic. This pattern suggests the team’s flakiness is largely a test-design problem (tests not waiting properly for async conditions to resolve) rather than random environment noise, which points toward a shared fix pattern (explicit waits, better synchronization) across multiple tests at once.' },
      ]),
    ]),
    mod(4, 'Time to Green: What Trust Actually Costs', [
      'Time to green is the minutes between a push and the pipeline reporting a stable, trustworthy passing result, including any retries needed along the way.',
      mdTable(['Time', ...timeToGreenBuckets.map((b) => b.label)], [['Runs', ...timeToGreenBuckets.map((b) => String(b.count))]]),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `${under15minPct}% of runs reach green within 15 minutes, but ${timeToGreenBuckets[3].count + timeToGreenBuckets[4].count} runs, a real and costly minority, take over 30 minutes, some over an hour. Every one of those long tails traces back to a flaky retry cycle, exactly the problem Modules 2 and 3 are about.`,
      'This distribution is the dollar-and-cents version of the flaky rate story. A 2% flaky rate sounds small until you see it concentrated into a long tail of engineers waiting nearly an hour for a pipeline that should have taken five minutes, on the days their run happened to hit one of the surviving flaky tests.',
      tryItBlock([
        { q: 'If Driftwood fully fixed the worst flaky test from Module 3, which part of this histogram would you expect to shrink the most?', a: 'The long tail, specifically the 30-60m and 60m+ buckets. Those long times are driven by retry cycles from flaky failures, not by genuinely slow tests, so removing the single biggest source of flaky retries should pull the most extreme outliers back toward the 5-15m bucket where most runs already land, shrinking the tail more than it changes the bulk of the distribution.' },
      ]),
    ]),
    mod(5, 'Test Stability: A Decision Cheat Sheet', [
      'Flaky rate over time tells you if the overall trend is improving. Fail count by test tells you exactly where to spend fixing effort for the biggest return. Time-to-green distribution tells you what flakiness actually costs in engineer waiting time, which is the number that gets budget approved for a stability sprint.',
      mdTable(
        ['Signal', 'Use it to', 'Common misread'],
        [
          ['Flaky rate trend', 'Confirm a stability initiative is working', 'Report as a single number without a fix-in-progress story behind it'],
          ['Fail count by test', 'Prioritize which specific test to fix first', 'Treat flakiness as evenly spread across the whole suite'],
          ['Time to green distribution', 'Show the real cost in engineer waiting time', 'Report only average time, hiding the long tail'],
        ],
      ),
      `Driftwood's actual quarantine list started with exactly one test, ${worstTest}, and the fail-count chart was the evidence that made that an easy call instead of a debate. A CI stability effort with a ranked list of offenders moves faster than one arguing about "the suite feels flaky."`,
    ]),
  ];

  return { slug: 'measuring-test-stability', name: 'Measuring Test Stability', role: 'qa',
    description: 'Track flaky rate, which specific tests cause the noise, and what flakiness actually costs in wait time, using one fictional CI pipeline’s 30-day dataset.',
    datasetName: 'Driftwood CI', datasetNotes: `# Driftwood CI dataset notes\n\nCI pipeline, 30 days.\n\nFlaky rate by day (%): ${flakyRate.join(', ')}\nFail count by test: ${flakyTests.map((t,i)=>`${t}=${failCount[i]}`).join(', ')}\nTime to green buckets: ${JSON.stringify(timeToGreenBuckets)}, total ${ttgTotal}`,
    modules, charts };
}

// ============================================================
// COURSE 12: measuring-quality-trends (Compass QA, 4 quarters / 1 year)
// ============================================================
function courseQualityTrends() {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const passRate = [82, 85, 89, 93];
  const testTypeMix = {
    unit: [45, 48, 52, 58],
    integration: [30, 29, 28, 26],
    e2e: [25, 23, 20, 16],
  };
  const regressionCauses = { 'Feature complexity': 21, 'Technical debt': 34, Environment: 12, 'Process gap': 15 };
  const causesTotal = sum(Object.values(regressionCauses));

  const charts = [
    { file: 'pass-rate-by-quarter.svg', alt: 'Line chart of Compass QA overall pass rate percentage across four quarters, rising from 82% to 93%', caption: 'Shown as a line chart because the point is the trend across four quarters, not a single comparison.',
      svg: chartBuilders.line({ title: 'Compass QA: Overall Pass Rate by Quarter (%)', xLabels: quarters, series: [{ name: 'Pass rate %', values: passRate, color: '#10b981' }], yLabel: '%' }) },
    { file: 'test-type-mix.svg', alt: 'Stacked bar chart of Compass QA test suite composition, unit, integration, and end-to-end share, across four quarters', caption: 'Shown as a stacked bar chart because the point is how the suite’s composition shifts across categories over time, not a single trend line or a single whole.',
      svg: chartBuilders.stackedBar({ title: 'Compass QA: Test Type Mix by Quarter (%)', categories: quarters, series: [
        { name: 'Unit', values: testTypeMix.unit, color: '#4f46e5' },
        { name: 'Integration', values: testTypeMix.integration, color: '#0ea5e9' },
        { name: 'E2E', values: testTypeMix.e2e, color: '#f59e0b' },
      ] }) },
    { file: 'regression-root-cause.svg', alt: 'Donut chart of Compass QA quarter-over-quarter regressions split by root cause, feature complexity, technical debt, environment, and process gap', caption: 'Shown as a donut chart because this is composition, how the whole set of regressions splits by root cause.',
      svg: chartBuilders.donut({ title: 'Compass QA: Regression Root Cause Mix (year total)', segments: Object.entries(regressionCauses).map(([name, value]) => ({ name, value })) }) },
  ];

  const passRateGain = passRate[3] - passRate[0];
  const e2eShift = testTypeMix.e2e[0] - testTypeMix.e2e[3];
  const topCause = Object.keys(regressionCauses).reduce((a, b) => (regressionCauses[a] > regressionCauses[b] ? a : b));

  const modules = [
    mod(1, 'One Quarter Tells You Nothing', [
      'Compass QA’s leadership judged quality quarter by quarter, in isolation, which meant every quarterly review started from scratch with no sense of direction. This course looks at a full year at once, on purpose.',
      'The dataset: Compass QA, a fictional QA org, tracked across four quarters of one year. All figures are illustrative.',
      'Three angles across the year: overall pass rate, how the test suite’s composition shifted, and what actually causes quarter-over-quarter regressions. None of these are visible from any single quarter’s snapshot.',
    ]),
    mod(2, 'Pass Rate Across a Full Year', [
      'Overall pass rate is the percentage of all test runs, across every suite, that passed clean in a given quarter.',
      mdTable(['Quarter', ...quarters], [['Pass rate (%)', ...passRate.map(String)]]),
      `Pass rate rose from ${passRate[0]}% in Q1 to ${passRate[3]}% in Q4, a gain of ${passRateGain} points across the year. This kind of steady multi-quarter climb is a different signal than a single strong quarter, it suggests something structural changed, not a one-time push before a big release.`,
      chartBlock('__CHART_0__', charts[0].alt, charts[0].caption),
      'A single quarter’s pass rate can swing on release timing, team size, or which features happened to ship. A year of quarters climbing together is much harder to explain away as noise, which is exactly why this course insists on the full-year view instead of a single quarter’s number.',
      tryItBlock([
        { q: 'Q1’s pass rate was 82%, noticeably lower than the other three quarters. Before treating Q1 as evidence of a real problem, what context from later in the year would help you interpret it?', a: 'Whether Q1 is simply the baseline before whatever process changes drove Q2 through Q4’s improvement even started. A rising trend across the rest of the year suggests Q1 was the "before" state, not an anomaly, so the right read is "the starting point," not "the alarming quarter."' },
      ]),
    ]),
    mod(3, 'How the Suite’s Composition Shifted', [
      `Compass tracked what share of the test suite was unit, integration, and end-to-end tests, each quarter. Unit share: ${testTypeMix.unit.join('%, ')}%. Integration share: ${testTypeMix.integration.join('%, ')}%. E2E share: ${testTypeMix.e2e.join('%, ')}%.`,
      mdTable(['Quarter', ...quarters], [['Unit (%)', ...testTypeMix.unit.map(String)], ['Integration (%)', ...testTypeMix.integration.map(String)], ['E2E (%)', ...testTypeMix.e2e.map(String)]]),
      chartBlock('__CHART_1__', charts[1].alt, charts[1].caption),
      `Unit test share grew from ${testTypeMix.unit[0]}% to ${testTypeMix.unit[3]}%, while end-to-end share fell from ${testTypeMix.e2e[0]}% to ${testTypeMix.e2e[3]}%, a shift of ${e2eShift} points. That is the classic testing pyramid taking shape: more fast, cheap, reliable unit tests, fewer slow, brittle end-to-end tests. It is very likely a direct contributor to the rising pass rate in Module 2, since e2e tests are the most prone to environmental flakiness.`,
      'A single quarter’s snapshot of test type mix would just be a pie chart with no story. Watching the mix shift across four quarters shows a deliberate strategy taking hold, or reveals one that is not, which is the more common and more useful read for a leadership review.',
      tryItBlock([
        { q: 'The suite shifted toward more unit tests and fewer e2e tests across the year, and pass rate rose over the same period. Does this prove the mix shift caused the pass rate improvement?', a: 'It strongly suggests a connection but does not prove causation on its own. Both trends moving together over the same four quarters is consistent with the mix shift being a driver (fewer flaky e2e tests directly raises pass rate), but other simultaneous changes could also contribute. The stacked-bar chart shows correlation across a meaningful timeframe; confirming causation would need isolating the effect, for instance checking whether e2e-specific pass rate also improved independent of its shrinking share.' },
        { q: 'Would a QA org with 90% e2e tests and 10% unit tests likely show a smoother or a noisier pass rate trend than Compass, all else equal?', a: 'Noisier. End-to-end tests depend on more moving parts (full environment, network, timing, third-party services) and are inherently more prone to flaky, non-deterministic failures than unit tests, which run in isolation. An org weighted that heavily toward e2e would likely see a bumpier pass-rate line quarter to quarter, even without any real change in code quality.' },
      ]),
    ]),
    mod(4, 'What Actually Causes a Regression', [
      `Every quarter-over-quarter regression across the year got tagged with a root cause: ${regressionCauses['Feature complexity']} traced to inherently complex new features, ${regressionCauses['Technical debt']} to known unaddressed technical debt, ${regressionCauses.Environment} to environment differences, ${regressionCauses['Process gap']} to a gap in the release process itself.`,
      mdTable(['Cause', 'Count', 'Share'], Object.entries(regressionCauses).map(([k, v]) => [k, String(v), `${pct(v, causesTotal)}%`])),
      chartBlock('__CHART_2__', charts[2].alt, charts[2].caption),
      `${topCause} accounts for ${pct(regressionCauses[topCause], causesTotal)}% of the year’s regressions, more than any other single cause. That connects directly back to a different course in this series: technical debt is not just a code cleanliness concern, it is measurably the single biggest source of quality regressions at Compass across the whole year.`,
      'This chart is what turns "quality improved this year" from a vague feeling into an actionable plan for next year: whatever technical debt work is funded next should be aimed specifically at the debt most likely to cause a regression, not spread evenly across the whole backlog.',
      tryItBlock([
        { q: 'Given that pass rate rose all year (Module 2) while technical debt remained the single largest cause of regressions (this module), what does that combination suggest about where the improvement actually came from?', a: 'It suggests the pass rate gain came mostly from testing-side improvements (the shift toward more unit tests, Module 3) rather than from the codebase itself getting less debt-laden. Technical debt staying the top regression cause all year, even as pass rate improved, means the underlying debt was not meaningfully addressed, the team got better at catching problems, not at preventing them at the source.' },
      ]),
    ]),
    mod(5, 'Quality Trends: A Decision Cheat Sheet', [
      'A single quarter never tells the real story. Pass rate across a full year shows whether change is structural or a one-off. Test type mix across the year shows whether the testing strategy itself is evolving. Root cause of regressions across the year shows where next year’s investment should actually go.',
      mdTable(
        ['Signal', 'Read across', 'What it tells you'],
        [
          ['Pass rate', 'At least 3-4 quarters', 'Whether an improvement is structural or a single good quarter'],
          ['Test type mix', 'Multiple quarters', 'Whether the testing strategy itself is shifting on purpose'],
          ['Regression root cause', 'A full year, aggregated', 'Where the next investment (debt, process, complexity) should go'],
        ],
      ),
      'Compass QA’s actual year-end recommendation, straight from this data: keep pushing the unit-test shift (it is working), and fund technical debt reduction specifically in the areas most linked to past regressions, not the backlog in general. Neither conclusion was visible from any single quarter on its own.',
    ]),
  ];

  return { slug: 'measuring-quality-trends', name: 'Measuring Quality Trends', role: 'qa',
    description: 'Read pass rate, test suite composition, and regression root cause across a full year instead of one quarter at a time, using one fictional QA org’s dataset.',
    datasetName: 'Compass QA', datasetNotes: `# Compass QA dataset notes\n\nQA org, 4 quarters (1 year).\n\nPass rate by quarter (%): ${passRate.join(', ')}\nTest type mix: unit=${testTypeMix.unit.join(',')} integration=${testTypeMix.integration.join(',')} e2e=${testTypeMix.e2e.join(',')}\nRegression root cause: ${JSON.stringify(regressionCauses)}, total ${causesTotal}`,
    modules, charts };
}

console.log('[data] all 12 courses built');
export { mod, chartBlock, tryItBlock, mdTable, round1, avg, sum, pct, chartBuilders, BUNNY, API, ROOT, execFileSync, fs, path,
  courseDeveloperProductivity, courseCodeReview, courseDeliverySpeed, courseRework, courseCodeQuality, courseTechnicalDebt,
  courseTestEffectiveness, courseTestAutomation, courseDefects, courseDefectLeakage, courseTestStability, courseQualityTrends };
