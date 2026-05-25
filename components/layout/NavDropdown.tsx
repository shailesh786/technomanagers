'use client';


import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCourses } from '@/hooks/useCourses';
import { useRoles } from '@/hooks/useRoles';
import { useCategories } from '@/hooks/useCategories';
import { usePopularCompanies } from '@/hooks/useCompanies';
import type { Course } from '@/types';

function useHoverDropdown(delay = 100) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const enter = useCallback(() => {
    clearTimeout(timeout.current);
    setOpen(true);
  }, []);

  const leave = useCallback(() => {
    timeout.current = setTimeout(() => setOpen(false), delay);
  }, [delay]);

  useEffect(() => () => clearTimeout(timeout.current), []);

  return { open, setOpen, enter, leave };
}

/* ========== QUESTIONS DROPDOWN ========== */
export function QuestionsDropdown({ active }: { active: boolean }) {
  const { open, setOpen, enter, leave } = useHoverDropdown();
  const { data: roles = [] } = useRoles({ enabled: open });
  const { data: categories = [] } = useCategories({ enabled: open });
  const { data: popularCompanies = [] } = usePopularCompanies(8, open);

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <Link
        href="/questions"
        className={cn(
          'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        )}
        onClick={() => setOpen(false)}
      >
        Questions
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Link>

      {open && (
        <div
          className="absolute left-0 top-full pt-2 z-50 animate-in fade-in-0 duration-150"
          onMouseEnter={enter}
          onMouseLeave={leave}
        >
          <div className="w-[600px] rounded-xl border bg-popover shadow-lg p-5 flex gap-8">
            {/* Roles + Categories */}
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Browse by Role</p>
                <Link
                  href="/questions"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors hover:bg-accent/10"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  All Roles
                </Link>
                {roles.map((r) => (
                  <Link
                    key={r.id}
                    href={`/questions?role=${encodeURIComponent(r.name)}`}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-accent/10"
                  >
                    {r.name}
                  </Link>
                ))}
              </div>

              <div className="border-t" />

              <div className="space-y-1 max-h-64 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Browse by Category</p>
                {categories.length === 0 && (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground italic">No categories yet</p>
                )}
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/questions?category=${encodeURIComponent(cat.name)}`}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-accent/10"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Companies */}
            <div className="w-48 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Popular Companies</p>
              <div className="flex flex-wrap gap-2">
                {popularCompanies.map((c) => (
                  <Link
                    key={c.company_name}
                    href={`/questions?company=${encodeURIComponent(c.company_name)}`}
                    onClick={() => setOpen(false)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {c.company_name}
                  </Link>
                ))}
                {popularCompanies.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No companies yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== COURSES DROPDOWN ========== */
export function CoursesDropdown({ active }: { active: boolean }) {
  const { open, setOpen, enter, leave } = useHoverDropdown();
  const { data: courses } = useCourses({ enabled: open });

  const grouped = (courses || []).reduce<Record<string, Course[]>>((acc, c) => {
    const cat = c.category || 'Other';
    (acc[cat] = acc[cat] || []).push(c);
    return acc;
  }, {});

  const categoryOrder = ['Career', 'Interview Prep', 'Strategy', 'Program Management'];
  const orderedCategories = categoryOrder.filter((c) => c in grouped || c === 'Program Management');
  Object.keys(grouped).forEach((c) => { if (!orderedCategories.includes(c)) orderedCategories.push(c); });

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <Link
        href="/courses"
        className={cn(
          'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        )}
        onClick={() => setOpen(false)}
      >
        Courses
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Link>

      {open && (
        <div
          className="absolute left-0 top-full pt-2 z-50 animate-in fade-in-0 duration-150"
          onMouseEnter={enter}
          onMouseLeave={leave}
        >
          <div className="w-[480px] rounded-xl border bg-popover shadow-lg p-5 space-y-4">
            <div>
              <Link
                href="/courses"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold hover:bg-accent/10 transition-colors"
              >
                All Courses <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="border-t" />
            {orderedCategories.map((cat) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                {grouped[cat]?.length ? (
                  <div className="space-y-1">
                    {grouped[cat].map((course) => (
                      <a
                        key={course.id}
                        href={course.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-accent/10 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
                          {course.short_description && (
                            <p className="text-xs text-muted-foreground truncate">{course.short_description}</p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 text-xs text-muted-foreground italic">No courses yet</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== MOBILE EXPANDABLE SECTIONS ========== */
export function MobileQuestionsMenu({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: categories = [] } = useCategories({ enabled: expanded });
  const { data: popularCompanies = [] } = usePopularCompanies(8, expanded);

  return (
    <div>
      <div className="flex items-center">
        <Link
          href="/questions"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Questions
        </Link>
        <button onClick={() => setExpanded(!expanded)} className="p-2">
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
      {expanded && (
        <div className="pl-6 space-y-1 pb-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/questions?category=${encodeURIComponent(cat.name)}`}
              onClick={onClose}
              className="block px-3 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {cat.name}
            </Link>
          ))}
          <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Companies</p>
          <div className="flex flex-wrap gap-1.5 px-3">
            {popularCompanies.map((c) => (
              <Link
                key={c.company_name}
                href={`/questions?company=${encodeURIComponent(c.company_name)}`}
                onClick={onClose}
                className="px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground hover:bg-primary/10"
              >
                {c.company_name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileCoursesMenu({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: courses } = useCourses({ enabled: expanded });

  const grouped = (courses || []).reduce<Record<string, Course[]>>((acc, c) => {
    const cat = c.category || 'Other';
    (acc[cat] = acc[cat] || []).push(c);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center">
        <Link
          href="/courses"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Courses
        </Link>
        <button onClick={() => setExpanded(!expanded)} className="p-2">
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
      {expanded && (
        <div className="pl-6 space-y-2 pb-2">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase">{cat}</p>
              {items.map((course) => (
                <a
                  key={course.id}
                  href={course.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="block px-3 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {course.title}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
