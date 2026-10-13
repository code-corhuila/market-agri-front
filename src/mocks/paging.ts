const MAX_LIMIT = 100;

type Detail = { field: string; message: string };
export type PageRequest = { page: number; limit: number };

/**
 * D-C24: `page` (≥ 1) and `limit` (1–100) and the filters the card allows: the enumerated ones
 * with their values (`enums`) and the free ones (`free`), each declared once; anything else is a
 * 400 with one detail per field.
 */
export function readPage(
  url: URL,
  enums: Record<string, readonly string[]>,
  free: string[] = [],
): { details: Detail[] } | PageRequest {
  const details: Detail[] = [];
  const allowed = [...Object.keys(enums), ...free, 'page', 'limit'];
  for (const key of new Set(url.searchParams.keys())) {
    if (!allowed.includes(key)) details.push({ field: key, message: 'Filtro desconocido.' });
  }
  const number = (key: string, fallback: number, max: number) => {
    const raw = url.searchParams.get(key);
    const value = raw === null ? fallback : Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > max) {
      details.push({ field: key, message: 'Fuera de rango.' });
    }
    return value;
  };
  const page = number('page', 1, Number.MAX_SAFE_INTEGER);
  const limit = number('limit', 20, MAX_LIMIT);
  for (const [key, allowed] of Object.entries(enums)) {
    const value = url.searchParams.get(key);
    if (value !== null && !allowed.includes(value)) {
      details.push({ field: key, message: 'Valor no permitido.' });
    }
  }
  return details.length > 0 ? { details } : { page, limit };
}

/** `{ data, meta }` in the order of every paginated card here: createdAt descending, then id. */
export function pageOf<T extends { id: string; createdAt: string }, V>(
  items: T[],
  { page, limit }: PageRequest,
  view: (item: T) => V,
) {
  const sorted = [...items].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );
  const data = sorted.slice((page - 1) * limit, page * limit).map(view);
  return {
    data,
    meta: { page, limit, total: sorted.length, totalPages: Math.ceil(sorted.length / limit) },
  };
}
