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
 * Walk sidebar JSON and build a map: docId → sectionIndex (0-based),
 * plus the ordered list of top-level category labels (one per section).
 */
function buildSectionMap(sidebarItems) {
  const map = {};
  const labels = [];
  let sectionIndex = 0;
  for (const item of sidebarItems) {
    if (item.type === 'category' && Array.isArray(item.items)) {
      const ids = collectDocIds(item.items);
      for (const id of ids) {
        map[id] = sectionIndex;
      }
      labels.push(item.label || `Section ${sectionIndex + 1}`);
      sectionIndex++;
    }
  }
  return { map, labels };
}

module.exports = function () {
  return {
    name: 'course-sections',

    loadContent() {
      const sidebarsDir = path.resolve(__dirname, '../../sidebars');
      const courseRegex = /^([\w-]+)\.json$/;
      const courseSectionMap = {};
      const courseSectionLabels = {};

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
              const { map, labels } = buildSectionMap(sidebarItems);
              courseSectionMap[courseSlug] = map;
              courseSectionLabels[courseSlug] = labels;
            }
          } catch (err) {
            console.warn(`[course-sections] Could not parse ${file}:`, err.message);
          }
        }
      }

      return { courseSectionMap, courseSectionLabels };
    },

    contentLoaded({ content, actions }) {
      const { setGlobalData } = actions;
      setGlobalData(content);
    },
  };
};
