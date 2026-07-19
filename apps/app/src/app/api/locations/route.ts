import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getSupabaseAnon } from '@/lib/supabaseAdmin';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const dynamic = 'force-dynamic';

// Module-level — survives warm invocations of this lambda instance.
// Keyed by locations_meta.version, never by wall-clock time.
let cache: { version: string | null; data: Record<string, unknown> | null } = { version: null, data: null };

async function fetchAssembledLocations(supabase: ReturnType<typeof getSupabaseAnon>) {
  const [states, locations] = await Promise.all([
    fetchAllRows(supabase.from('states').select('id, name, slug')),
    fetchAllRows(supabase.from('locations').select('id, name, slug, state_id')),
  ]);

  const assembledStates = states.map((state) => ({
    id: state.id,
    name: state.name,
    slug: state.slug,
    locationIds: locations.filter((l) => l.state_id === state.id).map((l) => l.id),
  }));

  return {
    states: assembledStates,
    locations: locations.map((l) => ({ id: l.id, name: l.name, slug: l.slug, stateId: l.state_id })),
  };
}

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET() {
  const corsHeaders = getCorsHeaders() ?? undefined;
  const supabase = getSupabaseAnon();

  // Always a live query, never itself cached or skipped — this is the only
  // thing that can never be memoized, because skipping it is exactly how
  // cache invalidation would silently break on a warm lambda instance.
  const { data: metaRow, error: metaError } = await supabase
    .from('locations_meta')
    .select('version')
    .eq('id', 1)
    .single();

  if (metaError) {
    return Response.json({ error: 'Failed to read locations version' }, { status: 500, headers: corsHeaders });
  }

  const version = metaRow.version;

  if (cache.version !== version || !cache.data) {
    try {
      cache = { version, data: await fetchAssembledLocations(supabase) };
    } catch {
      return Response.json({ error: 'Failed to load locations' }, { status: 500, headers: corsHeaders });
    }
  }

  return Response.json(
    { version, ...cache.data },
    { status: 200, headers: { ...corsHeaders, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } }
  );
}
