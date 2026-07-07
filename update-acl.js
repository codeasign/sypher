/**
 * Update access-control.json from .env — no rebuild needed.
 * Run after changing FREE_COURSES in .env:
 *   node update-acl.js
 */
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const staticDir = path.resolve(__dirname, 'static');
const outPath = path.join(staticDir, 'access-control.json');

// Read FREE_COURSES from .env
let freeCourses = 'python-for-ai-engineers,coding-bootcamp';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/^FREE_COURSES=(.+)$/m);
  if (match) {
    freeCourses = match[1].trim();
  }
}

const config = {
  freeCourses: freeCourses.split(',').map(s => s.trim()),
  freeSections: 3,
};

if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(config, null, 2), 'utf-8');
console.log(`✓ Updated ${outPath}`);
console.log(`  FREE_COURSES: ${config.freeCourses.join(', ')}`);