const path = require('path');
const fs = require('fs');

/**
 * Recursively walk sidebar items and collect all doc IDs.
 */
function collectDocIds(items) {
  const ids = [];
  for (const item of items) {
    if (typeof item === 'string') {
      ids.push(item);
    } else if (item.type === 'category' && Array.isArray(item.items)) {
      ids.push(...collectDocIds(item.items));
    } else if (item.type === 'doc' && item.id) {
      ids.push(item.id);
    }
  }
  return ids;
}

/**
 * Walk sidebar JSON and build a map: docId → sectionIndex (0-based).
 */
function buildSectionMap(sidebarItems) {
  const map = {};
  let sectionIndex = 0;
  for (const item of sidebarItems) {
    if (item.type === 'category' && Array.isArray(item.items)) {
      const ids = collectDocIds(item.items);
      for (const id of ids) {
        map[id] = sectionIndex;
      }
      sectionIndex++;
    }
  }
  return map;
}

module.exports = function () {
  return {
    name: 'access-control',

    loadContent() {
      const sidebarsDir = path.resolve(__dirname, '../../sidebars');
      const staticDir = path.resolve(__dirname, '../../static');
      const courseRegex = /^([\w-]+)\.json$/;
      const courseSectionMap = {};

      if (fs.existsSync(sidebarsDir)) {
        const files = fs.readdirSync(sidebarsDir);
        for (const file of files) {
          const match = file.match(courseRegex);
          if (!match) continue;
          const courseSlug = match[1];
          const filePath = path.join(sidebarsDir, file);
          try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const keys = Object.keys(content);
            if (keys.length === 0) continue;
            const sidebarItems = content[keys[0]];
            if (Array.isArray(sidebarItems)) {
              courseSectionMap[courseSlug] = buildSectionMap(sidebarItems);
            }
          } catch (err) {
            console.warn(`[access-control] Could not parse ${file}:`, err.message);
          }
        }
      }

      // Write runtime config to static/access-control.json
      // This file can be updated independently (no rebuild needed)
      const freeCoursesFromEnv = (process.env.FREE_COURSES ?? 'python-for-ai-engineers,coding-bootcamp')
        .split(',').map(s => s.trim());

      // When FREE_ALL_COURSES is true, override with ALL course slugs
      const freeCourses = process.env.FREE_ALL_COURSES === 'true'
        ? Object.keys(courseSectionMap)
        : freeCoursesFromEnv;

      const runtimeConfig = {
        freeCourses,
        freeSections: 3,
      };

      if (!fs.existsSync(staticDir)) {
        fs.mkdirSync(staticDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(staticDir, 'access-control.json'),
        JSON.stringify(runtimeConfig, null, 2),
        'utf-8',
      );

      return { courseSectionMap };
    },

    contentLoaded({ content, actions }) {
      const { setGlobalData } = actions;
      setGlobalData(content);
    },

    getClientModules() {
      return [path.resolve(__dirname, 'client')];
    },
  };
};