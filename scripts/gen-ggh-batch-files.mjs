import fs from 'node:fs';

const batches = JSON.parse(fs.readFileSync('scripts/ggh-resume-batches.json', 'utf8'));
batches.forEach((b, i) => {
  const lines = [];
  for (const fg of b.files) {
    for (const item of fg.items) {
      const filePosix = item.file.split('\\').join('/');
      let line = `- ${item.kind.toUpperCase()}: file=${filePosix}, diagram #${item.index} (source order), slug=${item.slug}`;
      if (item.kind === 'failing') line += ` (currently w=${item.w} h=${item.h} ratio=${item.ratio})`;
      lines.push(line);
    }
  }
  fs.writeFileSync(`scripts/ggh-batch-${i + 1}.txt`, lines.join('\n'));
});
console.log('wrote batch files');
