// Defensive no-op unless CORS_ALLOWED_ORIGIN is explicitly set — nothing in
// this project's local dev or production setup sets it (vercel dev serves
// the site and /api/* from the same origin), so this only exists as a
// documented escape hatch for a future cross-origin workflow.
export function applyCors(req, res) {
  const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN;
  if (!allowedOrigin) return false;

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
