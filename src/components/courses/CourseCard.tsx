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
      {/* Thumbnail/gradient */}
      <div className="h-40 bg-gradient-brand flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
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
