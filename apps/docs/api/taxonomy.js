import { applyCors } from './_lib/cors.js';
import { getSupabaseAnon } from './_lib/supabaseAdmin.js';

// Module-level — survives warm invocations of this lambda instance.
// Keyed by taxonomy_meta.version, never by wall-clock time.
let cache = { version: null, data: null };

async function fetchAssembledTaxonomy(supabase) {
  const [domains, roles, skills, technologies, technologyCategories, domainRoles, domainSkills, domainTechnologies] =
    await Promise.all([
      supabase.from('domains').select('id, name, slug'),
      supabase.from('base_roles').select('id, name, slug, seniority_levels'),
      supabase.from('skills').select('id, name, slug'),
      supabase.from('technologies').select('id, name, slug, technology_category_id'),
      supabase.from('technology_categories').select('id, name, slug'),
      supabase.from('domain_roles').select('domain_id, role_id'),
      supabase.from('domain_skills').select('domain_id, skill_id'),
      supabase.from('domain_technologies').select('domain_id, technology_id'),
    ]);

  for (const result of [domains, roles, skills, technologies, technologyCategories, domainRoles, domainSkills, domainTechnologies]) {
    if (result.error) throw result.error;
  }

  const assembledDomains = (domains.data ?? []).map((domain) => ({
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    roleIds: (domainRoles.data ?? []).filter((r) => r.domain_id === domain.id).map((r) => r.role_id),
    skillIds: (domainSkills.data ?? []).filter((s) => s.domain_id === domain.id).map((s) => s.skill_id),
    technologyIds: (domainTechnologies.data ?? []).filter((t) => t.domain_id === domain.id).map((t) => t.technology_id),
  }));

  return {
    domains: assembledDomains,
    roles: (roles.data ?? []).map((r) => ({ id: r.id, name: r.name, slug: r.slug, seniorityLevels: r.seniority_levels ?? [] })),
    skills: (skills.data ?? []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    technologies: (technologies.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      categoryId: t.technology_category_id,
    })),
    technologyCategories: (technologyCategories.data ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getSupabaseAnon();

  // Always a live query, never itself cached or skipped — this is the only
  // thing that can never be memoized, because skipping it is exactly how
  // cache invalidation would silently break on a warm lambda instance.
  const { data: metaRow, error: metaError } = await supabase
    .from('taxonomy_meta')
    .select('version')
    .eq('id', 1)
    .single();

  if (metaError) {
    res.status(500).json({ error: 'Failed to read taxonomy version' });
    return;
  }

  const version = metaRow.version;

  if (cache.version !== version || !cache.data) {
    try {
      cache = { version, data: await fetchAssembledTaxonomy(supabase) };
    } catch (err) {
      res.status(500).json({ error: 'Failed to load taxonomy' });
      return;
    }
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).json({ version, ...cache.data });
}
