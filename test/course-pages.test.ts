import { describe, expect, it } from 'vitest';
import { COURSE_PAGE_IDS, courseHref, coursePageSlug } from '@/lib/course-links';
import { COURSE_PAGES, DEFAULT_OFFER_LABEL, courseOfferFromRow, coursePromoFor, getCoursePage, offerEndDay, offerShareLine, proofLine } from '@/lib/course-pages';
import { timeLeft } from '@/hooks/useCountdown';

describe('course pages content', () => {
  it('has unique slugs and course ids, and related slugs that exist', () => {
    expect(new Set(COURSE_PAGES.map((p) => p.slug)).size).toBe(COURSE_PAGES.length);
    expect(new Set(COURSE_PAGES.map((p) => p.courseId)).size).toBe(COURSE_PAGES.length);
    for (const p of COURSE_PAGES) {
      for (const slug of p.relatedSlugs) expect(getCoursePage(slug), `${p.slug} → ${slug}`).toBeDefined();
      expect(p.relatedSlugs).not.toContain(p.slug);
    }
  });

  it('never repeats a reviewer or a quote on a page', () => {
    for (const p of COURSE_PAGES) {
      const names = p.reviews.map((r) => r.name.split(' ')[0].toLowerCase());
      const quotes = p.reviews.map((r) => r.quote.toLowerCase().replace(/[^a-z]/g, '').slice(0, 60));
      expect(new Set(names).size, p.slug).toBe(names.length);
      expect(new Set(quotes).size, p.slug).toBe(quotes.length);
    }
  });

  it('keeps every page to one keyword-led H1 and a search-length meta description', () => {
    for (const p of COURSE_PAGES) {
      expect(p.titleLead.length).toBeGreaterThan(0);
      expect(p.metaDescription.length).toBeLessThanOrEqual(160);
    }
  });

  it('keeps live search titles short enough for Google to show whole, with no expiring offer in the snippet', () => {
    for (const p of COURSE_PAGES) {
      expect(p.seoTitle.length, p.slug).toBeLessThanOrEqual(65);
      expect(p.metaDescription.length, p.slug).toBeLessThanOrEqual(155);
      expect(p.metaDescription, p.slug).not.toMatch(/\b(off|coupon|code)\b/i);
    }
  });
});

describe('curriculum', () => {
  it('describes every module without listing its lessons', () => {
    for (const p of COURSE_PAGES) {
      for (const m of p.modules) {
        expect(m.summary.length, `${p.slug} / ${m.title}`).toBeGreaterThan(20);
        // Only the card fields — no field that could carry the lesson list.
        expect(Object.keys(m).every((k) => ['title', 'summary', 'tags', 'caseStudies', 'lessons', 'lessonNoun', 'highlight', 'certificate'].includes(k))).toBe(true);
      }
    }
    // The interview questions themselves never appear in the page content.
    expect(JSON.stringify(getCoursePage('ai-product-management-course'))).not.toMatch(/GPT 5\.0|Rufus|Gemini/);
  });
});

describe('published pages', () => {
  it('only publishes the pages listed in the link map', () => {
    expect(COURSE_PAGES.map((p) => p.slug).sort()).toEqual(Object.keys(COURSE_PAGE_IDS).sort());
    expect(getCoursePage('ai-pm-cohort-recording')).toBeUndefined();
  });
});

describe('courseHref', () => {
  const pgm = getCoursePage('ai-program-management-course')!;

  it('links a course with a page to /courses/{slug}', () => {
    expect(courseHref({ id: pgm.courseId, external_url: 'https://topmate.io/x' })).toEqual({
      href: '/courses/ai-program-management-course',
      external: false,
    });
    expect(coursePageSlug({ id: pgm.courseId })).toBe(pgm.slug);
  });

  it('has a page for every slug in the link map', () => {
    for (const [slug, id] of Object.entries(COURSE_PAGE_IDS)) {
      expect(getCoursePage(slug)?.courseId).toBe(id);
    }
  });

  it('keeps every other course on its Topmate link', () => {
    expect(courseHref({ id: 'other', external_url: 'https://topmate.io/x' })).toEqual({
      href: 'https://topmate.io/x',
      external: true,
    });
  });
});

describe('proofLine', () => {
  const base = { rating: null, ratingCount: null, ratingLabel: 'ratings', enrolled: null, enrolledLabel: 'learners enrolled' };

  it('joins the rating and enrolment when present', () => {
    expect(proofLine({ ...base, rating: '4.9', ratingLabel: 'average rating', enrolled: '1,120+' })).toBe(
      'Rated 4.9 · 1,120+ learners enrolled',
    );
  });

  it('falls back to the enroll prompt when there is no proof yet', () => {
    expect(proofLine(base)).toBe('Enroll on Topmate');
  });
});

describe('offer countdown', () => {
  it('splits the time left into days, hours, minutes and seconds', () => {
    const end = Date.parse('2026-11-16T23:59:59+05:30');
    const now = end - ((9 * 24 + 8) * 3600 + 59 * 60 + 17) * 1000;
    expect(timeLeft(end, now)).toEqual([9, 8, 59, 17]);
  });

  it('never goes negative after the offer ends', () => {
    expect(timeLeft(1_000, 5_000)).toEqual([0, 0, 0, 0]);
  });

});

describe('courseOfferFromRow', () => {
  const now = Date.parse('2026-11-07T12:00:00+05:30');
  const row = { offer_label: '20% off for a limited time', offer_code: 'AIPM20', offer_ends_at: '2026-11-16T23:59:59+05:30' };

  it('returns the live offer from the course row', () => {
    expect(courseOfferFromRow(row, now)).toEqual({ label: '20% off for a limited time', code: 'AIPM20', endsAt: row.offer_ends_at });
  });

  it('falls back to a default headline', () => {
    expect(courseOfferFromRow({ ...row, offer_label: '  ' }, now)?.label).toBe(DEFAULT_OFFER_LABEL);
  });

  it('has no offer without a code or end time, or once it has ended', () => {
    expect(courseOfferFromRow({ ...row, offer_code: null }, now)).toBeNull();
    expect(courseOfferFromRow({ ...row, offer_ends_at: null }, now)).toBeNull();
    expect(courseOfferFromRow(row, Date.parse('2026-11-17T00:00:00+05:30'))).toBeNull();
    expect(courseOfferFromRow(undefined, now)).toBeNull();
  });
});

describe('proof pop-up', () => {
  it('only cycles through facts already stated on the page', () => {
    const page = getCoursePage('ai-product-management-course')!;
    const lines = page.proofPoints!.map((p) => `${p.strong} ${p.rest}`).join(' ');
    // Numbers in the pop-up must match the hero proof strip — no invented counters.
    expect(lines).toContain(page.proof.enrolled!);
    expect(lines).toContain(page.proof.rating!);
    expect(lines).not.toMatch(/today|in the last|bought/i);
  });
});

describe('offer share text', () => {
  it('names the code and the last day in IST', () => {
    const offer = { label: '20% off for a limited time', code: 'AIPM20', endsAt: '2026-11-16T23:59:59+05:30' };
    expect(offerEndDay(offer)).toBe('16 Nov');
    expect(offerShareLine(offer)).toBe('20% off for a limited time with code AIPM20, till 16 Nov.');
  });
});

describe('coursePromoFor', () => {
  it('sends AI questions to the AI Product Management course', () => {
    expect(coursePromoFor(['Artificial Intelligence', 'Metrics'])).toMatchObject({
      href: '/courses/ai-product-management-course',
      title: 'AI Product Management Course',
    });
    expect(coursePromoFor(['AI PM Interview'])?.href).toBe('/courses/ai-product-management-course');
  });

  it('sends Program Management questions to the AI Program Management course, even when also tagged AI', () => {
    expect(coursePromoFor(['Program Management'])?.href).toBe('/courses/ai-program-management-course');
    expect(coursePromoFor(['Artificial Intelligence', 'Program Management'])?.href).toBe('/courses/ai-program-management-course');
  });

  it('shows no course for unrelated or untagged questions', () => {
    expect(coursePromoFor(['Guesstimates'])).toBeNull();
    expect(coursePromoFor(null)).toBeNull();
    expect(coursePromoFor([])).toBeNull();
  });
});
