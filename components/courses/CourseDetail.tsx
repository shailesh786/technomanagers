/**
 * components/courses/CourseDetail.tsx — body of a /courses/[slug] page
 * (Server Component). Layout "1a / By the book" from the course-page design
 * handoff: content left, sticky enroll card right; single column below
 * 1072px with an inline enroll strip and a sticky bottom bar instead.
 *
 * Everything is in the server HTML — FAQ answers sit inside native
 * <details>, so they are crawlable while collapsed and need no client JS. The
 * curriculum shows module cards only (CurriculumGrid), never lesson titles. The only client island is the practice question cards (like /
 * save). Every Enroll button opens the Topmate product page in a new tab;
 * no price is shown on-site.
 */

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Star,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CourseCard from '@/components/courses/CourseCard';
import CourseOfferBar from '@/components/courses/CourseOfferBar';
import CourseOfferBox from '@/components/courses/CourseOfferBox';
import CourseProofToast from '@/components/courses/CourseProofToast';
import CurriculumGrid from '@/components/courses/CurriculumGrid';
import HubQuestionList from '@/components/questions/HubQuestionList';
import { proofLine, type CourseInstructor, type CourseOffer, type CoursePageContent } from '@/lib/course-pages';
import { hubHref } from '@/lib/hubs';
import type { Course, Question } from '@/types';

interface CourseDetailProps {
  page: CoursePageContent;
  /** The page's `courses` row — its external_url is the Topmate checkout. */
  course: Course;
  related: Course[];
  questions: Question[];
  /** Live offer from the admin Courses form, already filtered for expiry. */
  offer: CourseOffer | null;
}

const h2 = 'font-heading font-bold text-[22px] min-[1072px]:text-2xl leading-[1.25]';
const section = 'pt-12 grid scroll-mt-[130px]';
const card = 'rounded-xl border bg-background shadow-sm';

function InstructorAvatar({ instructor, sizes, className, alt = '' }: { instructor: CourseInstructor; sizes: string; className: string; alt?: string }) {
  const initials = instructor.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-brand font-heading font-bold text-primary-foreground ${className}`}>
      {instructor.photoUrl ? (
        <Image src={instructor.photoUrl} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}

function EnrollButton({ href, size, className }: { href: string; size?: 'lg'; className?: string }) {
  return (
    <Button asChild size={size} className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        Enroll Now <ArrowRight />
      </a>
    </Button>
  );
}

export default function CourseDetail({ page, course, related, questions, offer }: CourseDetailProps) {
  const checkoutUrl = page.checkoutUrl ?? course.external_url;
  const instructor = page.instructor;
  const proof = page.proof;
  const shortProof = proofLine(proof);
  const title = `${page.titleBefore}${page.titleLead}${page.titleRest}`;
  const subnav = [
    { href: '#top', label: 'Overview' },
    { href: '#curriculum', label: 'Curriculum' },
    { href: '#instructor', label: 'Instructor' },
    ...(page.reviews.length ? [{ href: '#reviews', label: 'Reviews' }] : []),
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <div>
      {offer && <CourseOfferBar offer={offer} checkoutUrl={checkoutUrl} />}
      {page.proofPoints && page.proofPoints.length > 0 && <CourseProofToast points={page.proofPoints} />}
      {/* Hero wash: the near-invisible brand gradient fading to white by 720px. */}
      <div
        style={{
          backgroundImage:
            'linear-gradient(180deg, hsl(var(--background) / 0) 0px, hsl(var(--background)) 720px), linear-gradient(135deg, hsl(220 82% 23% / 0.03), hsl(213 81% 51% / 0.06), hsl(195 100% 50% / 0.03))',
        }}
      >
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-start gap-12 px-5 pb-16 pt-6 min-[1072px]:px-8">
          <div className="min-w-0 flex-[1_1_600px]">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-secondary">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/courses" className="hover:text-secondary">Courses</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">{page.breadcrumb}</span>
            </nav>

            <header id="top" className="grid scroll-mt-[130px] gap-5 pb-10 pt-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {page.category}
                </span>
                <Badge variant="secondary">{page.badge}</Badge>
              </div>
              <h1 className="font-heading text-[34px] font-extrabold leading-[1.1] tracking-[-0.025em] [text-wrap:balance] min-[1072px]:text-5xl">
                {page.titleBefore}
                <span className="text-gradient-brand">{page.titleLead}</span>
                {page.titleRest}
              </h1>
              <p className="max-w-[640px] text-lg leading-[1.6] text-muted-foreground [text-wrap:pretty]">{page.headline}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                <InstructorAvatar instructor={instructor} sizes="28px" className="h-7 w-7 text-[10px]" />
                <span>
                  By{' '}
                  <a href="#instructor" className="font-semibold text-primary hover:text-secondary">
                    {instructor.name}
                  </a>
                </span>
              </div>

              {(proof.rating || proof.enrolled) && (
                <div className="flex flex-wrap gap-3">
                  {proof.rating && (
                    <div className={`${card} flex items-center gap-3 px-[18px] py-3`}>
                      <span className="font-heading text-[32px] font-extrabold leading-none tracking-[-0.02em]">{proof.rating}</span>
                      <div className="grid gap-1">
                        <span className="flex gap-0.5 text-warning" aria-label={`${proof.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
                          ))}
                        </span>
                        <span className="text-[13px] text-muted-foreground">{proof.ratingLabel}</span>
                      </div>
                    </div>
                  )}
                  {proof.enrolled && (
                    <div className={`${card} flex items-center gap-3 px-[18px] py-3`}>
                      <span className="font-heading text-[32px] font-extrabold leading-none tracking-[-0.02em]">{proof.enrolled}</span>
                      <div className="grid gap-1">
                        <Users className="h-4 w-4 text-secondary" aria-hidden />
                        <span className="text-[13px] text-muted-foreground">{proof.enrolledLabel}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] border-y">
                {page.facts.map((f) => (
                  <div key={f.label} className="grid gap-1 py-4">
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="font-heading text-[15px] font-semibold">{f.value}</dd>
                  </div>
                ))}
              </dl>

              <div className={`${card} flex flex-wrap items-center gap-x-6 gap-y-4 p-5 min-[1072px]:hidden`}>
                {offer && (
                  <div className="w-full">
                    <CourseOfferBox offer={offer} />
                  </div>
                )}
                <div className="grid flex-[1_1_200px] gap-0.5">
                  <span className="font-heading text-base font-bold">Enroll on Topmate</span>
                  <span className="text-[13px] text-muted-foreground">
                    See pricing and check out securely. Access is shared right after payment.
                  </span>
                </div>
                <EnrollButton href={checkoutUrl} size="lg" />
              </div>
            </header>

            <nav
              aria-label="On this page"
              className="scrollbar-none sticky top-16 z-10 flex min-h-[52px] items-center gap-6 overflow-x-auto border-b bg-background/95 text-sm font-medium backdrop-blur-[8px]"
            >
              {subnav.map((l) => (
                <a key={l.href} href={l.href} className="flex-none text-muted-foreground transition-colors hover:text-secondary">
                  {l.label}
                </a>
              ))}
            </nav>

            <section id="about-course" className={`${section} gap-4`}>
              <h2 className={h2}>About This Course</h2>
              {page.about.map((para) => (
                <p key={para} className="text-base leading-[1.75] [text-wrap:pretty]">{para}</p>
              ))}
            </section>

            <section id="learn" className={`${section} gap-6`}>
              <h2 className={h2}>What You&apos;ll Learn</h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 min-[1072px]:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                {page.outcomes.map((o) => (
                  <div key={o.title} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-none text-secondary" aria-hidden />
                    <div className="grid gap-1">
                      <h3 className="font-heading text-base font-semibold leading-[1.35]">{o.title}</h3>
                      <p className="text-sm leading-[1.6] text-muted-foreground">{o.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="curriculum" className={`${section} gap-5`}>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className={h2}>Course Curriculum</h2>
                <span className="text-sm text-muted-foreground">{page.modulesSummary}</span>
              </div>
              <CurriculumGrid modules={page.modules} unit={page.moduleUnit} />
              <div className={`${card} flex flex-wrap items-center gap-x-6 gap-y-4 bg-muted p-5`}>
                <div className="grid flex-[1_1_240px] gap-0.5">
                  <span className="flex items-center gap-2 font-heading text-base font-bold">
                    <Lock className="h-4 w-4 text-secondary" aria-hidden />
                    Unlock the full curriculum
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    Every lesson, case study and interview question opens on Topmate as soon as you enroll.
                  </span>
                </div>
                <EnrollButton href={checkoutUrl} size="lg" />
              </div>
            </section>

            <section id="audience" className={`${section} gap-5`}>
              <h2 className={h2}>Who This Course Is For</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
                <div className="grid content-start gap-3.5 rounded-xl border bg-background p-5">
                  <h3 className="font-heading text-base font-semibold">This course is for</h3>
                  <ul className="grid gap-3">
                    {page.forWho.map((w) => (
                      <li key={w} className="flex items-start gap-2.5 text-[15px] leading-[1.55]">
                        <Check className="mt-[3px] h-4 w-4 flex-none text-secondary" aria-hidden />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid content-start gap-3.5 rounded-xl border bg-muted p-5">
                  <h3 className="font-heading text-base font-semibold">It&apos;s not for</h3>
                  <ul className="grid gap-3">
                    {page.notFor.map((w) => (
                      <li key={w} className="flex items-start gap-2.5 text-[15px] leading-[1.55] text-slate-700">
                        <X className="mt-[3px] h-4 w-4 flex-none text-muted-foreground" aria-hidden />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section id="instructor" className={`${section} gap-5`}>
              <h2 className={h2}>Your Instructor</h2>
              <div className={`${card} flex flex-wrap items-start gap-5 p-5`}>
                <InstructorAvatar
                  instructor={instructor}
                  alt={instructor.name}
                  sizes="72px"
                  className="h-14 w-14 text-lg min-[1072px]:h-[72px] min-[1072px]:w-[72px] min-[1072px]:text-xl"
                />
                <div className="grid flex-[1_1_280px] gap-3">
                  <div className="grid gap-0.5">
                    <h3 className="font-heading text-lg font-bold">{instructor.name}</h3>
                    <span className="text-sm text-muted-foreground">{instructor.role}</span>
                  </div>
                  <p className="text-[15px] leading-[1.7] [text-wrap:pretty]">{instructor.bio}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {instructor.stats.map((s) => (
                      <span key={s.label}>
                        <strong className="font-heading text-foreground">{s.value}</strong> {s.label}
                      </span>
                    ))}
                    {instructor.links.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-secondary"
                      >
                        {l.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ))}
                    <Link href="/coaching" className="inline-flex items-center gap-1 text-secondary">
                      Book a 1:1 session <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {page.reviews.length > 0 && (
              <section id="reviews" className={`${section} gap-5`}>
                <h2 className={h2}>What Students Say</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
                  {page.reviews.map((r) => (
                    <figure key={r.name + r.role} className={`${card} grid content-between gap-3 p-5`}>
                      <blockquote className="text-[15px] leading-[1.7]">{r.quote}</blockquote>
                      <figcaption className="text-sm">
                        <strong>{r.name}</strong>
                        <span className="text-muted-foreground"> · {r.role}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {questions.length > 0 && (
              <section id="questions" className={`${section} gap-5`}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className={h2}>Practice With Real Interview Questions</h2>
                  <Link
                    href={hubHref('category', page.questionCategory)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-secondary"
                  >
                    View all <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <HubQuestionList questions={questions} className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4" />
              </section>
            )}

            <section id="faq" className={`${section} gap-3`}>
              <h2 className={h2}>Frequently Asked Questions</h2>
              <div className="grid">
                {page.faqs.map((f) => (
                  <details key={f.q} className="group border-b">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] [&::-webkit-details-marker]:hidden">
                      <h3 className="font-heading text-base font-semibold leading-[1.4]">{f.q}</h3>
                      <ChevronDown className="h-4 w-4 flex-none transition-transform duration-200 group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="max-w-[680px] pb-[18px] text-[15px] leading-[1.7] text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside id="enroll" aria-label="Enroll" className="sticky top-[88px] mt-12 hidden min-w-[300px] flex-[0_1_360px] min-[1072px]:block">
            <div className={`${card} overflow-hidden`}>
              {/* With an offer the card is too tall to stay fully visible while
                  sticky on laptop screens, so the coupon takes the
                  thumbnail's place. */}
              {!offer && (
                <div className="relative flex aspect-video items-center justify-center bg-gradient-brand">
                  {course.thumbnail_url ? (
                    <Image src={course.thumbnail_url} alt={title} fill sizes="360px" className="object-cover" />
                  ) : (
                    <BookOpen className="h-12 w-12 text-primary-foreground" aria-hidden />
                  )}
                </div>
              )}
              <div className="grid gap-4 p-5">
                <div className="grid gap-1">
                  <span className="font-heading text-lg font-bold leading-[1.3]">{page.breadcrumb}</span>
                  <span className="text-sm text-muted-foreground">{shortProof}</span>
                </div>
                {offer && <CourseOfferBox offer={offer} />}
                <div className="grid gap-2">
                  <EnrollButton href={checkoutUrl} size="lg" className="w-full" />
                  <div className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Opens Topmate for pricing and checkout
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="grid gap-3">
                  <div className="text-sm font-semibold">This course includes</div>
                  {page.includes.map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-start gap-2.5 text-sm leading-[1.45]">
                      <Icon className="mt-px h-4 w-4 flex-none text-secondary" aria-hidden />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky enroll bar — sticks to the viewport bottom while the
          page above it is in view. */}
      <div className="sticky bottom-0 z-40 flex items-center justify-between gap-3 border-t bg-background/[.97] px-5 py-3 shadow-[0_-4px_12px_rgba(15,23,42,.06)] backdrop-blur-[8px] min-[1072px]:hidden">
        <div className="grid min-w-0 leading-[1.3]">
          <span className="truncate font-heading text-[15px] font-bold">{page.breadcrumb}</span>
          <span className="text-xs text-muted-foreground">{shortProof}</span>
        </div>
        <EnrollButton href={checkoutUrl} />
      </div>

      {related.length > 0 && (
        <section className="border-t">
          <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-5 py-16 min-[1072px]:px-8">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold">Related Courses</h2>
              <Link href="/courses" className="flex items-center gap-1 text-sm text-secondary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {/* auto-fill, not auto-fit: a lone related course keeps card size instead of stretching full width. */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
              {related.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-gradient-brand py-16">
        <div className="mx-auto grid max-w-[672px] justify-items-center gap-5 px-5 text-center text-primary-foreground">
          <h2 className="font-heading text-[30px] font-bold leading-[1.2]">{page.ctaTitle}</h2>
          <p className="text-base opacity-85">{page.ctaSub}</p>
          <Button asChild size="lg" variant="secondary">
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
              Enroll Now <ArrowRight />
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
