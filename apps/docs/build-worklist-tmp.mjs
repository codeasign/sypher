import fs from 'fs';

const course = process.argv[2];
const SCRATCH = 'C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/db710297-dc1a-4417-a937-5ebc8c5f54a2/scratchpad';
const manifest = JSON.parse(fs.readFileSync(`diagram-manifests/${course}.json`, 'utf8'));
const classify = JSON.parse(fs.readFileSync(`${SCRATCH}/classify-${course}.json`, 'utf8'));

const classifyById = new Map(classify.map((c) => [c.id, c]));
const pending = manifest.diagrams.filter((d) => !d.converted);

const grouped = {};
for (const d of pending) {
  const c = classifyById.get(d.id);
  const relFile = d.file.replace(`apps/docs/docs/${course}/`, '');
  const topicFolder = relFile.split('/')[0];
  if (!grouped[topicFolder]) grouped[topicFolder] = [];
  const idxInFile = grouped[topicFolder]
    ? grouped[topicFolder].filter((x) => x.file === relFile).length + 1
    : 1;
  const mmdSlug = `${course}-${relFile.replace(/\.mdx?$/, '').replace(/\//g, '-')}-${idxInFile}`;
  grouped[topicFolder].push({
    id: d.id,
    file: relFile,
    diagramIndex: idxInFile,
    mmdPath: `.cache/ascii-to-mermaid/${mmdSlug}.mmd`,
    recommendedType: c ? c.recommendedType : 'flowchart',
    confidence: c ? c.confidence : 'unknown',
    reason: c ? c.reason : '',
  });
}

fs.writeFileSync(`${SCRATCH}/worklist-${course}.json`, JSON.stringify(grouped, null, 2));
console.log('topics:', Object.keys(grouped).length, 'total pending:', pending.length);
for (const [k, v] of Object.entries(grouped)) {
  console.log(`  ${k}: ${v.length}`);
}
