/**
 * lib/postgrest.ts — safe literal builders for PostgREST filter grammar.
 *
 * postgrest-js serialises `.contains(col, array)` values UNQUOTED and `.or()`
 * strings verbatim, so a value containing `, ( ) { } "` corrupts the filter
 * (PostgREST 400 → empty result) or matches the wrong rows. Quoting is always
 * legal in PostgREST literals, so these helpers quote every value — no
 * character blacklist to keep in sync.
 */

/** Double-quote a value for a PostgREST literal, escaping `\` and `"`. */
export function pgQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Postgres array literal with every element quoted. Pass the STRING result to
 * `.contains(column, literal)` — the string branch of postgrest-js passes it
 * through verbatim, which is the escape hatch around the unquoted array branch.
 */
export function pgArrayLiteral(values: string[]): string {
  return `{${values.map(pgQuote).join(',')}}`;
}

/** `column.cs.{"value"}` — array-contains condition for `.or()` grammar. */
export function csContains(column: string, value: string): string {
  return `${column}.cs.${pgArrayLiteral([value])}`;
}

/** `column.eq."value"` — equality condition for `.or()` grammar. */
export function eqFilter(column: string, value: string): string {
  return `${column}.eq.${pgQuote(value)}`;
}
