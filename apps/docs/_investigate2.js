const fs = require('fs');
const path = require('path');

function walk(dir, base) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full, base));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function getFrontmatterId(fileFull) {
  const content = fs.readFileSync(fileFull, 'utf8');
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const idMatch = fm.match(/^id:\s*(.+)$/m);
  if (!idMatch) return null;
  return idMatch[1].trim().replace(/^['"]|['"]$/g, '');
}

function computeDocId(fileFull, base) {
  const relDir = path.relative(base, path.dirname(fileFull)).split(path.sep).join('/');
  const baseName = path.basename(fileFull).replace(/\.(md|mdx)$/, '');
  const fmId = getFrontmatterId(fileFull);
  if (fmId) {
    // front matter id is relative to the file's directory
    return relDir ? relDir + '/' + fmId : fmId;
  }
  if (baseName === 'index') {
    return relDir; // folder becomes the id (could be '' for root, unlikely here)
  }
  return relDir ? relDir + '/' + baseName : baseName;
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
  const fileFulls = walk(fullDir, docsBase);
  const computedIds = fileFulls.map((f) => computeDocId(f, docsBase));
  const fileMap = new Map(); // computedId -> fileFull
  computedIds.forEach((id, i) => fileMap.set(id, fileFulls[i]));

  const missingFiles = ids.filter((id) => !fileMap.has(id));
  const idsUsed = new Set(ids);
  const orphanFiles = [];
  for (const [id, fileFull] of fileMap.entries()) {
    if (!idsUsed.has(id)) orphanFiles.push(id + '  <-  ' + path.relative(docsBase, fileFull));
  }

  console.log('=== ' + courseDir + ' ===');
  console.log('  total ids: ' + ids.length + ', total files: ' + fileFulls.length);
  console.log('  ids with NO matching file (' + missingFiles.length + '):');
  missingFiles.forEach((m) => console.log('    ' + m));
  console.log('  files with NO sidebar id (' + orphanFiles.length + '):');
  orphanFiles.forEach((m) => console.log('    ' + m));

  // duplicate computed ids (two files mapping to same id) -- sanity check
  const seen = {};
  computedIds.forEach((id, i) => {
    seen[id] = seen[id] || [];
    seen[id].push(fileFulls[i]);
  });
  for (const [id, arr] of Object.entries(seen)) {
    if (arr.length > 1) {
      console.log('  DUPLICATE COMPUTED ID: ' + id + ' -> ' + arr.map((a) => path.relative(docsBase, a)).join(', '));
    }
  }
}
