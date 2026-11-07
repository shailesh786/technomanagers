import { describe, expect, it } from 'vitest';
import { coachingJsonLd, courseJsonLd, coursesJsonLd, eventsJsonLd } from '@/lib/marketing-jsonld';
import { COURSE_PAGES, getCoursePage } from '@/lib/course-pages';
import type { CoachingService, Course, Event } from '@/types';

const SITE = 'https://www.technomanagers.in';

const event = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  title: 'AI PM AMA',
  description: 'Live Q&A on AI product roles.',
  event_type: 'webinar',
  event_date: '2026-09-10T19:00:00+05:30',
  duration: '60 min',
  thumbnail_url: null,
  external_url: 'https://example.com/register',
  status: 'upcoming',
  display_order: 1,
  created_at: null,
  updated_at: null,
  ...over,
});

const service = (over: Partial<CoachingService> = {}): CoachingService =>
  ({
    id: 's1',
    title: 'Mock Interview',
    service_type: 'Interview Prep',
    short_description: '60-minute mock with feedback.',
    price: 999,
    original_price: null,
    duration: '60 min',
    platform: 'Topmate',
    rating: null,
    external_url: 'https://topmate.io/technomanagers/mock',
    badge_text: null,
    display_order: 1,
  }) as CoachingService;

const course = (over: Partial<Course> = {}): Course => ({
  id: 'c1',
  title: 'The AI PM Course',
  short_description: 'Self-paced AI product management.',
  long_description: null,
  thumbnail_url: null,
  external_url: 'https://example.com/course',
  category: 'Career',
  display_order: 1,
  status: 'active',
  created_at: null,
  updated_at: null,
  ...over,
});

describe('eventsJsonLd', () => {
  it('emits an ItemList of online Events pointing at the site Organization', () => {
    const out = eventsJsonLd([event()], SITE);
    expect(out).toMatchObject({
      '@type': 'ItemList',
      url: `${SITE}/events`,
      numberOfItems: 1,
    });
    expect(out.itemListElement[0].item).toMatchObject({
      '@type': 'Event',
      name: 'AI PM AMA',
      startDate: '2026-09-10T19:00:00+05:30',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url: 'https://example.com/register' },
      organizer: { '@id': `${SITE}#org` },
    });
  });

  it('skips rows without a title or date and falls back to /events for missing urls', () => {
    const out = eventsJsonLd([event(), event({ id: 'e2', title: '  ' }), event({ id: 'e3', external_url: null })], SITE);
    expect(out.numberOfItems).toBe(2);
    expect(out.itemListElement[1].item).toMatchObject({ url: `${SITE}/events` });
  });
});

describe('coachingJsonLd', () => {
  it('emits Services with the org as provider — and never a price', () => {
    const out = coachingJsonLd([service()], SITE);
    expect(out.itemListElement[0].item).toMatchObject({
      '@type': 'Service',
      name: 'Mock Interview',
      serviceType: 'Interview Prep',
      provider: { '@id': `${SITE}#org` },
      url: 'https://topmate.io/technomanagers/mock',
    });
    expect(JSON.stringify(out)).not.toContain('999');
  });
});

describe('coursesJsonLd', () => {
  it('emits Courses with the org as provider', () => {
    const out = coursesJsonLd([course(), course({ id: 'c2', title: '', external_url: 'x' })], SITE);
    expect(out.numberOfItems).toBe(1);
    expect(out.itemListElement[0].item).toMatchObject({
      '@type': 'Course',
      name: 'The AI PM Course',
      provider: { '@id': `${SITE}#org` },
      description: 'Self-paced AI product management.',
    });
  });

  it('falls back to a factual description when a course has none (Google requires it)', () => {
    const out = coursesJsonLd([course({ short_description: null }), course({ id: 'c3', short_description: '   ' })], SITE);
    for (const el of out.itemListElement) {
      expect((el.item as { description: string }).description).toBeTruthy();
      expect((el.item as { description: string }).description).toContain('The AI PM Course');
    }
  });

  it('points courses with an on-site page at that page, others at Topmate', () => {
    const pgm = COURSE_PAGES.find((p) => p.slug === 'ai-program-management-course')!;
    const out = coursesJsonLd([course({ id: pgm.courseId }), course({ id: 'c9' })], SITE);
    expect((out.itemListElement[0].item as { url: string }).url).toBe(`${SITE}/courses/ai-program-management-course`);
    expect((out.itemListElement[1].item as { url: string }).url).toBe('https://example.com/course');
  });
});

describe('courseJsonLd', () => {
  const checkout = 'https://topmate.io/technomanagers/2033621';

  it('emits Course, BreadcrumbList and FAQPage from the page content', () => {
    const page = getCoursePage('ai-program-management-course')!;
    const [courseNode, crumbs, faq] = courseJsonLd(page, checkout, SITE);
    expect(courseNode).toMatchObject({
      '@type': 'Course',
      name: 'AI Program Management Course',
      url: `${SITE}/courses/ai-program-management-course`,
      provider: { '@id': `${SITE}#org` },
      offers: { '@type': 'Offer', category: 'Paid', url: checkout },
    });
    expect(courseNode).toMatchObject({
      inLanguage: 'en',
      image: `${SITE}/courses/ai-program-management-course/opengraph-image`,
      hasCourseInstance: { courseMode: 'Online', instructor: { '@type': 'Person', name: 'Priyanka Dalmia' } },
    });
    expect((courseNode as { teaches: string[] }).teaches).toContain('Crack AI Program Manager Interviews');
    // No price on-site, so none in the markup either.
    expect(JSON.stringify(courseNode)).not.toContain('price');
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual(['Home', 'Courses', 'AI Program Management']);
    expect(faq.mainEntity).toHaveLength(page.faqs.length);
    expect(faq.mainEntity[0]).toMatchObject({ '@type': 'Question', name: page.faqs[0].q, acceptedAnswer: { text: page.faqs[0].a } });
  });

  it('adds aggregateRating only when both the rating and its count are known', () => {
    const page = getCoursePage('ai-product-management-course')!;
    const counted = { ...page, proof: { ...page.proof, rating: '4.8', ratingCount: 12 } };
    expect(courseJsonLd(counted, checkout, SITE)[0]).toMatchObject({ aggregateRating: { ratingValue: '4.8', ratingCount: 12 } });
    // The AI PM course shows its rating without a count, so no rating markup.
    expect(courseJsonLd(page, checkout, SITE)[0]).not.toHaveProperty('aggregateRating');
    const unrated = courseJsonLd(getCoursePage('ai-program-management-course')!, checkout, SITE)[0];
    expect(unrated).not.toHaveProperty('aggregateRating');
  });
});
