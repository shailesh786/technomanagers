/**
 * components/courses/CourseCard.tsx  —  Server Component ✅
 *
 * No 'use client' needed: pure display component. Receives a Course object
 * as a prop and renders static HTML. External <a> link, no state, no hooks.
 *
 * Changes from src/components/courses/CourseCard.tsx:
 * - Import path: `@/types` now resolves to root types/index.ts ✅
 * - <img> kept as-is (next/image migration deferred to Phase 5 SEO pass to
 *   avoid inadvertent visual changes from required width/height props)
 * - All content, logic, and visual design UNCHANGED.
 */

import Image from 'next/image';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/types';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <a
      href={course.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border bg-background overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Thumbnail/gradient — 16:9 so standard-ratio uploads render uncropped */}
      <div className="relative aspect-video bg-gradient-brand flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <BookOpen className="h-12 w-12 text-primary-foreground/80" />
        )}
      </div>

      <div className="p-5 space-y-3">
        {course.category && (
          <Badge variant="secondary" className="text-xs">{course.category}</Badge>
        )}
        <h3 className="font-heading font-bold text-lg group-hover:text-secondary transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{course.short_description}</p>
        <div className="flex items-center gap-2 text-sm font-medium text-secondary">
          Start Course <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </a>
  );
}
