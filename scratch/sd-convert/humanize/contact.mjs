import fs from 'node:fs'; import { createRequire } from 'node:module'; const puppeteer = createRequire('D:/jenny/sypher/package.json')('puppeteer');
const map = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const sum = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const keys = process.argv.slice(5); const out = process.argv[4];
const byId = new Map(map.map(m => [m.id, m.hash])); const cells = [];
for (const k of keys) { const s = sum.find(x => x.key.includes(k)); const h = byId.get(s.id); const svg = fs.readFileSync(`D:/jenny/sypher/apps/docs/static/img/diagrams/${h}.svg`).toString('base64'); const m = fs.readFileSync(`D:/jenny/sypher/apps/docs/static/img/diagrams/${h}.svg`, 'utf8').match(/viewBox="[-0-9.]+ [-0-9.]+ ([0-9.]+) ([0-9.]+)"/); cells.push(`<div style="width:900px"><div style="font:14px system-ui;color:#9fb3c8;margin:6px 0">${k} · ${Math.round(m[1])}×${Math.round(m[2])}</div><img style="width:900px;border:1px solid #33465C" src="data:image/svg+xml;base64,${svg}"></div>`); }
const b = await puppeteer.launch({ args: ['--no-sandbox'] }); const p = await b.newPage(); await p.setViewport({ width: 1860, height: 600, deviceScaleFactor: 1 });
await p.setContent(`<body style="margin:0;background:#0B0F14"><div id="f" style="display:flex;flex-wrap:wrap;gap:20px;padding:16px;width:1860px;background:#0B0F14">${cells.join('')}</div></body>`);
await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
await (await p.$('#f')).screenshot({ path: out }); await b.close(); console.log('ok');
