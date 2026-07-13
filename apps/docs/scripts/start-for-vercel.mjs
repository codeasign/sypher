// Dev server entrypoint used by `vercel dev` (see vercel.json's devCommand).
// vercel dev's own proxy binds port 3000 and forwards non-api requests to
// whatever port this process listens on (via $PORT) — so this must NOT
// hardcode 3000 or fight vercel dev's kill-port step for it.
import { spawn } from 'node:child_process';

const port = process.env.PORT || '3001';

const blog = spawn('node', ['scripts/watch-blog-posts.mjs'], { stdio: 'inherit', shell: true });
const docusaurus = spawn(
  'npx',
  ['docusaurus', 'start', '--port', port],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=16384' },
  }
);

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  blog.kill();
  docusaurus.kill();
  process.exit(code ?? 0);
}

blog.on('exit', () => shutdown());
docusaurus.on('exit', (code) => shutdown(code));
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
