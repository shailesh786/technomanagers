'use client';

/**
 * components/courses/CoursesPage.tsx  —  Client Component ✅
 *
 * Migrated from src/_vite-pages/Courses.tsx.
 * Changes:
 * - 'use client' added (uses TanStack Query hook)
 * - Hook import: @src/hooks/useCourses
 * - Component import: @/components/courses/CourseCard (migrated RSC)
 * - All logic, JSX, and visual design UNCHANGED.
 */

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourses } from '@/hooks/useCourses';
import CourseCard from '@/components/courses/CourseCard';
import { BookOpen } from 'lucide-react';

export default function CoursesPage() {
  const { data: courses, isLoading } = useCourses();

  return (
    <div className="container py-8">
      <div className="mb-8 space-y-3 max-w-3xl">
        <h1 className="font-heading font-extrabold text-3xl">PM Courses</h1>
        <p className="text-muted-foreground">Level up your PM skills with structured courses.</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every course here is self-paced and built from real product work — the frameworks, the
          interview patterns, and the AI skills hiring managers actually test for. Start with the
          course that matches your next milestone: breaking into product, preparing for interviews,
          or becoming the AI-first PM on your team. Each one pairs well with the free{' '}
          <Link href="/questions" className="text-secondary hover:text-primary transition-colors underline">
            interview question bank
          </Link>{' '}
          for practice, and with the live{' '}
          <Link href="/cohort" className="text-secondary hover:text-primary transition-colors underline">
            AI Product Builder Cohort
          </Link>{' '}
          when you want mentorship and a working product to show for it.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : courses?.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-lg text-muted-foreground">Courses coming soon! Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
