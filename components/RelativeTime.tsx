'use client';

/**
 * components/RelativeTime.tsx — "14 days ago" that is safe to server-render.
 *
 * Relative times drift: a statically generated page says "5 minutes ago" for
 * as long as the CDN serves that HTML, while a browser hydrating it computes
 * the current value. React would report the text mismatch and drop the
 * server HTML. This renders whatever the server said, suppresses that one
 * warning, and re-computes after mount so the visible text is always current.
 */

import { useEffect, useState } from 'react';
import { timeAgo } from '@/lib/timeAgo';

interface Props {
  date: string | null;
  className?: string;
}

export default function RelativeTime({ date, className }: Props) {
  const [label, setLabel] = useState(() => timeAgo(date));

  useEffect(() => {
    setLabel(timeAgo(date));
  }, [date]);

  return (
    <time dateTime={date ?? undefined} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
