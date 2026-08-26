import { describe, expect, it } from 'vitest';
import {
  HUB_LIST_CAP,
  INDEXABLE_MIN_QUESTIONS,
  buildHubTaxonomy,
  findHub,
  hubDescription,
  hubHref,
  hubIntro,
  hubJsonLd,
  hubStats,
  hubTitle,
  isIndexable,
  pickBrowseHubs,
  roleNoun,
  slugify,
  type HubRef,
} from '@/lib/hubs';
import type { Question } from '@/types';

const q = (id: string, over: Partial<Question> = {}): Question => ({
  id,
  question_text: `Question ${id}`,
  company: null,
  category: null,
  tags: null,
  difficulty: null,
  role: null,
  sample_answer: null,
  status: 'published',
  upvotes: 0,
  created_at: null,
  updated_at: null,
  ...over,
});

const hub = (over: Partial<HubRef>): HubRef => ({
  kind: 'company',
  name: 'Google',
  slug: 'google',
  count: 14,
  lastModified: null,
  ...over,
});

describe('slugify / hubHref', () => {
  it('derives url-safe slugs from tag names as stored', () => {
    expect(slugify('Product Sense')).toBe('product-sense');
    expect(slugify('A&M')).toBe('a-m');
    expect(slugify('Merger & Acquisition')).toBe('merger-acquisition');
    expect(slugify('EY-Parthenon')).toBe('ey-parthenon');
    expect(slugify('  GTM  ')).toBe('gtm');
    expect(slugify('Café Zürich')).toBe('cafe-zurich');
  });

  it('builds hub hrefs from kind and name', () => {
    expect(hubHref('company', 'Google')).toBe('/questions/company/google');
    expect(hubHref('category', 'Product Sense')).toBe('/questions/category/product-sense');
    expect(hubHref('role', 'Product Management')).toBe('/questions/role/product-management');
  });
});

describe('buildHubTaxonomy', () => {
  const rows = [
    { company: ['Google', 'Meta'], category: ['Product Sense'], role: 'Product Management', updated_at: '2026-05-01T00:00:00+00:00' },
    { company: ['Google'], category: ['Product Sense', 'Analytical'], role: 'Product Management', updated_at: '2026-06-01T00:00:00+00:00' },
    { company: ['  '], category: null, role: null, updated_at: null },
    { company: ['Uber'], category: ['Analytical'], role: 'Management Consulting', updated_at: '2026-04-01T00:00:00+00:00' },
  ];
  const tax = buildHubTaxonomy(rows);

  it('counts every tag occurrence, skipping blanks and null roles', () => {
    expect(tax.company.map((h) => [h.name, h.count])).toEqual([
      ['Google', 2],
      ['Meta', 1],
      ['Uber', 1],
    ]);
    expect(tax.category.map((h) => [h.name, h.count])).toEqual([
      ['Analytical', 2],
      ['Product Sense', 2],
    ]);
    expect(tax.role.map((h) => [h.name, h.count])).toEqual([
      ['Product Management', 2],
      ['Management Consulting', 1],
    ]);
  });

  it('tracks the latest updated_at per hub for sitemap lastmod', () => {
    expect(tax.company.find((h) => h.name === 'Google')?.lastModified).toBe('2026-06-01T00:00:00+00:00');
    expect(tax.company.find((h) => h.name === 'Uber')?.lastModified).toBe('2026-04-01T00:00:00+00:00');
  });

  it('keeps the bigger hub when two names collapse to one slug', () => {
    const collided = buildHubTaxonomy([
      { company: ['A&M', 'A M'], category: null, role: null },
      { company: ['A&M'], category: null, role: null },
    ]);
    expect(collided.company).toHaveLength(1);
    expect(collided.company[0]).toMatchObject({ name: 'A&M', slug: 'a-m', count: 2 });
  });

  it('resolves hubs by slug', () => {
    expect(findHub(tax, 'category', 'product-sense')?.name).toBe('Product Sense');
    expect(findHub(tax, 'company', 'nonexistent')).toBeNull();
  });
});

describe('indexability', () => {
  it('needs the minimum question count', () => {
    expect(isIndexable({ count: INDEXABLE_MIN_QUESTIONS - 1 })).toBe(false);
    expect(isIndexable({ count: INDEXABLE_MIN_QUESTIONS })).toBe(true);
  });
});

describe('pickBrowseHubs', () => {
  const tax = buildHubTaxonomy(
    Array.from({ length: 12 }, (_, i) => ({ company: [`Co${String(i).padStart(2, '0')}`], category: [`Cat${String(i).padStart(2, '0')}`], role: null })),
  );

  it('caps each list and never offers the current hub to itself', () => {
    const current = findHub(tax, 'company', 'co00')!;
    const browse = pickBrowseHubs(tax, current, 8);
    expect(browse.companies).toHaveLength(8);
    expect(browse.categories).toHaveLength(8);
    expect(browse.companies.some((h) => h.slug === 'co00')).toBe(false);
    expect(browse.categories.some((h) => h.slug === 'cat00')).toBe(true);
  });
});

describe('copy', () => {
  it('titles by kind', () => {
    expect(hubTitle(hub({ kind: 'company', name: 'Google' }))).toBe('Google PM Interview Questions');
    expect(hubTitle(hub({ kind: 'category', name: 'Product Sense' }))).toBe('Product Sense Interview Questions');
    expect(hubTitle(hub({ kind: 'role', name: 'Management Consulting' }))).toBe('Management Consulting Interview Questions');
  });

  it('hubStats: difficulty mix in fixed order, cross-tags by frequency', () => {
    const questions = [
      q('1', { difficulty: 'Hard', category: ['Analytical'] }),
      q('2', { difficulty: 'Easy', category: ['Analytical', 'Product Sense'] }),
      q('3', { difficulty: 'Easy', category: ['Guesstimates'] }),
    ];
    const stats = hubStats({ kind: 'company' }, questions);
    expect(stats.difficulties).toEqual([['Easy', 2], ['Hard', 1]]);
    expect(stats.crossNames).toEqual(['Analytical', 'Guesstimates', 'Product Sense']);

    const byCompany = hubStats({ kind: 'category' }, [q('1', { company: ['Meta'] }), q('2', { company: ['Meta', 'Google'] })]);
    expect(byCompany.crossNames).toEqual(['Meta', 'Google']);
  });

  it('hubStats: dominant role is the modal role, ties alphabetical, null without roles', () => {
    const mixed = hubStats({ kind: 'company' }, [
      q('1', { role: 'Management Consulting' }),
      q('2', { role: 'Management Consulting' }),
      q('3', { role: 'Product Management' }),
      q('4', { role: null }),
    ]);
    expect(mixed.dominantRole).toBe('Management Consulting');

    const tie = hubStats({ kind: 'company' }, [
      q('1', { role: 'Product Management' }),
      q('2', { role: 'Management Consulting' }),
    ]);
    expect(tie.dominantRole).toBe('Management Consulting');

    expect(hubStats({ kind: 'company' }, [q('1'), q('2')]).dominantRole).toBeNull();
  });

  it('roleNoun maps known roles and passes unknown ones through', () => {
    expect(roleNoun('Product Management')).toBe('PM');
    expect(roleNoun('Management Consulting')).toBe('Consulting');
    expect(roleNoun('Program Management')).toBe('Program Management');
    expect(roleNoun('Growth Marketing')).toBe('Growth Marketing');
    expect(roleNoun(null)).toBe('PM');
  });

  it('company hubs title/describe by their dominant role (McKinsey ≠ PM)', () => {
    const mckinsey = hub({ name: 'McKinsey', slug: 'mckinsey', count: 9 });
    expect(hubTitle(mckinsey, 'Consulting')).toBe('McKinsey Consulting Interview Questions');
    expect(hubDescription(mckinsey, ['Guesstimates'], 'Consulting')).toBe(
      'Practice 9 real McKinsey Consulting interview questions, covering Guesstimates. Free, with sample answers and community answers.',
    );
    const intro = hubIntro(
      mckinsey,
      { difficulties: [['Medium', 9]], crossNames: [], dominantRole: 'Management Consulting' },
      9,
    );
    expect(intro).toContain('asked in real McKinsey management consulting interviews');
  });

  it('descriptions are data-driven per kind and degrade without cross names', () => {
    expect(hubDescription(hub({ kind: 'company', name: 'Google', count: 14 }), ['Product Sense', 'Analytical'])).toBe(
      'Practice 14 real Google PM interview questions, covering Product Sense and Analytical. Free, with sample answers and community answers.',
    );
    expect(hubDescription(hub({ kind: 'category', name: 'Product Sense', count: 12 }), ['Google'])).toBe(
      'Practice 12 real product sense interview questions, asked at Google. Free, with sample answers and community answers.',
    );
    expect(hubDescription(hub({ kind: 'role', name: 'Management Consulting', count: 28 }), [])).toBe(
      'Practice 28 real Management Consulting interview questions. Free, with sample answers and community answers.',
    );
    expect(hubDescription(hub({ kind: 'company', name: 'Lyft', count: 1 }), ['Analytical'])).toBe(
      'Practice 1 real Lyft PM interview question, covering Analytical. Free, with sample answers and community answers.',
    );
  });

  it('caps descriptions at 155 chars on a word boundary', () => {
    const long = hubDescription(
      hub({ kind: 'company', name: 'Pricewaterhousecoopers Strategy& Consulting', count: 42 }),
      ['Mergers & Acquisitions Strategy', 'Corporate Development', 'Commercial Due Diligence'],
    );
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long.endsWith('…')).toBe(true);
  });

  it('intro states count, mix and cross-tags factually', () => {
    const intro = hubIntro(
      hub({ kind: 'company', name: 'Google', count: 2 }),
      {
        difficulties: [['Medium', 1], ['Hard', 1]],
        crossNames: ['Product Sense'],
        dominantRole: null,
      },
      2,
    );
    expect(intro).toBe(
      '2 questions asked in real Google product management interviews — 1 medium, 1 hard. They span Product Sense. Open any question for the full page: sample answer, community answers and related questions.',
    );
    expect(hubIntro(hub({ count: 1 }), { difficulties: [], crossNames: [], dominantRole: null }, 1)).toContain(
      '1 question asked',
    );
  });

  it('labels the difficulty mix as sampled when the hub exceeds the list cap', () => {
    const intro = hubIntro(
      hub({ kind: 'company', name: 'Google', count: 130 }),
      { difficulties: [['Easy', 40], ['Hard', 60]], crossNames: [], dominantRole: null },
      100,
    );
    expect(intro).toContain('— across the top 100: 40 easy, 60 hard.');
  });
});

describe('hubJsonLd', () => {
  const SITE = 'https://www.technomanagers.in';

  it('emits a CollectionPage with an ItemList and the breadcrumb trail', () => {
    const questions = [q('a', { question_text: 'First?' }), q('b', { question_text: 'Second?' })];
    const graph = hubJsonLd({ hub: hub({}), questions, siteUrl: SITE })['@graph'];
    expect(graph[0]).toMatchObject({
      '@type': 'CollectionPage',
      url: `${SITE}/questions/company/google`,
      name: 'Google PM Interview Questions',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: 2,
        itemListElement: [
          { '@type': 'ListItem', position: 1, url: `${SITE}/questions/a`, name: 'First?' },
          { '@type': 'ListItem', position: 2, url: `${SITE}/questions/b`, name: 'Second?' },
        ],
      },
    });
    expect(graph[1]).toMatchObject({ '@type': 'BreadcrumbList' });
    expect((graph[1] as { itemListElement: { name: string }[] }).itemListElement.map((i) => i.name)).toEqual([
      'Home',
      'Interview Questions',
      'Google',
    ]);
  });

  it('caps the ItemList at the page cap', () => {
    const many = Array.from({ length: HUB_LIST_CAP + 5 }, (_, i) => q(String(i)));
    const graph = hubJsonLd({ hub: hub({ count: many.length }), questions: many, siteUrl: SITE })['@graph'];
    expect((graph[0] as { mainEntity: { numberOfItems: number } }).mainEntity.numberOfItems).toBe(HUB_LIST_CAP);
  });
});
