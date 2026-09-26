import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RotatingRoleHeadline } from '@/components/home/RotatingRoleHeadline';

const pill =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 font-heading text-sm font-semibold shadow-sm ' +
  'transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-lg ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:w-auto';

/**
 * Homepage hero text block — rotating-role h1 (the page's only h1), sub line
 * and CTAs. The Hero Priority Board sits directly below.
 * Server component; only the headline hydrates.
 */
export default function HomeHero() {
  return (
    <section className="bg-gradient-hero-wash">
      <div className="container flex flex-col items-center pb-10 pt-8 text-center md:pb-10 md:pt-12">
        <RotatingRoleHeadline />

        <p className="mt-3 max-w-[600px] font-body text-base text-muted-foreground md:mt-4 md:text-lg md:leading-7">
          Crack your next interview with a live cohort, self-paced courses and 100+ real interview
          questions.
        </p>

        <div className="mt-6 flex w-full flex-col items-center gap-3 md:mt-7 md:w-auto md:flex-row md:gap-4">
          <Link href="/cohort" className={cn(pill, 'bg-primary text-primary-foreground')}>
            Join Next Cohort <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
          </Link>
          <Link href="/courses" className={cn(pill, 'border border-border bg-background text-foreground')}>
            Start Course
          </Link>
          <Link
            href="/questions"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 font-heading text-sm font-semibold text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Explore Questions <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
          </Link>
        </div>

      </div>
    </section>
  );
}
