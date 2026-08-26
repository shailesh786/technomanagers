/**
 * components/cohort/InstructorCard.tsx — the mentor credentials card in the
 * cohort hero's right-hand column (desktop only: the column is `hidden lg:block`
 * in CohortPage, so this never renders below the lg breakpoint).
 *
 * The card spends its space on proof the hero copy cannot make — mentoring
 * volume, the book, shipping AI in production — rather than repeating facts
 * the page already states (cohort name, "12 weeks", the follower count next to
 * the hero stats). YouTube and LinkedIn open from the two icon buttons beside
 * the name; the profile URLs are the two constants below.
 *
 * The proof lines are written long enough to span the card body at desktop
 * widths (the body is ~445px wide at the 1400px container cap) so the right
 * side of the card does not read as empty. At the lg breakpoint the column is
 * ~350px wide and a line or two wraps, which the gap and line-height absorb.
 *
 * Colours follow the CohortPage conventions: white text on the navy fill
 * (--primary), and the accent on this dark surface is cyan (--accent), which
 * clears 6.3:1 where brand blue only manages 3.3:1.
 */

import Image from 'next/image';
import type { ComponentProps, ReactNode } from 'react';

export const INSTRUCTOR_NAME = 'Shailesh Sharma';
export const INSTRUCTOR_YOUTUBE_URL = 'https://www.youtube.com/@technomanagers';
export const INSTRUCTOR_LINKEDIN_URL = 'https://www.linkedin.com/in/shailesh-sharma/';

export const INSTRUCTOR_PORTRAIT_URL =
  'https://res.cloudinary.com/topmate/image/upload/v1778317151/WhatsApp_Image_2026-05-09_at_2.06.10_PM_ae5sht.jpg';
const PORTRAIT_URL = INSTRUCTOR_PORTRAIT_URL;

// Label → line. Labels share one column (min-width below) so the lines align.
const PROOF: ReadonlyArray<readonly [string, string]> = [
  ['2,000+', 'PMs and builders mentored over 4 years'],
  ['Author', 'Product Management book on IIM elective lists'],
  ['1M+', 'views teaching AI product work on YouTube'],
  ['Alumni', 'IIT Kanpur · IIM Bangalore'],
];

// The two CohortPage `C` tokens this card uses. Duplicated rather than
// imported so the card does not depend on the page that renders it.
const ACCENT = 'hsl(var(--accent))';          // C.cyan2 — accent on dark surfaces
const FILL = 'hsl(var(--primary) / 0.92)';    // C.navy at the card body's opacity

function YouTubeIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  );
}

function LinkedInIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

/**
 * 30px bordered icon button (design variant 2b). The icon is decorative, so
 * the accessible name comes from `label`; `title` gives sighted users the same
 * text on hover, which is where the "1M+ views" figure lives.
 */
function SocialButton({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      // Border is a class rather than inline style so the hover variant can
      // recolour it; an inline shorthand would win over any class.
      className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-white/[0.18] text-white/75 transition-colors hover:text-accent hover:border-[hsl(var(--accent)/0.45)]"
    >
      {children}
    </a>
  );
}

type Props = {
  youtubeUrl?: string;
  linkedinUrl?: string;
};

export default function InstructorCard({
  youtubeUrl = INSTRUCTOR_YOUTUBE_URL,
  linkedinUrl = INSTRUCTOR_LINKEDIN_URL,
}: Props) {
  return (
    <aside
      aria-label={`Your mentor, ${INSTRUCTOR_NAME}`}
      className="rounded-3xl overflow-hidden backdrop-blur shadow-2xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 0 0 1px hsl(var(--accent) / 0.08), 0 20px 60px -20px hsl(var(--accent) / 0.25)',
      }}
    >
      <div className="relative h-[280px] w-full">
        <Image
          src={PORTRAIT_URL}
          alt={INSTRUCTOR_NAME}
          fill
          // The column this card lives in is ~350px wide at the lg breakpoint
          // and ~490px at the 1400px container cap; it is display:none below
          // lg, so the preload picks the smallest candidate there.
          sizes="(min-width: 1024px) 500px, 1px"
          className="object-cover"
          style={{ objectPosition: 'top center' }}
          priority
        />
      </div>

      <div
        className="p-6 flex flex-col gap-5"
        style={{ background: FILL, borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-[5px] min-w-0">
            <div className="font-heading font-bold text-[22px] leading-tight text-white">{INSTRUCTOR_NAME}</div>
            <div className="text-[15px] font-semibold" style={{ color: ACCENT }}>
              Ships AI products in production
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pt-[3px]">
            <SocialButton href={youtubeUrl} label="YouTube · 1M+ views">
              <YouTubeIcon className="w-[15px] h-[15px]" />
            </SocialButton>
            <SocialButton href={linkedinUrl} label="LinkedIn">
              <LinkedInIcon className="w-[14px] h-[14px]" />
            </SocialButton>
          </div>
        </div>

        <dl className="flex flex-col gap-[13px]">
          {PROOF.map(([label, line]) => (
            <div key={label} className="flex items-baseline gap-3">
              <dt className="font-heading font-extrabold text-base min-w-[62px]" style={{ color: ACCENT }}>
                {label}
              </dt>
              <dd className="text-[14.5px] text-white/[0.78]">{line}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
