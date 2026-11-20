type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** Fetch every row by walking 1,000-row pages (PostgREST caps each response). */
export async function fetchAllPages<T>(page: (from: number, to: number) => Page<T>, size = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) return out;
  }
}
