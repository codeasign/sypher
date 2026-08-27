import {
  BUNNY, API, ROOT, execFileSync, fs, path,
  courseChoosingMetrics, courseActivation, courseRetention, courseConversion, courseMisleadingMetrics,
} from './scratch-run-metrics-batch-pm.mjs';

async function uploadToBunny(filePath, pathPrefix) {
  const filename = path.basename(filePath);
  const buf = fs.readFileSync(filePath);
  const uploadPath = `${pathPrefix}/${filename}`;
  const res = await fetch(`https://${BUNNY.hostname}/${BUNNY.zone}/${uploadPath}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY.accessKey, 'Content-Type': 'image/svg+xml' },
    body: buf,
  });
  if (!res.ok) throw new Error(`Bunny upload failed for ${filename}: ${res.status} ${res.statusText}`);
  return `${BUNNY.pullZoneUrl.replace(/\/$/, '')}/${uploadPath}`;
}

async function buildCourse(course) {
  const dir = path.join(ROOT, 'scratch', course.slug);
  const imgDir = path.join(dir, 'images');
  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'dataset-notes.md'), course.datasetNotes, 'utf-8');

  const urls = [];
  for (const chart of course.charts) {
    const filePath = path.join(imgDir, chart.file);
    fs.writeFileSync(filePath, chart.svg, 'utf-8');
    const url = await uploadToBunny(filePath, `svgs/${course.slug}`);
    urls.push(url);
    console.log(`  [chart] ${chart.file} -> ${url}`);
  }

  course.modules.forEach((m, idx) => {
    let body = m.body;
    urls.forEach((url, ci) => { body = body.split(`__CHART_${ci}__`).join(url); });
    if (body.includes('__CHART_')) throw new Error(`${course.slug} module ${idx + 1} still has an unlinked chart placeholder`);
    const fileName = `${String(m.order).padStart(2, '0')}-${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)}.mdx`;
    const frontmatter = `---\ntitle: "${m.title.replace(/"/g, '\\"')}"\norder: ${m.order}\n---\n\n`;
    fs.writeFileSync(path.join(dir, fileName), frontmatter + body, 'utf-8');
  });
  console.log(`  [staged] ${course.modules.length} modules in scratch/${course.slug}/`);

  const args = [
    'scripts/import-authored-course.mjs',
    '--api', API,
    '--course', course.slug,
    '--name', course.name,
    '--description', course.description,
    '--input', `scratch/${course.slug}`,
    '--category', 'Presentation',
    '--role', course.role,
    '--roles', 'FREE_USER,PAID_USER',
    // draft only, never --publish in a batch run
  ];
  const out = execFileSync('node', args, { cwd: ROOT, encoding: 'utf-8' });
  console.log(out);

  return { slug: course.slug, modules: course.modules.length, charts: course.charts.length };
}

async function main() {
  const courses = [courseChoosingMetrics(), courseActivation(), courseRetention(), courseConversion(), courseMisleadingMetrics()];
  const results = [];
  for (const course of courses) {
    console.log(`\n=== ${course.slug} ===`);
    try {
      const r = await buildCourse(course);
      results.push({ ...r, status: 'ok' });
    } catch (err) {
      console.error(`FAILED: ${course.slug}: ${err.message}`);
      results.push({ slug: course.slug, status: 'failed', error: err.message });
      break;
    }
  }
  console.log('\n=== SUMMARY ===');
  results.forEach((r) => console.log(JSON.stringify(r)));
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
