'use client';

/**
 * components/layout/CohortAnnouncementBar.tsx — slim site-wide strip above
 * the navbar announcing that cohort registration is open. Most visitors land
 * on question pages from search and never open /cohort, so this is how they
 * hear about it.
 *
 * - Hidden on /cohort (the page says it already) and /admin.
 * - Dismissible; the choice is remembered per browser under COHORT_BAR_KEY.
 *   COHORT_BAR_DISMISSED_SCRIPT (inlined in app/layout.tsx before first paint)
 *   marks <html> for dismissed visitors and globals.css hides `.cohort-bar`,
 *   so a returning visitor never sees it flash in and the page never jumps.
 * - Next cohort: change the copy and bump COHORT_BAR_KEY so the strip shows
 *   again to people who dismissed this one. Remove the component from
 *   app/layout.tsx when registration closes.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

export const COHORT_BAR_KEY = 'tm-cohort4-bar-dismissed';

export const COHORT_BAR_DISMISSED_SCRIPT = `try{if(localStorage.getItem('${COHORT_BAR_KEY}'))document.documentElement.setAttribute('data-cohort-bar-dismissed','')}catch(e){}`;

const HIDDEN_ON = ['/cohort', '/admin'];

export default function CohortAnnouncementBar() {
  const pathname = usePathname() ?? '';
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(COHORT_BAR_KEY, '1');
    } catch {
      // Private mode / blocked storage: hidden for this page view only.
    }
  };

  return (
    <div className="cohort-bar bg-gradient-brand text-primary-foreground">
      <div className="container relative flex items-center justify-center py-2 pl-4 pr-10 text-sm">
        <Link href="/cohort" className="group inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center">
          <span className="h-2 w-2 flex-none animate-pulse rounded-full bg-white" aria-hidden />
          <span className="font-semibold">Registration for Cohort 4 is now open</span>
          <span className="hidden text-white/80 sm:inline">· Weekend batch, Sat + Sun</span>
          <span className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 decoration-white/50 group-hover:decoration-white">
            Apply now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the Cohort 4 announcement"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
