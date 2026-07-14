// Defensive no-op unless CORS_ALLOWED_ORIGIN is explicitly set — nothing in
// this project's local dev or production setup sets it (the app and /api/*
// are served from the same origin), so this only exists as a documented
// escape hatch for a future cross-origin workflow.
export function getCorsHeaders(): Record<string, string> | null {
  const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN;
  if (!allowedOrigin) return null;

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Mirrors the original applyCors()'s OPTIONS branch: 204 + CORS headers when
// CORS_ALLOWED_ORIGIN is set, otherwise the same 405 the handler itself would
// have produced for a non-GET/POST method.
export function handleCorsPreflight(): Response {
  const headers = getCorsHeaders();
  if (!headers) {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return new Response(null, { status: 204, headers });
}
