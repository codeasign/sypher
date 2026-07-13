const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Post content is baked into blog-content/*.md by scripts/bake-blog-posts.mjs
// (an npm `prebuild` step) before Docusaurus builds, so slugs and content are
// known at plugin-load time and can be registered as real static routes —
// no client-side Supabase fetch on the public blog pages.
module.exports = function () {
  return {
    name: 'blog-routes',

    getPathsToWatch() {
      return [path.resolve(__dirname, '../../blog-content/**')];
    },

    async loadContent() {
      const contentDir = path.resolve(__dirname, '../../blog-content');
      if (!fs.existsSync(contentDir)) return [];

      const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'));
      const posts = files.map((file) => {
        const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8');
        const { data, content } = matter(raw);
        return {
          slug: data.slug,
          title: data.title,
          description: data.description,
          date: data.date ?? null,
          tags: data.tags ?? [],
          coverImageUrl: data.coverImageUrl ?? null,
          content,
        };
      });

      posts.sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));
      return posts;
    },

    async contentLoaded({ content: posts, actions }) {
      const { addRoute, createData } = actions;

      const listingDataPath = await createData(
        'blog-listing.json',
        JSON.stringify(
          posts.map(({ slug, title, description, date, coverImageUrl }) => ({
            slug,
            title,
            description,
            date,
            coverImageUrl,
          })),
        ),
      );
      addRoute({
        path: '/blog',
        exact: true,
        component: '@site/src/components/BlogIndexPage/index.tsx',
        modules: { posts: listingDataPath },
      });

      for (const post of posts) {
        const postDataPath = await createData(`blog-post-${post.slug}.json`, JSON.stringify(post));
        addRoute({
          path: `/blog/${post.slug}`,
          exact: true,
          component: '@site/src/components/BlogPostPage/index.tsx',
          modules: { post: postDataPath },
        });
      }
    },
  };
};
