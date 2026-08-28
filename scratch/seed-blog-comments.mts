// Seed blog comments: 45 top-level comments across the 10 latest published
// posts (4-5 each), each with 8-10 nested replies. Authors alternate
// between the free-test and paid-test accounts; every body starts with
// "Bot". Direct Prisma writes (same precedent as Test-Accounts seeding) —
// the API's 5-per-minute comment rate limit would make ~450 API calls take
// ~45 minutes. createdAt is staggered so chrono/upvotes sorting looks
// natural. Run from repo root: npx tsx scratch/seed-blog-comments.mts
import { prisma } from '../apps/api/src/lib/prisma';

const TOP_LEVEL_TOTAL = 45;

const TOP_BODIES = [
  'Bot: walked through this end to end and the flow finally clicked for me.',
  'Bot: bookmarking this one — the middle section is pure gold.',
  'Bot: this cleared up a confusion I have carried for months.',
  'Bot: the examples here are exactly what the official docs are missing.',
  'Bot: reading this before my interview tomorrow, feels much calmer now.',
  'Bot: shared this with my whole team, the diagrams explain it perfectly.',
  'Bot: the step-by-step pacing makes a dense topic genuinely approachable.',
  'Bot: came for a quick refresher, stayed for the whole thing.',
  'Bot: the pitfalls section saved me from a mistake I was about to make.',
  'Bot: best explanation of this topic I have found so far.',
];

const REPLY_BODIES = [
  'Bot reply: same here, this was the missing piece for me.',
  'Bot reply: agreed, though I would add that practice matters more than theory here.',
  'Bot reply: thanks for writing this, revisiting it before my exam.',
  'Bot reply: can confirm — tried this approach on a real project and it held up.',
  'Bot reply: this thread deserves more attention than it is getting.',
  'Bot reply: slightly off-topic but the related post linked here is also worth reading.',
  'Bot reply: the author updated this? The new example is even clearer.',
  'Bot reply: exactly what I was going to say, well put.',
  'Bot reply: bookmarked. The comparison table alone is worth it.',
  'Bot reply: I disagree on one nuance, but overall a very fair summary.',
  'Bot reply: this is the comment I needed to read today.',
  'Bot reply: took me two read-throughs but it finally clicked.',
];

// The EXACT latest-10 as /blog serves them (GET /blog?limit=10 —
// publishedAt desc, id desc). Do not re-derive with a different
// tiebreaker: the batched import shares identical publishedAt values, so
// tiebreak order decides which 10 are "latest".
const TARGET_SLUGS = [
  'dummu-code-review-note-in-kotlin',
  'dummu-memory-management-in-regex',
  'dummu-monitoring-tip-in-regex',
  'dummu-monitoring-tip-in-kotlin',
  'dummu-security-note-in-yaml',
  'dummu-naming-convention-in-kotlin',
  'dummu-error-handling-in-graphql',
  'dummu-design-pattern-in-kotlin',
  'dummu-version-control-tip-in-regex',
  'dummu-testing-tip-in-regex',
];

async function main() {
  const [freeUser, paidUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'free-test@sypher.local' } }),
    prisma.user.findUnique({ where: { email: 'paid-test@sypher.local' } }),
  ]);
  if (!freeUser || !paidUser) throw new Error('test accounts missing — re-run the Test-Accounts seeding first');

  const posts = await prisma.blogPost.findMany({
    where: { status: 'published', slug: { in: TARGET_SLUGS } },
    select: { id: true, slug: true, title: true },
  });
  if (posts.length !== TARGET_SLUGS.length) throw new Error(`only ${posts.length}/${TARGET_SLUGS.length} target posts found`);
  // Keep the site's ordering.
  posts.sort((a, b) => TARGET_SLUGS.indexOf(a.slug) - TARGET_SLUGS.indexOf(b.slug));
  console.log(`seeding on ${posts.length} posts:`, posts.map((p) => p.slug).join(', '));

  // Idempotent re-runs: every seeded body starts with "Bot" — clear prior
  // batches first so counts stay exact.
  const cleared = await prisma.comment.deleteMany({ where: { body: { startsWith: 'Bot' } } });
  console.log(`cleared previous Bot comments: ${cleared.count}`);

  // ~2h between top-level comments walking backwards from 3 days ago.
  const base = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const step = (2 * 60 * 60 * 1000) / TOP_LEVEL_TOTAL;

  let topLevelMade = 0;
  let repliesMade = 0;
  for (let i = 0; i < TOP_LEVEL_TOTAL; i++) {
    const post = posts[i % posts.length];
    const author = i % 2 === 0 ? freeUser : paidUser;
    const createdAt = new Date(base + i * step);
    const top = await prisma.comment.create({
      data: {
        blogPostId: post.id,
        userId: author.id,
        body: `${TOP_BODIES[i % TOP_BODIES.length]} (Bot comment ${i + 1} on ${post.slug})`,
        createdAt,
        updatedAt: createdAt,
      },
    });
    topLevelMade++;

    const replyCount = 8 + ((i + posts.indexOf(post)) % 3); // 8..10
    for (let k = 0; k < replyCount; k++) {
      // Replies land 5-45 minutes after their parent, alternating authors.
      const replyAt = new Date(createdAt.getTime() + (5 + k * 5) * 60 * 1000);
      const replier = (i + k) % 2 === 0 ? freeUser : paidUser;
      await prisma.comment.create({
        data: {
          blogPostId: post.id,
          userId: replier.id,
          parentId: top.id,
          body: `${REPLY_BODIES[(i + k) % REPLY_BODIES.length]} (Bot reply ${i + 1}.${k + 1})`,
          createdAt: replyAt,
          updatedAt: replyAt,
        },
      });
      repliesMade++;
    }
  }

  console.log(`created ${topLevelMade} top-level comments + ${repliesMade} replies`);

  // Server-truth verification: counts per post + nested integrity.
  const byPost = await prisma.comment.groupBy({
    by: ['blogPostId'],
    where: { blogPostId: { in: posts.map((p) => p.id) } },
    _count: { _all: true },
  });
  const orphans = await prisma.comment.count({ where: { blogPostId: { in: posts.map((p) => p.id) }, parentId: { not: null }, parent: null } });
  const bots = await prisma.comment.count({
    where: { blogPostId: { in: posts.map((p) => p.id) }, body: { not: { startsWith: 'Bot' } } },
  });
  console.log('comments per post:', byPost.map((r) => `${posts.find((p) => p.id === r.blogPostId)?.slug}:${r._count._all}`).join(' '));
  console.log(`orphan replies: ${orphans} | non-Bot bodies: ${bots}`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error('SEED FAIL:', e.message);
    process.exit(1);
  });
