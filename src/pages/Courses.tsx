import { Skeleton } from '@/components/ui/skeleton';
import { useCourses } from '@/hooks/useCourses';
import CourseCard from '@/components/courses/CourseCard';
import { BookOpen } from 'lucide-react';

export default function Courses() {
  const { data: courses, isLoading } = useCourses();

  return (
    <div className="container py-8">
      <div className="mb-8 space-y-2">
        <h1 className="font-heading font-extrabold text-3xl">Courses</h1>
        <p className="text-muted-foreground">Level up your PM skills with structured courses.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <Skeleton className="h-40 w-full" />
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
