// customFields.apiBaseUrl comes from useDocusaurusContext().siteConfig.customFields
// — empty string means same-origin relative fetch (production and local
// `vercel dev` both serve /api/* from the same origin as the site).
export async function fetchTaxonomy(apiBaseUrl = '') {
  const response = await fetch(`${apiBaseUrl}/api/taxonomy`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? 'Failed to load taxonomy: server did not return JSON'
        : `Failed to load taxonomy (HTTP ${response.status})`
    );
  }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load taxonomy');
  }
  return data;
}

// payload: { domain: { name }, roles: [{ name, seniorityLevels }],
//            skills: [{ name }], technologies: [{ name, categoryId?, categoryName? }] }
export async function saveTaxonomyCategory(supabase, payload) {
  if (!supabase) return { error: 'Not authenticated', data: null };
  const { data, error } = await supabase.rpc('admin_save_taxonomy_category', { payload });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save taxonomy category:', error.message);
    return { error: error.message, data: null };
  }
  return { error: null, data };
}
