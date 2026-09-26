'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * First word of a display name, capitalised — or null when there's nothing
 * usable (missing, blank, or an email address stored as the name).
 */
export function firstNameOf(fullName: unknown): string | null {
  if (typeof fullName !== 'string') return null;
  const first = fullName.trim().split(/\s+/)[0];
  if (!first || first.includes('@')) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * The Hero Priority Board heading: "Shailesh, start here." when signed in,
 * "Start here." otherwise.
 *
 * The homepage is static (ISR), so the server always renders "Start here." and
 * the name swaps in client-side once auth resolves — no cookies() on the
 * server. Name comes from the profile row (what the Navbar shows), falling
 * back to the Google metadata on the session, which is available before the
 * profile fetch lands. Always one line — a long name is truncated, never the
 * ", start here." — so the row height can't change (no layout shift).
 */
export default function StartHereHeading() {
  const { user, profile } = useAuth();
  const name = user
    ? (firstNameOf(profile?.full_name) ??
      firstNameOf(user.user_metadata?.full_name) ??
      firstNameOf(user.user_metadata?.name))
    : null;

  return (
    <h2 className="flex min-w-0 whitespace-nowrap font-heading text-[22px] font-bold tracking-[-0.02em] text-foreground md:text-[32px] md:tracking-[-0.022em]">
      {name ? (
        <>
          {/* Only the name shortens ("Venkatarag…, start here.") */}
          <span className="min-w-0 truncate duration-300 animate-in fade-in motion-reduce:animate-none">
            {name}
          </span>
          <span className="shrink-0 whitespace-pre">, start here.</span>
        </>
      ) : (
        'Start here.'
      )}
    </h2>
  );
}
