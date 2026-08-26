/**
 * lib/marketing-jsonld.ts — pure JSON-LD builders for the marketing pages
 * (/events, /coaching, /courses). Each returns an ItemList whose entries
 * point their organizer/provider at the site-wide Organization node
 * (`${siteUrl}#org`, declared in app/layout.tsx), so Google connects the
 * listings to the brand entity. Pure functions — unit-tested; the routes
 * serialize them with serializeJsonLd.
 */

import type { CoachingService, Course, Event } from '@/types';

const org = (siteUrl: string) => ({ '@id': `${siteUrl}#org` });

const itemList = (siteUrl: string, url: string, name: string, elements: object[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  '@id': `${siteUrl}${url}`,
  url: `${siteUrl}${url}`,
  name,
  numberOfItems: elements.length,
  itemListElement: elements.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item,
  })),
});

/** Event entries for the rows /events prefetches (upcoming + live only). */
export function eventsJsonLd(events: Event[], siteUrl: string) {
  const entries = events
    .filter((e) => e.title?.trim() && e.event_date)
    .map((e) => ({
      '@type': 'Event',
      name: e.title,
      startDate: e.event_date,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      // Online events still require a location per Google's Event rules.
      location: { '@type': 'VirtualLocation', url: e.external_url ?? `${siteUrl}/events` },
      organizer: org(siteUrl),
      ...(e.description?.trim() ? { description: e.description } : {}),
      ...(e.thumbnail_url ? { image: e.thumbnail_url } : {}),
      url: e.external_url ?? `${siteUrl}/events`,
    }));
  return itemList(siteUrl, '/events', 'Technomanagers PM Events', entries);
}

/** Service entries for the coaching listings. */
export function coachingJsonLd(services: CoachingService[], siteUrl: string) {
  const entries = services
    .filter((s) => s.title?.trim())
    .map((s) => ({
      '@type': 'Service',
      name: s.title,
      serviceType: s.service_type ?? 'Career coaching',
      provider: org(siteUrl),
      ...(s.short_description?.trim() ? { description: s.short_description } : {}),
      url: s.external_url,
    }));
  return itemList(siteUrl, '/coaching', 'Technomanagers 1:1 PM Coaching', entries);
}

/** Course entries for the self-paced course listings. */
export function coursesJsonLd(courses: Course[], siteUrl: string) {
  const entries = courses
    .filter((c) => c.title?.trim())
    .map((c) => ({
      '@type': 'Course',
      name: c.title,
      provider: org(siteUrl),
      // Google requires description on Course items — fall back to a factual
      // template when a row has no short_description, so no item is invalid.
      description: c.short_description?.trim() || `${c.title} — a self-paced product management course from Technomanagers.`,
      url: c.external_url,
    }));
  return itemList(siteUrl, '/courses', 'Technomanagers PM Courses', entries);
}
