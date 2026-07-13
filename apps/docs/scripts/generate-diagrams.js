#!/usr/bin/env node
/**
 * Scans docs/**\/*.mdx for <AsciiDiagram> components, generates images via
 * FLUX (RunPod) or OpenAI DALL-E 3, saves to static/img/diagrams/<id>.png.
 *
 * Usage:
 *   node scripts/generate-diagrams.js                     all, FLUX
 *   node scripts/generate-diagrams.js --provider openai   DALL-E 3
 *   node scripts/generate-diagrams.js --id slug/page      one diagram
 *   node scripts/generate-diagrams.js --dry-run           preview only
 *   node scripts/generate-diagrams.js --force             regenerate all
 *
 * Env vars (in .env):
 *   RUNPOD_API_KEY + RUNPOD_ENDPOINT_ID   (flux)
 *   OPENAI_API_KEY                         (openai)
 */

import fs   from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const DOCS_DIR   = path.join(ROOT, 'docs');
const OUT_DIR    = path.join(ROOT, 'static', 'img', 'diagrams');

// Load .env manually (no dotenv dependency needed)
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith('#') || !l.includes('=')) continue;
    const [k, ...v] = l.split('=');
    process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

const args     = process.argv.slice(2);
const get      = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
const has      = (f) => args.includes(f);
const PROVIDER = get('--provider') || 'flux';
const TARGET   = get('--id');
const DRY_RUN  = has('--dry-run');
const FORCE    = has('--force');

const log  = (m) => console.log(`[diagrams] ${m}`);
const warn = (m) => console.warn(`[diagrams] WARN  ${m}`);
const err  = (m) => console.error(`[diagrams] ERROR ${m}`);

function findMdx(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findMdx(full));
    else if (e.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function extractDiagrams(src, file) {
  const results = [];
  const RE = /<AsciiDiagram([\s\S]*?)(?:\/>|<\/AsciiDiagram>)/g;
  let m;
  while ((m = RE.exec(src)) !== null) {
    const inner = m[1];
    const idM   = inner.match(/\bid=["']([^"']+)["']/);
    if (!idM) { warn(`<AsciiDiagram> in ${file} missing id — skipping`); continue; }
    const altM     = inner.match(/\balt=["']([^"']+)["']/);
    const capM     = inner.match(/\bcaption=["']([^"']+)["']/);
    const contentM = inner.match(/\bcontent=\{`([\s\S]*?)`\}/);
    if (!contentM) { warn(`id="${idM[1]}" missing content prop — skipping`); continue; }
    results.push({id: idM[1], alt: altM?.[1] ?? idM[1], caption: capM?.[1] ?? '', content: contentM[1].trim(), file});
  }
  return results;
}

function buildPrompt(d) {
  return [
    'Create a clean professional technical architecture diagram.',
    'White background. Clear labeled boxes and arrows. Modern flat design. No decorative elements.',
    `The diagram represents: ${d.alt}.`,
    d.caption ? `Caption context: ${d.caption}.` : '',
    'Layout reference (ASCII — reproduce as a clean diagram):',
    d.content,
  ].filter(Boolean).join('\n');
}

async function generateFlux(prompt) {
  const key = process.env.RUNPOD_API_KEY;
  const ep  = process.env.RUNPOD_ENDPOINT_ID;
  if (!key || !ep) throw new Error('RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID must be set in .env');
  const res = await fetch(`https://api.runpod.ai/v2/${ep}/runsync`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`},
    body: JSON.stringify({input: {prompt, num_inference_steps: 28, guidance_scale: 3.5, width: 1024, height: 768, output_format: 'png'}}),
  });
  if (!res.ok) throw new Error(`RunPod ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const out  = data.output;
  if (Array.isArray(out) && out.length > 0)
    return Buffer.from(out[0].replace(/^data:image\/\w+;base64,/, ''), 'base64');
  if (typeof out === 'string' && out.startsWith('http'))
    return Buffer.from(await (await fetch(out)).arrayBuffer());
  throw new Error(`Unexpected RunPod output: ${JSON.stringify(out).slice(0, 200)}`);
}

async function generateOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY must be set in .env');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`},
    body: JSON.stringify({model: 'dall-e-3', prompt, n: 1, size: '1792x1024', response_format: 'b64_json', quality: 'standard'}),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const b64 = (await res.json()).data?.[0]?.b64_json;
  if (!b64) throw new Error('No b64_json in OpenAI response');
  return Buffer.from(b64, 'base64');
}

async function main() {
  log(`Provider: ${PROVIDER} | Dry run: ${DRY_RUN} | Force: ${FORCE}`);
  if (!fs.existsSync(DOCS_DIR)) { log('docs/ folder not found. Add a topic first.'); return; }
  const all   = findMdx(DOCS_DIR).flatMap((f) => extractDiagrams(fs.readFileSync(f, 'utf8'), f));
  const queue = TARGET ? all.filter((d) => d.id === TARGET) : all;
  if (TARGET && queue.length === 0) { err(`No diagram with id "${TARGET}"`); process.exit(1); }
  log(`Found ${all.length} diagram(s). Processing ${queue.length}.`);

  let generated = 0, skipped = 0, failed = 0;

  for (const d of queue) {
    const outPath = path.join(OUT_DIR, `${d.id}.png`);
    const outDir  = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive: true});
    if (!FORCE && fs.existsSync(outPath)) { log(`SKIP  ${d.id}`); skipped++; continue; }
    if (DRY_RUN) { log(`DRY   ${d.id}  →  ${path.relative(ROOT, outPath)}\n      Alt: ${d.alt}`); continue; }
    log(`GEN   ${d.id}  [${PROVIDER}] ...`);
    try {
      const buf = PROVIDER === 'openai' ? await generateOpenAI(buildPrompt(d)) : await generateFlux(buildPrompt(d));
      fs.writeFileSync(outPath, buf);
      log(`OK    ${d.id}`);
      generated++;
    } catch (e) {
      err(`FAIL  ${d.id}: ${e.message}`);
      failed++;
    }
  }

  log(`\nDone. Generated: ${generated}  Skipped: ${skipped}  Failed: ${failed}`);
  if (generated > 0) log('Set "diagramImages": true in features.json then restart npm start');
  if (failed > 0) process.exit(1);
}

main().catch((e) => { err(e.message); process.exit(1); });
