'use client';

/**
 * components/events/EventsPage.tsx  —  Client Component ✅
 *
 * Migrated from src/_vite-pages/Events.tsx.
 * Changes:
 * - 'use client' added (uses TanStack Query hook)
 * - Hook import: @src/hooks/useEvents
 * - All logic, JSX, and visual design UNCHANGED.
 */

import { Calendar, ExternalLink, Clock } from 'lucide-react';
import { useEvents } from '@src/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const EVENT_TYPE_LABELS: Record<string, string> = {
  webinar: 'Webinar',
  workshop: 'Workshop',
  live_qa: 'Live Q&A',
  meetup: 'Meetup',
  other: 'Event',
};

function formatEventDate(iso: string) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timePart = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${datePart} · ${timePart} IST`;
}

export default function EventsPage() {
  const { data: events, isLoading } = useEvents();

  return (
    <div className="container py-10 max-w-5xl">
      <header className="mb-10">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">Upcoming Events</h1>
        <p className="text-muted-foreground text-lg">
          Join our webinars, workshops, and live sessions with industry experts.
        </p>
      </header>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <div className="border rounded-xl p-12 text-center bg-muted/30">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-1">No upcoming events right now.</h3>
          <p className="text-muted-foreground">Check back soon!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {events.map((e) => (
            <article
              key={e.id}
              className="group border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all flex flex-col"
            >
              {e.thumbnail_url && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={e.thumbnail_url}
                    alt={e.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {e.event_type && (
                    <Badge variant="secondary" className="text-xs">
                      {EVENT_TYPE_LABELS[e.event_type] || e.event_type}
                    </Badge>
                  )}
                  {e.status === 'live' && (
                    <Badge className="text-xs bg-destructive text-destructive-foreground">● LIVE</Badge>
                  )}
                </div>
                <h2 className="font-heading font-bold text-lg leading-snug">{e.title}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>{formatEventDate(e.event_date)}</span>
                </div>
                {e.duration && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>{e.duration}</span>
                  </div>
                )}
                {e.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{e.description}</p>
                )}
                <div className="mt-auto pt-2">
                  {e.external_url ? (
                    <Button asChild className="w-full gap-2">
                      <a href={e.external_url} target="_blank" rel="noopener noreferrer">
                        {e.status === 'live' ? 'Join Now' : 'Register'}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button disabled className="w-full">Details coming soon</Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
