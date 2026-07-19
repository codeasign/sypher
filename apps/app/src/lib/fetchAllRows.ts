// PostgREST caps a single .select() at 1000 rows by default. Any table that
// can plausibly grow past that (junction tables, catalogs) must page through
// with .range() until a page comes back short, or rows silently disappear
// from the response with no error.
export async function fetchAllRows<T>(
  query: { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }> }
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
