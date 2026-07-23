const fs = require('fs');
const path = require('path');

function walk(dir, base) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full, base));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      let rel = path.relative(base, full).split(path.sep).join('/').replace(/\.(md|mdx)$/, '');
      results.push(rel);
    }
  }
  return results;
}

const courseMap = {
  'agentic-ai-fundamentals.json': 'agentic-ai-fundamentals',
  'ai-engineering-hands-on.json': 'ai-engineering-hands-on',
  'build-with-ai.json': 'build-with-ai',
  'coding-bootcamp.json': 'coding-bootcamp',
  'git-github-actions.json': 'git-github-actions',
  'python-for-ai-engineers.json': 'python-for-ai-engineers',
  'search-algorithms.json': 'search-algorithms',
  'software-engineering.json': 'software-engineering',
  'sorting-algorithms.json': 'sorting-algorithms',
  'system-design-fundamentals.json': 'system-design-fundamentals',
};

const docsBase = path.resolve('docs');

for (const [jsonFile, courseDir] of Object.entries(courseMap)) {
  const idsFile = '/tmp/ids_' + jsonFile.replace('.json', '') + '.txt';
  const ids = fs.readFileSync(idsFile, 'utf8').split('\n').filter(Boolean);
  const idSet = new Set(ids);
  const fullDir = path.join(docsBase, courseDir);
  if (!fs.existsSync(fullDir)) {
    console.log(courseDir + ': MISSING DIR');
    continue;
  }
  const files = walk(fullDir, docsBase);
  const fileSet = new Set(files);

  const missingFiles = ids.filter((id) => !fileSet.has(id));
  const orphanFiles = files.filter((f) => !idSet.has(f));

  console.log('=== ' + courseDir + ' ===');
  console.log('  total ids: ' + ids.length + ', total files: ' + files.length);
  console.log('  ids with NO matching file (' + missingFiles.length + '): ' + JSON.stringify(missingFiles));
  console.log('  files with NO sidebar id (' + orphanFiles.length + '): ' + JSON.stringify(orphanFiles));
}
