import { describe, expect, it } from 'vitest';
import { coachingJsonLd, coursesJsonLd, eventsJsonLd } from '@/lib/marketing-jsonld';
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
});
