// usage: node view.mjs out.png <mmd-basename-substr|path> ...   -> contact sheet PNG of the SVG rendered for each mmd's current content hash
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { createRequire } from 'node:module'; const puppeteer = createRequire('D:/jenny/sypher/package.json')('puppeteer');
const [out, ...keys] = process.argv.slice(2);
const dir = 'D:/jenny/sypher/.cache/ascii-to-mermaid/';
const W = Number(process.env.W || 900);
const cells = [];
for (const k of keys) {
  const f = k.endsWith('.mmd') ? k : dir + (k.startsWith('system-design-fundamentals-') ? k : 'system-design-fundamentals-' + k) + '.mmd';
  const code = fs.readFileSync(f, 'utf8'); const h = crypto.createHash('sha256').update(code).digest('hex').slice(0, 12);
  const sp = `D:/jenny/sypher/apps/docs/static/img/diagrams/${h}.svg`;
  if (!fs.existsSync(sp)) { cells.push(`<div style="color:#f88;font:14px system-ui">${k}: no svg for hash ${h}</div>`); continue; }
  const svg = fs.readFileSync(sp); const m = svg.toString('utf8').match(/viewBox="[-0-9.]+ [-0-9.]+ ([0-9.]+) ([0-9.]+)"/);
  cells.push(`<div style="width:${W}px"><div style="font:14px system-ui;color:#9fb3c8;margin:6px 0">${path.basename(f).replace('system-design-fundamentals-','').replace('.mmd','')} · ${Math.round(m[1])}×${Math.round(m[2])} r=${(m[1]/m[2]).toFixed(2)}</div><img style="width:${W}px;border:1px solid #33465C" src="data:image/svg+xml;base64,${svg.toString('base64')}"></div>`);
}
const cols = Number(process.env.COLS || 2);
const b = await puppeteer.launch({ args: ['--no-sandbox'] }); const p = await b.newPage(); await p.setViewport({ width: cols * (W + 20) + 20, height: 600, deviceScaleFactor: 1 });
await p.setContent(`<body style="margin:0;background:#0B0F14"><div id="f" style="display:flex;flex-wrap:wrap;gap:20px;padding:16px;width:${cols * (W + 20)}px;background:#0B0F14">${cells.join('')}</div></body>`);
await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
await (await p.$('#f')).screenshot({ path: out }); await b.close(); console.log('ok', out);
