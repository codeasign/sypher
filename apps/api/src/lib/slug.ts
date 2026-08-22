export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Ported from apps/app's cohorts.js/blogPosts.js findAvailableSlug. */
export async function findAvailableSlug(baseSlug: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = baseSlug || 'item';
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!(await exists(slug))) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
