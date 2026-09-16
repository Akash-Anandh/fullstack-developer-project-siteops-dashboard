/** Hard page size: list endpoints never return more than this many rows. */
export const PAGE_LIMIT_MAX = 20;
export const PAGE_LIMIT_DEFAULT = 20;

/**
 * Parse skip/limit from query.
 * - limit: always capped at 20 (default 20)
 * - skip: rows to skip (alias: offset); default 0
 * - all=1: return every matching row (no LIMIT/OFFSET); used for export
 */
export function parsePagination(query) {
  if (query.all === '1' || query.all === 'true') {
    return { limit: null, skip: 0, all: true };
  }

  const rawLimit = Number(query.limit);
  const rawSkip = Number(
    query.skip !== undefined ? query.skip : query.offset
  );

  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.floor(rawLimit)
      : PAGE_LIMIT_DEFAULT
  );

  const skip =
    Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.floor(rawSkip) : 0;

  return { limit, skip, all: false };
}
