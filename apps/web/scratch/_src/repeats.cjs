const fs = require('fs');
const slugs = ['critical-thinking', 'problem-solving', 'decision-making', 'memory-techniques', 'time-management'];
const grams = new Map();
let total = 0;
for (const s of slugs) {
  const t = fs.readFileSync(__dirname + '/' + s + '.txt', 'utf8').toLowerCase().replace(/[^a-z' \n]/g, ' ');
  for (const line of t.split('\n')) {
    const w = line.split(/\s+/).filter(Boolean);
    for (let n = 5; n <= 6; n++) for (let i = 0; i + n <= w.length; i++) { const g = w.slice(i, i + n).join(' '); grams.set(g, (grams.get(g) || 0) + 1); }
    total += w.length;
  }
}
const rows = [...grams.entries()].filter(([g, c]) => c >= 5).sort((a, b) => b[1] - a[1]);
console.log('words', total);
const seen = [];
for (const [g, c] of rows) { if (seen.some((x) => x.includes(g) || g.includes(x))) continue; seen.push(g); console.log(c, g); if (seen.length >= 40) break; }
