export type LeafCursor = { created_at: string; id: string };

/**
 * Builds the keyset filter for the public leaf list.
 *
 * Leaves are ordered by (created_at desc, id desc), so a page continues after
 * the last row of the previous one. The timestamp placeholder is reused for
 * the equality branch and the id gets its own parameter: both values are
 * needed, and PostgreSQL rejects a statement that binds an id to a timestamp
 * or leaves a numbered placeholder unused.
 */
export function leafCursorFilter(cursor?: LeafCursor): {
  filter: string;
  params: string[];
} {
  if (!cursor) return { filter: "", params: [] };
  return {
    filter: " and (created_at < $1 or (created_at = $1 and id < $2))",
    params: [cursor.created_at, cursor.id],
  };
}
