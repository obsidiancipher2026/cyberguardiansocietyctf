/**
 * Escape SQL LIKE wildcards so user-supplied search terms match literally.
 * Without this, a "%" or "_" in a search box turns the query into a full
 * scan and can return unintended rows.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Wrap a search term in a literal-matching LIKE pattern. */
export function likePattern(term: string): string {
  return `%${escapeLike(term)}%`;
}