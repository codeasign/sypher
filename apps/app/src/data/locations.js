// In-memory only — reset on full page reload. Avoids re-hitting /api/locations
// (and therefore Supabase) on every LocationsTab mount within a session; the
// one place data can actually go stale (a save) explicitly invalidates it.
let cachedData = null;
let inFlightRequest = null;

export function invalidateLocationsCache() {
  cachedData = null;
  inFlightRequest = null;
}

// customFields.apiBaseUrl comes from useDocusaurusContext().siteConfig.customFields
// — empty string means same-origin relative fetch (production and local
// `vercel dev` both serve /api/* from the same origin as the site).
export async function fetchLocations(apiBaseUrl = '', { forceRefresh = false } = {}) {
  if (!forceRefresh && cachedData) return cachedData;
  if (!forceRefresh && inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    const response = await fetch(`${apiBaseUrl}/api/locations`);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        response.ok
          ? 'Failed to load locations: server did not return JSON'
          : `Failed to load locations (HTTP ${response.status})`
      );
    }
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load locations');
    }
    return data;
  })();

  try {
    cachedData = await inFlightRequest;
    return cachedData;
  } catch (err) {
    cachedData = null;
    throw err;
  } finally {
    inFlightRequest = null;
  }
}

// payload: { state: { name }, locations: [{ name }] }
export async function saveLocationState(supabase, payload) {
  if (!supabase) return { error: 'Not authenticated', data: null };
  const { data, error } = await supabase.rpc('admin_save_location_state', { payload });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save location state:', error.message);
    return { error: error.message, data: null };
  }
  return { error: null, data };
}
