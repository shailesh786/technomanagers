import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Search,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { heroTagTextColor } from '@/lib/hero';
import type { HeroItem } from '@/types';

/** Lucide glyphs available for the gradient image-fallback (see HERO_ICONS). */
export const HERO_GLYPHS: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  search: Search,
  video: Video,
  users: Users,
};

/** Resolves an item's stored icon slug to its Lucide component. */
export function heroGlyph(icon: string): LucideIcon {
  return HERO_GLYPHS[icon] ?? GraduationCap;
}

/**
 * The three-stop brand gradient (primary → secondary → accent), composed from
 * existing tokens — same stops as the `.text-gradient-brand` utility.
 */
export const HERO_FALLBACK_GRADIENT =
  'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 55%, hsl(var(--accent)) 100%)';

/**
 * One card of the Hero Priority Board. The whole card is a single link — the
 * CTA row is a text affordance, not a nested control. Used at both breakpoints:
 * mobile sizes are the defaults, desktop sizes kick in at `md:`.
 */
export default function HeroCard({
  item,
  className,
  imagePriority = false,
}: {
  item: HeroItem;
  className?: string;
  /** True for the first (LCP-candidate) card: preloads the image eagerly
   *  instead of next/image's default lazy loading. */
  imagePriority?: boolean;
}) {
  const navy = item.surface === 'navy';
  const Glyph = heroGlyph(item.icon);
  const isExternal = /^https?:\/\//i.test(item.cta_href);

  const card = (
    <>
      {/* Image block — 16:9 at every breakpoint */}
      <div className="relative aspect-video w-full overflow-hidden">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt=""
            fill
            priority={imagePriority}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-white/70"
            style={{ backgroundImage: HERO_FALLBACK_GRADIENT }}
          >
            <Glyph className="h-7 w-7 md:h-[34px] md:w-[34px]" strokeWidth={2} />
          </div>
        )}
        {item.tag_label && (
          <span
            className="absolute right-3 top-3 rounded-full px-2.5 py-1.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.11em] md:right-4 md:top-4 md:text-[9.5px]"
            style={{
              backgroundColor: item.tag_color,
              color: heroTagTextColor(item.tag_color),
            }}
          >
            {item.tag_label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-5 pb-[22px] md:p-6 md:pb-[26px]">
        {item.kind && (
          <span
            className={cn(
              'font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] md:text-[10px]',
              navy ? 'text-accent' : 'text-muted-foreground',
            )}
          >
            {item.kind}
          </span>
        )}
        <span
          className={cn(
            'font-heading text-[20px] font-bold leading-[1.2] tracking-[-0.016em] [text-wrap:pretty] md:text-[23px] md:tracking-[-0.018em]',
            navy ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          {item.title}
        </span>
        {item.subtitle && (
          <p
            className={cn(
              'font-body text-[13.5px] leading-[1.55] md:text-sm md:leading-[1.6]',
              navy ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {item.subtitle}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2.5 pt-4">
          <span
            className={cn(
              'font-body text-[12.5px] font-semibold md:text-[13px]',
              navy ? 'text-accent' : 'text-primary',
            )}
          >
            {item.meta}
          </span>
          {item.cta_label && (
            <span
              className={cn(
                'flex items-center gap-[7px] font-heading text-[13.5px] font-semibold',
                navy ? 'text-accent' : 'text-secondary',
              )}
            >
              {item.cta_label}
              <ArrowRight className="h-[15px] w-[15px]" strokeWidth={2} />
            </span>
          )}
        </div>
      </div>
    </>
  );

  const rootClass = cn(
    'flex flex-col overflow-hidden rounded-xl border border-border no-underline',
    // transition-shadow's default curve is cubic-bezier(.4,0,.2,1), per spec
    'shadow-sm transition-shadow duration-200 hover:shadow-md',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    navy ? 'bg-primary' : 'bg-background',
    className,
  );

  if (isExternal) {
    return (
      <a href={item.cta_href} target="_blank" rel="noopener noreferrer" className={rootClass}>
        {card}
      </a>
    );
  }
  return (
    <Link href={item.cta_href || '/'} className={rootClass}>
      {card}
    </Link>
  );
}
