/**
 * components/courses/CurriculumGrid.tsx — the course page's curriculum as
 * module cards (Server Component). Each card shows what the module covers,
 * its keyword tags and a locked lesson count; the lesson list itself is never
 * rendered, so the page sells the scope without giving away the study plan.
 * The highlight module (the strongest selling point) gets the brand gradient.
 */

import { Briefcase, Lock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseModule } from '@/lib/course-pages';

/**
 * A card spans both columns when it would otherwise sit alone on its row —
 * the highlight when it starts a row, or an odd last card — so the grid
 * never ends with a gap beside a lone card.
 */
function spansRow(modules: CourseModule[], i: number): boolean {
  if (i % 2 !== 0) return false;
  return Boolean(modules[i].highlight) || i === modules.length - 1;
}

// The lock icon already says "unlocked when you enroll", so the label is
// just what is behind it.
function lockLabel(m: CourseModule): string {
  if (m.lessons) return `${m.lessons} ${m.lessonNoun ?? (m.lessons === 1 ? 'lesson' : 'lessons')}`;
  return 'Session recordings';
}

export default function CurriculumGrid({ modules, unit }: { modules: CourseModule[]; unit: string }) {
  return (
    <ol className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
      {modules.map((m, i) => {
        const featured = Boolean(m.highlight);
        return (
          <li
            key={m.title}
            className={cn(
              'grid content-start gap-3 rounded-xl border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md',
              featured ? 'border-transparent bg-gradient-brand text-primary-foreground' : 'bg-background',
              spansRow(modules, i) && 'min-[640px]:col-span-2',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-8 w-8 flex-none items-center justify-center rounded-full font-heading text-[13px] font-bold',
                  featured ? 'bg-primary-foreground text-primary' : 'bg-gradient-brand text-primary-foreground',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="grid gap-0.5">
                <span className={cn('text-xs', featured ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                  {unit} {i + 1}
                </span>
                <h3 className="font-heading text-base font-semibold leading-[1.35]">{m.title}</h3>
              </div>
            </div>

            <p className={cn('text-sm leading-[1.6]', featured ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
              {m.summary}
            </p>

            {m.caseStudies && m.caseStudies.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn('text-xs font-medium', featured ? 'text-primary-foreground/75' : 'text-foreground')}>
                  Case studies:
                </span>
                {m.caseStudies.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary"
                  >
                    <Briefcase className="h-3 w-3" aria-hidden />
                    {c}
                  </span>
                ))}
              </div>
            )}

            {m.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
                {m.tags.map((t) => (
                  <li
                    key={t}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs',
                      featured ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}

            <div
              className={cn(
                'flex items-center gap-1.5 text-[13px] font-medium',
                featured ? 'text-accent' : 'text-muted-foreground',
              )}
            >
              {m.certificate ? (
                <>
                  <Shield className="h-3.5 w-3.5 text-secondary" aria-hidden />
                  Certificate included
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  {lockLabel(m)}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
