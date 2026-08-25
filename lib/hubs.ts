/**
 * lib/hubs.ts — the question hub pages (/questions/company/google,
 * /questions/category/product-sense, /questions/role/product-management).
 *
 * Pure logic only, so every rule is unit-tested: slug derivation, the
 * taxonomy built from published questions' tags, which hubs deserve a place
 * in the index, and the copy + JSON-LD each hub page carries. Data loading
 * lives in lib/hub-data.ts; rendering in lib/hub-page.tsx.
 *
 * A hub exists for every tag with at least one published question — links to
 * it must never 404 — but it is only indexable (and in the sitemap) once it
 * holds INDEXABLE_MIN_QUESTIONS, so tiny hubs never register as thin pages.
 */

import type { Question } from '@/types';

export type HubKind = 'company' | 'category' | 'role';

/** Below this many questions a hub renders but is noindex and off the sitemap. */
export const INDEXABLE_MIN_QUESTIONS = 3;

/** Cards rendered (and ItemList entries emitted) on one hub page. */
export const HUB_LIST_CAP = 100;

export interface HubRef {
  kind: HubKind;
  /** The tag exactly as stored on questions ("Product Sense", "A&M"). */
  name: string;
  slug: string;
  count: number;
  /** Latest updated_at among the hub's questions; null when unknown. */
  lastModified: string | null;
}

export interface HubTaxonomy {
  company: HubRef[];
  category: HubRef[];
  role: HubRef[];
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hubHref(kind: HubKind, name: string): string {
  return `/questions/${kind}/${slugify(name)}`;
}

export type TaggedRow = Pick<Question, 'company' | 'category' | 'role'> & {
  updated_at?: string | null;
};

/**
 * Aggregate the tags of every published question into the three hub lists,
 * sorted most-questions-first (ties alphabetically). If two names ever
 * collapse to one slug, the larger hub keeps it — deterministic, and the
 * loser's questions remain reachable through the list and related clusters.
 */
export function buildHubTaxonomy(rows: TaggedRow[]): HubTaxonomy {
  const maps: Record<HubKind, Map<string, { count: number; last: string | null }>> = {
    company: new Map(),
    category: new Map(),
    role: new Map(),
  };

  for (const row of rows) {
    const at = row.updated_at ?? null;
    for (const kind of ['company', 'category', 'role'] as const) {
      const values = kind === 'role' ? [row.role] : (row[kind] ?? []);
      for (const raw of values) {
        const name = raw?.trim();
        if (!name) continue;
        const entry = maps[kind].get(name) ?? { count: 0, last: null };
        entry.count += 1;
        if (at && (!entry.last || at > entry.last)) entry.last = at;
        maps[kind].set(name, entry);
      }
    }
  }

  const toRefs = (kind: HubKind, acc: Map<string, { count: number; last: string | null }>): HubRef[] => {
    const bySlug = new Map<string, HubRef>();
    for (const [name, { count, last }] of acc) {
      const slug = slugify(name);
      if (!slug) continue;
      const ref: HubRef = { kind, name, slug, count, lastModified: last };
      const existing = bySlug.get(slug);
      if (!existing || ref.count > existing.count || (ref.count === existing.count && ref.name < existing.name)) {
        bySlug.set(slug, ref);
      }
    }
    return [...bySlug.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };

  return {
    company: toRefs('company', maps.company),
    category: toRefs('category', maps.category),
    role: toRefs('role', maps.role),
  };
}

export function findHub(taxonomy: HubTaxonomy, kind: HubKind, slug: string): HubRef | null {
  return taxonomy[kind].find((h) => h.slug === slug) ?? null;
}

export function isIndexable(hub: Pick<HubRef, 'count'>): boolean {
  return hub.count >= INDEXABLE_MIN_QUESTIONS;
}

/** Sibling hubs for the "Browse more" section — biggest first, never itself. */
export function pickBrowseHubs(taxonomy: HubTaxonomy, current: HubRef, limit = 8): { categories: HubRef[]; companies: HubRef[] } {
  const not = (h: HubRef) => !(h.kind === current.kind && h.slug === current.slug);
  return {
    categories: taxonomy.category.filter(not).slice(0, limit),
    companies: taxonomy.company.filter(not).slice(0, limit),
  };
}

// ── Copy ─────────────────────────────────────────────────────────────────────

export function hubTitle(hub: Pick<HubRef, 'kind' | 'name'>): string {
  return hub.kind === 'company' ? `${hub.name} PM Interview Questions` : `${hub.name} Interview Questions`;
}

export interface HubStats {
  /** Count per difficulty label, insertion-ordered Easy → Medium → Hard. */
  difficulties: [string, number][];
  /** For a company hub: its top categories. Otherwise: its top companies. */
  crossNames: string[];
}

export function hubStats(hub: Pick<HubRef, 'kind'>, questions: Question[]): HubStats {
  const difficulty = new Map<string, number>();
  for (const label of ['Easy', 'Medium', 'Hard']) difficulty.set(label, 0);
  const cross = new Map<string, number>();
  for (const q of questions) {
    if (q.difficulty) difficulty.set(q.difficulty, (difficulty.get(q.difficulty) ?? 0) + 1);
    const names = hub.kind === 'company' ? (q.category ?? []) : (q.company ?? []);
    for (const raw of names) {
      const name = raw?.trim();
      if (name) cross.set(name, (cross.get(name) ?? 0) + 1);
    }
  }
  return {
    difficulties: [...difficulty.entries()].filter(([, n]) => n > 0),
    crossNames: [...cross.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name]) => name),
  };
}

const listOut = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];

/** Meta description — unique per hub because it is built from the hub's own data. */
export function hubDescription(hub: Pick<HubRef, 'kind' | 'name' | 'count'>, crossNames: string[]): string {
  const cross = crossNames.length ? listOut(crossNames) : '';
  const n = `${hub.count} real`;
  const plural = hub.count === 1 ? 'question' : 'questions';
  const tail = 'Free, with sample answers and community answers.';
  if (hub.kind === 'company') {
    return `Practice ${n} ${hub.name} PM interview ${plural}${cross ? `, covering ${cross}` : ''}. ${tail}`;
  }
  if (hub.kind === 'category') {
    return `Practice ${n} ${hub.name.toLowerCase()} interview ${plural}${cross ? `, asked at ${cross}` : ''}. ${tail}`;
  }
  return `Practice ${n} ${hub.name} interview ${plural}${cross ? ` from ${cross}` : ''}. ${tail}`;
}

/** The visible intro under the h1. Factual only — everything comes from the rows. */
export function hubIntro(hub: Pick<HubRef, 'kind' | 'name' | 'count'>, stats: HubStats): string {
  const mix = stats.difficulties.map(([label, n]) => `${n} ${label.toLowerCase()}`).join(', ');
  const what =
    hub.kind === 'company'
      ? `asked in real ${hub.name} product management interviews`
      : hub.kind === 'category'
        ? `from real ${hub.name.toLowerCase()} interview rounds`
        : `asked in real ${hub.name.toLowerCase()} interviews`;
  const cross = stats.crossNames.length
    ? hub.kind === 'company'
      ? ` They span ${listOut(stats.crossNames)}.`
      : ` Reported from interviews at ${listOut(stats.crossNames)}.`
    : '';
  return `${hub.count} question${hub.count === 1 ? '' : 's'} ${what}${mix ? ` — ${mix}` : ''}.${cross} Open any question for the full page: sample answer, community answers and related questions.`;
}

// ── Structured data ──────────────────────────────────────────────────────────

export interface HubJsonLdInput {
  hub: HubRef;
  questions: Question[];
  siteUrl: string;
}

/** CollectionPage with an ItemList of the questions, plus the breadcrumb trail. */
export function hubJsonLd({ hub, questions, siteUrl }: HubJsonLdInput) {
  const url = `${siteUrl}${hubHref(hub.kind, hub.name)}`;
  const listed = questions.slice(0, HUB_LIST_CAP);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name: hubTitle(hub),
        description: hubDescription(hub, hubStats(hub, questions).crossNames),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: listed.length,
          itemListElement: listed.map((q, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${siteUrl}/questions/${q.id}`,
            name: q.question_text,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Interview Questions', item: `${siteUrl}/questions` },
          { '@type': 'ListItem', position: 3, name: hub.name, item: url },
        ],
      },
    ],
  };
}
