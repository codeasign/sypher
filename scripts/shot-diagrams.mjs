#!/usr/bin/env node
// Screenshots one or more rendered diagram SVGs on the dark board backdrop
// so theme/contrast can be verified visually. Usage:
//   node scripts/shot-diagrams.mjs <hash> [moreHashes...]
import puppeteer from 'puppeteer';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const hashes = process.argv.slice(2);
if (!hashes.length) {
  console.error('Usage: node scripts/shot-diagrams.mjs <hash> [more...]');
  process.exit(1);
}

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900 });

for (const hash of hashes) {
  const viewer = pathToFileURL(path.join(REPO_ROOT, '.cache', 'diagram-viewer.html')).href;
  const src = encodeURIComponent(`../apps/docs/static/img/diagrams/${hash}.svg`);
  await page.goto(`${viewer}?src=${src}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => new Promise((res) => {
    const img = document.getElementById('img');
    if (img.complete) return res();
    img.onload = img.onerror = res;
  }));
  const out = path.join(REPO_ROOT, '.cache', `shot-${hash}.png`);
  await page.screenshot({ path: out, fullPage: true });
  console.log('shot', out);
}
await browser.close();
