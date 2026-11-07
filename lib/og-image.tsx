/**
 * lib/og-image.tsx — server-only share-card rendering (og:image / twitter:image).
 *
 * Every card is a 1200×630 PNG rendered by next/og (satori): brand navy
 * gradient, wordmark, clamped title, meta line. Route files under app/ are
 * thin wrappers around renderOgCard().
 *
 * Typography: tries to load a committed brand TTF (satori rejects woff2) and
 * falls back to next/og's bundled default sans when the file is absent — the
 * cards must never fail over a font. To upgrade the type, drop a latin-subset
 * file at assets/fonts/PlusJakartaSans-ExtraBold.ttf; no code change needed.
 */

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getHubQuestions, getHubTaxonomy } from '@/lib/hub-data';
import { findHub, hubStats, hubTitle, roleNoun, type HubKind } from '@/lib/hubs';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/** The site-wide card — also the fallback whenever a specific card can't load. */
export const SITE_OG_CARD = {
  eyebrow: 'technomanagers.in',
  title: 'Crack Your Next Product Management Interview',
  meta: 'Real interview questions · 1:1 coaching · Courses · AI PM cohort',
};

// cwd-based path (NOT `new URL(…, import.meta.url)`) so webpack doesn't try
// to statically resolve a file that may not be committed. When the font IS
// added, also add it to next.config `outputFileTracingIncludes` so Vercel
// bundles it with the image routes.
let fontPromise: Promise<ArrayBuffer | null> | null = null;
function loadHeadingFont(): Promise<ArrayBuffer | null> {
  fontPromise ??= readFile(join(process.cwd(), 'assets/fonts/PlusJakartaSans-ExtraBold.ttf'))
    .then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)
    .catch(() => null);
  return fontPromise;
}

export interface OgCardProps {
  /** Small uppercase line above the title (e.g. "Asked at Google · Meta"). */
  eyebrow: string;
  title: string;
  /** Bottom-left context line (e.g. "Medium · Sample answer inside"). */
  meta?: string;
  /** A live discount, shown as a coupon strip under the title (course pages). */
  coupon?: { headline: string; code: string; until: string };
}

export async function renderOgCard({ eyebrow, title, meta, coupon }: OgCardProps): Promise<ImageResponse> {
  const font = await loadHeadingFont();
  // Satori has no line-clamp — cap the text so long questions stay ≤3 lines.
  const clamped = title.length > 140 ? `${title.slice(0, 137).trimEnd()}…` : title;
  const titleSize = clamped.length <= 60 ? 64 : clamped.length <= 100 ? 54 : 46;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          backgroundImage: 'linear-gradient(135deg, #0b2b6b 0%, #071c49 60%, #051433 100%)',
          color: '#ffffff',
          ...(font ? { fontFamily: '"Plus Jakarta Sans"' } : {}),
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: '0.02em' }}>
          <span style={{ color: '#ffffff' }}>TECHNO</span>
          <span style={{ color: '#7fb3ff' }}>MANAGERS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 800,
              color: '#7fb3ff',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 800, lineHeight: 1.15 }}>{clamped}</div>
          {coupon && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginTop: 8,
                padding: '14px 22px',
                border: '3px dashed #7fb3ff',
                borderRadius: 16,
                background: 'rgba(29, 125, 232, 0.18)',
                fontSize: 28,
                fontWeight: 800,
                alignSelf: 'flex-start',
              }}
            >
              <span>{coupon.headline}</span>
              <span
                style={{
                  display: 'flex',
                  padding: '6px 16px',
                  borderRadius: 10,
                  background: '#ffffff',
                  color: '#0b2b6b',
                  letterSpacing: '0.08em',
                }}
              >
                {coupon.code}
              </span>
              <span style={{ color: '#b9cdf3', fontSize: 24 }}>till {coupon.until}</span>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: '#b9cdf3',
          }}
        >
          <span>{meta ?? ''}</span>
          <span>technomanagers.in</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      ...(font
        ? { fonts: [{ name: 'Plus Jakarta Sans', data: font, weight: 800 as const, style: 'normal' as const }] }
        : {}),
    },
  );
}

/**
 * Share card for a course page, laid out for square crops: WhatsApp (and
 * some LinkedIn placements) crop the 1200×630 image to a centred square, so
 * the brand, the course name and the coupon all sit inside the middle
 * ~600px column. Edges carry only background.
 */
export async function renderCourseOgCard({
  eyebrow,
  title,
  coupon,
}: {
  eyebrow: string;
  title: string;
  coupon?: { headline: string; code: string; until: string };
}): Promise<ImageResponse> {
  const font = await loadHeadingFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
          // 540px text column centred in the 630px square WhatsApp keeps.
          padding: '40px 330px',
          textAlign: 'center',
          backgroundImage: 'linear-gradient(135deg, #0b2b6b 0%, #071c49 60%, #051433 100%)',
          color: '#ffffff',
          ...(font ? { fontFamily: '"Plus Jakarta Sans"' } : {}),
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: '0.02em' }}>
          <span style={{ color: '#ffffff' }}>TECHNO</span>
          <span style={{ color: '#7fb3ff' }}>MANAGERS</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 800,
            color: '#7fb3ff',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 52, fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
        {coupon ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '18px 28px',
              border: '3px dashed #7fb3ff',
              borderRadius: 18,
              background: 'rgba(29, 125, 232, 0.18)',
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 800 }}>{coupon.headline}</span>
            <span
              style={{
                display: 'flex',
                padding: '8px 22px',
                borderRadius: 12,
                background: '#ffffff',
                color: '#0b2b6b',
                fontSize: 40,
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {coupon.code}
            </span>
            <span style={{ fontSize: 22, color: '#b9cdf3' }}>Use at checkout · till {coupon.until}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 24, color: '#b9cdf3' }}>technomanagers.in</div>
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      ...(font
        ? { fonts: [{ name: 'Plus Jakarta Sans', data: font, weight: 800 as const, style: 'normal' as const }] }
        : {}),
    },
  );
}

const HUB_EYEBROW: Record<HubKind, string> = {
  company: 'Company · Interview questions',
  category: 'Category · Interview questions',
  role: 'Role · Interview questions',
};

/**
 * Card for a hub route — the three thin opengraph-image files under
 * app/questions/{company,category,role}/[slug]/ call this with their kind.
 * Unknown slug or a data error falls back to the site card; never throws.
 */
export function createHubOgImage(kind: HubKind) {
  return async function HubOgImage({ params }: { params: { slug: string } }): Promise<ImageResponse> {
    try {
      const hub = findHub(await getHubTaxonomy(), kind, params.slug);
      if (hub) {
        // Same role-aware title as the page itself (McKinsey ≠ "PM").
        const stats = hubStats(hub, await getHubQuestions(kind, hub.name));
        return renderOgCard({
          eyebrow: HUB_EYEBROW[kind],
          title: hubTitle(hub, roleNoun(stats.dominantRole)),
          meta: `${hub.count} real question${hub.count === 1 ? '' : 's'} with sample answers`,
        });
      }
    } catch {
      // fall through to the site card
    }
    return renderOgCard(SITE_OG_CARD);
  };
}
