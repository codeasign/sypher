const path = require('path');
const fs = require('fs');

/**
 * Forces every course's lesson modules into their own predictably-named
 * webpack/rspack chunk (course-<slug>.<hash>.js) instead of Docusaurus's
 * default globally-shared content-hash chunk naming. Without this, a
 * premium course's compiled content is indistinguishable from any other
 * chunk on disk, and can't be gated by URL pattern at the edge — see
 * apps/docs/middleware.ts.
 *
 * Runs uniformly across every folder under docs/ (not a hardcoded slug
 * list), so a brand-new course automatically gets its own isolated,
 * gateable chunk the moment its docs folder exists.
 */
module.exports = function courseChunkIsolationPlugin() {
  return {
    name: 'course-chunk-isolation',

    configureWebpack(config, isServer) {
      if (isServer) return {};

      const docsDir = path.resolve(__dirname, '../../docs');
      let courseSlugs = [];
      if (fs.existsSync(docsDir)) {
        courseSlugs = fs
          .readdirSync(docsDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      }

      if (courseSlugs.length === 0) return {};

      const cacheGroups = {};
      for (const slug of courseSlugs) {
        const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cacheGroups[`course-${slug}`] = {
          test: new RegExp(`[\\\\/]docs[\\\\/]${escaped}[\\\\/]`),
          name: `course-${slug}`,
          chunks: 'all',
          enforce: true,
        };
      }

      return {
        mergeStrategy: { 'optimization.splitChunks.cacheGroups': 'merge' },
        optimization: {
          splitChunks: {
            cacheGroups,
          },
        },
      };
    },
  };
};
