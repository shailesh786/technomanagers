'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, LayoutDashboard, BookOpen, Users, HelpCircle, GraduationCap, ArrowLeft, Mail, Download, Search, ChevronLeft, ChevronRight, Loader2, CloudUpload, X, ShieldAlert, Tags, Calendar, Building2, GalleryHorizontalEnd, Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AdminModeration from '@/components/admin/AdminModeration';
import { useFlaggedCount } from '@/hooks/useModeration';
import { useAllRoles, useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '@/hooks/useRoles';
import { useAllCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useCompaniesWithCounts, useAllCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from '@/hooks/useCompanies';
import { useAllHeroSlides, useCreateHeroSlide, useUpdateHeroSlide, useDeleteHeroSlide, type HeroSlideInput } from '@/hooks/useHeroSlides';
import { useCohortSettings, useUpdateCohortSettings } from '@/hooks/useCohortSettings';
import CompanyMultiSelect from '@/components/admin/CompanyMultiSelect';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import * as XLSX from 'xlsx';
import { ImageUpload, uploadImageToBucket } from '@/components/admin/ImageUpload';
import type { Question, Course, CoachingService, Profile, Event } from '@/types';

const supabase = createSupabaseBrowserClient();

type AdminTab = 'questions' | 'courses' | 'coaching' | 'events' | 'moderation' | 'users' | 'waitlist' | 'roles' | 'categories' | 'companies' | 'homepage' | 'cohort';

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>('questions');
  const { data: flaggedCount = 0 } = useFlaggedCount();

  const tabs = [
    { id: 'homepage' as const, label: 'Homepage Hero', icon: GalleryHorizontalEnd },
    { id: 'cohort' as const, label: 'Cohort', icon: Rocket },
    { id: 'questions' as const, label: 'Questions', icon: HelpCircle },
    { id: 'roles' as const, label: 'Roles', icon: Tags },
    { id: 'categories' as const, label: 'Categories', icon: Tags },
    { id: 'companies' as const, label: 'Companies', icon: Building2 },
    { id: 'courses' as const, label: 'Courses', icon: GraduationCap },
    { id: 'coaching' as const, label: 'Coaching', icon: BookOpen },
    { id: 'events' as const, label: 'Events', icon: Calendar },
    { id: 'moderation' as const, label: 'Moderation', icon: ShieldAlert, badge: flaggedCount },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'waitlist' as const, label: 'Waitlist', icon: Mail },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 p-4 space-y-1 hidden md:flex flex-col">
        <Link href="/" className="flex items-center gap-2 mb-4 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Site
        </Link>
        <div className="flex items-center gap-2 mb-4 px-2">
          <LayoutDashboard className="h-5 w-5 text-secondary" />
          <span className="font-heading font-bold">Admin</span>
        </div>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {'badge' in t && (t as any).badge > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                {(t as any).badge}
              </span>
            )}
          </button>
        ))}
      </aside>

      {/* Mobile tabs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex z-50">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs ${
              tab === t.id ? 'text-secondary' : 'text-muted-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-6 pb-20 md:pb-6 overflow-auto">
        {tab === 'homepage' && <AdminHeroSlides />}
        {tab === 'cohort' && <AdminCohortSettings />}
        {tab === 'questions' && <AdminQuestions />}
        {tab === 'roles' && <AdminRoles />}
        {tab === 'categories' && <AdminCategories />}
        {tab === 'companies' && <AdminCompanies />}
        {tab === 'courses' && <AdminCourses />}
        {tab === 'coaching' && <AdminCoaching />}
        {tab === 'events' && <AdminEvents />}
        {tab === 'moderation' && <AdminModeration />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'waitlist' && <AdminWaitlist />}
      </main>
    </div>
  );
}

/* ===================== QUESTIONS ===================== */
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
const DIFFICULTY_ORDER: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

type SortKey = 'created_at' | 'question_text' | 'difficulty' | 'status';
type SortDir = 'asc' | 'desc';

function AdminMultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = searchable && search ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase())) : options;
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
          selected.length > 0 ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-muted'
        }`}
      >
        {label}{selected.length > 0 && ` (${selected.length})`}
        {selected.length > 0 && (
          <X
            className="h-3 w-3 ml-0.5"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
          />
        )}
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 min-w-[220px] bg-popover border rounded-lg shadow-lg p-2 max-h-72 overflow-auto">
          {searchable && (
            <Input
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs mb-2"
            />
          )}
          {filtered.length === 0 && <p className="text-xs text-muted-foreground p-2">No options</p>}
          {filtered.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminQuestions() {
  const queryClient = useQueryClient();
  const { data: rolesList = [] } = useAllRoles();
  const roleNames = rolesList.map((r) => r.name);
  const { data: categoriesList = [] } = useAllCategories();
  const categoryOptions = categoriesList.map((c) => c.name);

  // Filters
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Sort & pagination
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedRoles, selectedCategories, selectedCompanies, selectedDifficulties, statusFilter, search, sortKey, sortDir, pageSize]);

  // Total count (unfiltered) for the heading
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['admin-questions-total'],
    queryFn: async () => {
      const { count, error } = await supabase.from('questions').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // All companies for the company filter (dynamic, includes inactive + all questions)
  const { data: allCompaniesWithCounts = [] } = useCompaniesWithCounts(true);
  const allCompanies = allCompaniesWithCounts.map((c) => c.company_name);

  // Filtered + paginated query
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-questions', { selectedRoles, selectedCategories, selectedCompanies, selectedDifficulties, statusFilter, search, sortKey, sortDir, page, pageSize }],
    queryFn: async () => {
      let q = supabase.from('questions').select('*', { count: 'exact' });

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (selectedDifficulties.length > 0) q = q.in('difficulty', selectedDifficulties);
      if (selectedCategories.length > 0) {
        q = q.or(selectedCategories.map((c) => `category.cs.{${c}}`).join(','));
      }
      if (selectedCompanies.length > 0) {
        q = q.or(selectedCompanies.map((c) => `company.cs.{${c}}`).join(','));
      }
      if (selectedRoles.length > 0) {
        q = q.or(selectedRoles.map((r) => `tags.cs.{${r}}`).join(','));
      }
      if (search) q = q.ilike('question_text', `%${search}%`);

      // Sort: difficulty needs special order — fetch and sort client-side for that one only.
      if (sortKey === 'difficulty') {
        q = q.order('created_at', { ascending: false });
      } else {
        q = q.order(sortKey, { ascending: sortDir === 'asc' });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      let rows = (data || []) as Question[];
      if (sortKey === 'difficulty') {
        rows = [...rows].sort((a, b) => {
          const av = DIFFICULTY_ORDER[a.difficulty || ''] || 99;
          const bv = DIFFICULTY_ORDER[b.difficulty || ''] || 99;
          return sortDir === 'asc' ? av - bv : bv - av;
        });
      }
      return { rows, count: count || 0 };
    },
  });

  const questions = result?.rows || [];
  const filteredCount = result?.count || 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions-total'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Question deleted');
    },
  });

  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);

  const hasFilters =
    selectedRoles.length > 0 ||
    selectedCategories.length > 0 ||
    selectedCompanies.length > 0 ||
    selectedDifficulties.length > 0 ||
    statusFilter !== 'all' ||
    search.length > 0;

  const clearAll = () => {
    setSelectedRoles([]);
    setSelectedCategories([]);
    setSelectedCompanies([]);
    setSelectedDifficulties([]);
    setStatusFilter('all');
    setSearchInput('');
    setSearch('');
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'created_at' ? 'desc' : 'asc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-heading font-bold text-xl">
          Manage Questions {hasFilters ? `(${filteredCount} of ${totalCount})` : `(${totalCount})`}
        </h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={() => setEditQuestion(null)}>
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
              <DialogDescription>Fill in the question details below.</DialogDescription>
            </DialogHeader>
            <QuestionForm question={editQuestion} onClose={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <AdminMultiSelect
          label="Role"
          options={roleNames}
          selected={selectedRoles}
          onChange={setSelectedRoles}
        />
        <AdminMultiSelect
          label="Category"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
        <AdminMultiSelect
          label="Company"
          options={allCompanies}
          selected={selectedCompanies}
          onChange={setSelectedCompanies}
          searchable
        />
        <AdminMultiSelect
          label="Difficulty"
          options={DIFFICULTY_OPTIONS}
          selected={selectedDifficulties}
          onChange={setSelectedDifficulties}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
          className={`h-9 px-3 rounded-lg border text-xs font-medium ${statusFilter !== 'all' ? 'bg-primary/10 border-primary text-primary' : 'bg-background'}`}
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <div className="flex-1 min-w-[180px] flex items-center gap-2 ml-auto">
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
            >
              Clear all filters
            </button>
          )}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search questions..."
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('question_text')}>
                    Question{sortIndicator('question_text')}
                  </th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Companies</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Role</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('difficulty')}>
                    Difficulty{sortIndicator('difficulty')}
                  </th>
                  <th className="text-left p-3 font-medium hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status{sortIndicator('status')}
                  </th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No questions match your filters.</td></tr>
                )}
                {questions.map((q) => {
                  const qRoles = (q.tags || []).filter((t) => roleNames.includes(t));
                  return (
                    <tr key={q.id} className="border-t">
                      <td className="p-3 max-w-[300px]">
                        <span className="line-clamp-2 text-sm">{q.question_text}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">{q.company?.slice(0, 2).map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}</div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">{q.category?.slice(0, 2).map((c) => <span key={c} className="text-xs text-muted-foreground">{c}</span>)}</div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {qRoles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {qRoles.map((r) => (
                              <span
                                key={r}
                                title={r}
                                className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 max-w-[120px] truncate"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden lg:table-cell text-xs">{q.difficulty}</td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant={q.status === 'published' ? 'default' : 'outline'}>{q.status}</Badge>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => { setEditQuestion(q); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete question?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(q.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 px-2 rounded border bg-background text-xs"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span>
                {filteredCount === 0
                  ? '0 questions'
                  : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filteredCount)} of ${filteredCount}`}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2">Page {page} of {totalPages}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Fallback list — only used if no categories exist in DB yet (admin filter table column)
const CATEGORY_OPTIONS: string[] = [];

function QuestionForm({ question, onClose }: { question: Question | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: rolesList = [] } = useAllRoles();
  const roleNames = rolesList.map((r) => r.name);
  const { data: categoriesList = [] } = useAllCategories();

  // Split incoming tags into role-tags vs free-text tags
  const initialTags = question?.tags || [];
  const initialSelectedRoles = initialTags.filter((t) => roleNames.includes(t));
  // Backfill: if legacy `role` column exists and isn't already in tags, include it
  if (question?.role && !initialSelectedRoles.includes(question.role) && roleNames.includes(question.role)) {
    initialSelectedRoles.push(question.role);
  }
  const initialFreeTags = initialTags.filter((t) => !roleNames.includes(t)).join(', ');

  const [form, setForm] = useState({
    question_text: question?.question_text || '',
    company: question?.company || [],
    categories: question?.category || [] as string[],
    tags: initialFreeTags,
    selectedRoles: initialSelectedRoles,
    difficulty: question?.difficulty || 'Medium',
    sample_answer: question?.sample_answer || '',
    status: question?.status || 'published',
  });

  // Re-sync split when roles list arrives async (only on mount of roles)
  useEffect(() => {
    if (!question || roleNames.length === 0) return;
    const tags = question.tags || [];
    const sel = tags.filter((t) => roleNames.includes(t));
    if (question.role && !sel.includes(question.role) && roleNames.includes(question.role)) sel.push(question.role);
    setForm((prev) => ({
      ...prev,
      selectedRoles: sel,
      tags: tags.filter((t) => !roleNames.includes(t)).join(', '),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesList.length]);

  const toggleCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const toggleRole = (name: string) => {
    setForm((prev) => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(name)
        ? prev.selectedRoles.filter((r) => r !== name)
        : [...prev.selectedRoles, name],
    }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Merge free-text tags + selected roles, dedupe
      const freeTags = form.tags.split(',').map((s) => s.trim()).filter(Boolean);
      const mergedTags = Array.from(new Set([...freeTags, ...form.selectedRoles]));
      // Keep `role` column populated with first selected role for legacy compatibility
      const primaryRole = form.selectedRoles[0] || null;
      const payload = {
        question_text: form.question_text,
        company: form.company,
        category: form.categories,
        tags: mergedTags,
        difficulty: form.difficulty,
        role: primaryRole,
        sample_answer: form.sample_answer || null,
        status: form.status,
      };
      if (question) {
        const { error } = await supabase.from('questions').update(payload).eq('id', question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('questions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'counts'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Bust the ISR cache so the homepage reflects the change immediately
      // instead of waiting up to 5 minutes for the revalidate window.
      fetch('/api/revalidate/questions', { method: 'POST' }).catch(() => {});
      toast.success(question ? 'Question updated' : 'Question added');
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Question Text *</label>
        <Textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} rows={3} />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Companies (comma-separated)</label>
        <CompanyMultiSelect
          value={form.company}
          onChange={(v) => setForm({ ...form, company: v })}
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Categories</label>
        <div className="flex flex-wrap gap-2">
          {categoriesList.map(c => {
            const checked = form.categories.includes(c.name);
            const inactive = !c.is_active;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.name)}
                title={inactive ? 'Inactive — hidden from public filters' : c.name}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  checked
                    ? 'bg-primary text-primary-foreground border-primary'
                    : inactive
                      ? 'bg-muted/40 text-muted-foreground border-dashed border-border opacity-60'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                }`}
              >
                {c.name}{inactive && <span className="ml-1 text-[10px]">(inactive)</span>}
              </button>
            );
          })}
          {/* Orphaned categories — present on the question but not in the categories table */}
          {form.categories
            .filter((cat) => !categoriesList.some((c) => c.name === cat))
            .map((cat) => (
              <button
                key={`orphan-${cat}`}
                type="button"
                onClick={() => toggleCategory(cat)}
                title="Unknown category — not in the categories table"
                className="px-3 py-1 rounded-full text-xs font-medium border border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                Unknown: {cat}
              </button>
            ))}
          {categoriesList.length === 0 && (
            <p className="text-xs text-muted-foreground">No categories configured. Add some in the Categories tab.</p>
          )}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Roles</label>
        <div className="grid grid-cols-2 gap-2">
          {rolesList.filter((r) => r.is_active).map((r) => (
            <label key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={form.selectedRoles.includes(r.name)}
                onChange={() => toggleRole(r.name)}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              {r.name}
            </label>
          ))}
        </div>
        {rolesList.length === 0 && (
          <p className="text-xs text-muted-foreground">No roles configured. Add some in the Roles tab.</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Tags (comma-separated, non-role)</label>
        <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="AI, Consumer, B2B" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Difficulty</label>
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full h-9 rounded-lg border bg-background px-3 text-sm">
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Status</label>
          <div className="flex items-center gap-2 h-9">
            <Switch checked={form.status === 'published'} onCheckedChange={(c) => setForm({ ...form, status: c ? 'published' : 'draft' })} />
            <span className="text-sm">{form.status === 'published' ? 'Published' : 'Draft'}</span>
          </div>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Sample Answer</label>
        <Textarea value={form.sample_answer} onChange={(e) => setForm({ ...form, sample_answer: e.target.value })} rows={5} />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.question_text} className="flex-1">
          {question ? 'Update' : 'Add'} Question
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

/* ===================== ROLES MANAGEMENT ===================== */
function AdminRoles() {
  const { data: roles = [], isLoading } = useAllRoles();
  const createMut = useCreateRole();
  const updateMut = useUpdateRole();
  const deleteMut = useDeleteRole();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; name: string; display_order: number } | null>(null);

  const openNew = () => { setEditing({ name: '', display_order: roles.length + 1 }); setShowForm(true); };
  const openEdit = (r: { id: string; name: string; display_order: number | null }) => {
    setEditing({ id: r.id, name: r.name, display_order: r.display_order ?? 0 });
    setShowForm(true);
  };

  const submit = async () => {
    if (!editing || !editing.name.trim()) return;
    try {
      if (editing.id) {
        await updateMut.mutateAsync({ id: editing.id, name: editing.name.trim(), display_order: editing.display_order });
        toast.success('Role updated. Note: existing questions tagged with the old name keep the old tag.');
      } else {
        await createMut.mutateAsync({ name: editing.name.trim(), display_order: editing.display_order });
        toast.success('Role added');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = (r: { id: string; is_active: boolean | null }) => {
    updateMut.mutate(
      { id: r.id, is_active: !r.is_active },
      { onSuccess: () => toast.success(r.is_active ? 'Role deactivated' : 'Role activated') },
    );
  };

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Role deleted'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading font-extrabold text-2xl">Roles</h2>
          <p className="text-sm text-muted-foreground">Manage role options for filtering and tagging questions.</p>
        </div>
        <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit Role' : 'Add Role'}</DialogTitle>
              <DialogDescription>
                {editing?.id ? 'Renaming only updates the filter label. Questions tagged with the old name keep the old tag.' : 'Create a new role option.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Role Name *</label>
                <Input value={editing?.name || ''} onChange={(e) => setEditing((p) => p && { ...p, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Display Order</label>
                <Input
                  type="number"
                  value={editing?.display_order ?? 0}
                  onChange={(e) => setEditing((p) => p && { ...p, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!editing?.name.trim()}>{editing?.id ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium w-24">Order</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.display_order ?? 0}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {r.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete role?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deleting this role will remove it from filter options. Questions already tagged with this role will keep the tag in their data. Are you sure?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No roles yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== HOMEPAGE HERO SLIDES ===================== */
type HeroSlideForm = {
  id?: string;
  title: string;
  highlight: string;
  description: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  display_order: number;
};

const EMPTY_HERO_FORM = (order: number): HeroSlideForm => ({
  title: '',
  highlight: '',
  description: '',
  primary_cta_label: '',
  primary_cta_href: '',
  secondary_cta_label: '',
  secondary_cta_href: '',
  display_order: order,
});

function AdminHeroSlides() {
  const { data: slides = [], isLoading } = useAllHeroSlides();
  const createMut = useCreateHeroSlide();
  const updateMut = useUpdateHeroSlide();
  const deleteMut = useDeleteHeroSlide();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HeroSlideForm | null>(null);

  // Flush the homepage's cached hero slideshow so changes appear immediately.
  const revalidateHero = async () => {
    try {
      await fetch('/api/revalidate/hero', { method: 'POST' });
    } catch {
      /* non-fatal: the 5-minute ISR window will pick it up anyway */
    }
  };

  const openNew = () => { setEditing(EMPTY_HERO_FORM(slides.length + 1)); setShowForm(true); };
  const openEdit = (s: typeof slides[number]) => {
    setEditing({
      id: s.id,
      title: s.title,
      highlight: s.highlight ?? '',
      description: s.description,
      primary_cta_label: s.primary_cta_label ?? '',
      primary_cta_href: s.primary_cta_href ?? '',
      secondary_cta_label: s.secondary_cta_label ?? '',
      secondary_cta_href: s.secondary_cta_href ?? '',
      display_order: s.display_order ?? 0,
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!editing || !editing.title.trim() || !editing.description.trim()) return;
    const payload: HeroSlideInput = {
      title: editing.title.trim(),
      highlight: editing.highlight.trim() || null,
      description: editing.description.trim(),
      primary_cta_label: editing.primary_cta_label.trim() || null,
      primary_cta_href: editing.primary_cta_href.trim() || null,
      secondary_cta_label: editing.secondary_cta_label.trim() || null,
      secondary_cta_href: editing.secondary_cta_href.trim() || null,
      display_order: editing.display_order,
    };
    try {
      if (editing.id) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success('Slide updated');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Slide added');
      }
      await revalidateHero();
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = (s: typeof slides[number]) => {
    updateMut.mutate(
      { id: s.id, is_active: !s.is_active },
      {
        onSuccess: async () => {
          await revalidateHero();
          toast.success(s.is_active ? 'Slide hidden' : 'Slide shown');
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, {
      onSuccess: async () => { await revalidateHero(); toast.success('Slide deleted'); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading font-extrabold text-2xl">Homepage Hero</h2>
          <p className="text-sm text-muted-foreground">
            Configure the homepage hero slideshow. With no active slides, the homepage shows the default banner.
            The optional &ldquo;highlight&rdquo; phrase is shown in the brand gradient within the title.
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Slide</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit Slide' : 'Add Slide'}</DialogTitle>
              <DialogDescription>
                Title and description are required. Each CTA button shows only if both its label and link are set.
                Links can be internal (e.g. <code>/questions</code>) or external (e.g. <code>https://...</code>).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Title *</label>
                <Input value={editing?.title || ''} onChange={(e) => setEditing((p) => p && { ...p, title: e.target.value })} placeholder="Crack Your Next Product Management Interview" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Highlight phrase (optional)</label>
                <Input value={editing?.highlight || ''} onChange={(e) => setEditing((p) => p && { ...p, highlight: e.target.value })} placeholder="Product Management" />
                <p className="text-xs text-muted-foreground mt-1">Must appear within the title to be highlighted.</p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description *</label>
                <Textarea value={editing?.description || ''} onChange={(e) => setEditing((p) => p && { ...p, description: e.target.value })} rows={2} placeholder="Practice with real interview questions..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Primary button label</label>
                  <Input value={editing?.primary_cta_label || ''} onChange={(e) => setEditing((p) => p && { ...p, primary_cta_label: e.target.value })} placeholder="Explore Questions" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Primary button link</label>
                  <Input value={editing?.primary_cta_href || ''} onChange={(e) => setEditing((p) => p && { ...p, primary_cta_href: e.target.value })} placeholder="/questions" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Secondary button label</label>
                  <Input value={editing?.secondary_cta_label || ''} onChange={(e) => setEditing((p) => p && { ...p, secondary_cta_label: e.target.value })} placeholder="View Courses" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Secondary button link</label>
                  <Input value={editing?.secondary_cta_href || ''} onChange={(e) => setEditing((p) => p && { ...p, secondary_cta_href: e.target.value })} placeholder="/courses" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Display Order</label>
                <Input
                  type="number"
                  value={editing?.display_order ?? 0}
                  onChange={(e) => setEditing((p) => p && { ...p, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!editing?.title.trim() || !editing?.description.trim()}>{editing?.id ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium w-20">Order</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slides.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>
                  </td>
                  <td className="px-4 py-2">{s.display_order ?? 0}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete slide?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the slide from the homepage hero. Are you sure?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {slides.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No slides configured — the homepage shows the default banner.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== COHORT SETTINGS ===================== */
function AdminCohortSettings() {
  const { data: settings, isLoading } = useCohortSettings();
  const updateMut = useUpdateCohortSettings();
  const [applyUrl, setApplyUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Seed the form once the settings row loads.
  useEffect(() => {
    if (!initialized && settings) {
      setApplyUrl(settings.apply_url ?? '');
      setWhatsappUrl(settings.whatsapp_url ?? '');
      setInitialized(true);
    }
  }, [settings, initialized]);

  const save = async () => {
    if (!applyUrl.trim() || !whatsappUrl.trim()) return;
    try {
      await updateMut.mutateAsync({ apply_url: applyUrl.trim(), whatsapp_url: whatsappUrl.trim() });
      toast.success('Cohort links updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="font-heading font-extrabold text-2xl">Cohort Page</h2>
        <p className="text-sm text-muted-foreground">
          Configure the &ldquo;Apply Now&rdquo; and &ldquo;Ask on WhatsApp&rdquo; button links on the cohort page.
          If left unset, the page falls back to the built-in defaults.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-xl border p-5 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Apply Now link</label>
            <Input
              value={applyUrl}
              onChange={(e) => setApplyUrl(e.target.value)}
              placeholder="https://share-na2.hsforms.com/..."
            />
            <p className="text-xs text-muted-foreground mt-1">The application form / signup URL.</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Ask on WhatsApp link</label>
            <Input
              value={whatsappUrl}
              onChange={(e) => setWhatsappUrl(e.target.value)}
              placeholder="https://api.whatsapp.com/send/?phone=..."
            />
            <p className="text-xs text-muted-foreground mt-1">The WhatsApp chat link (wa.me or api.whatsapp.com).</p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={!applyUrl.trim() || !whatsappUrl.trim() || updateMut.isPending}
            >
              {updateMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== CATEGORIES MANAGEMENT ===================== */
function AdminCategories() {
  const { data: categories = [], isLoading } = useAllCategories();
  const queryClient = useQueryClient();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; name: string; display_order: number; is_active: boolean; originalName?: string } | null>(null);
  const [renameAlsoUpdateQuestions, setRenameAlsoUpdateQuestions] = useState(false);
  const [deleteAlsoRemoveFromQuestions, setDeleteAlsoRemoveFromQuestions] = useState(false);

  const { data: counts = {} } = useQuery({
    queryKey: ['categories', 'question-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('category').eq('status', 'published');
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((q: { category: string[] | null }) => {
        (q.category || []).forEach((c) => { map[c] = (map[c] || 0) + 1; });
      });
      return map;
    },
  });

  const openNew = () => {
    const nextOrder = (categories.reduce((m, c) => Math.max(m, c.display_order ?? 0), 0)) + 1;
    setEditing({ name: '', display_order: nextOrder, is_active: true });
    setRenameAlsoUpdateQuestions(false);
    setShowForm(true);
  };
  const openEdit = (c: { id: string; name: string; display_order: number | null; is_active: boolean | null }) => {
    setEditing({ id: c.id, name: c.name, display_order: c.display_order ?? 0, is_active: c.is_active ?? true, originalName: c.name });
    setRenameAlsoUpdateQuestions(false);
    setShowForm(true);
  };

  const submit = async () => {
    if (!editing) return;
    const trimmed = editing.name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      toast.error('Name must be 2–50 characters');
      return;
    }
    const dup = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing.id,
    );
    if (dup) {
      toast.error('A category with this name already exists');
      return;
    }

    try {
      if (editing.id) {
        await updateMut.mutateAsync({
          id: editing.id,
          name: trimmed,
          display_order: editing.display_order,
          is_active: editing.is_active,
        });
        if (renameAlsoUpdateQuestions && editing.originalName && editing.originalName !== trimmed) {
          const oldName = editing.originalName;
          const { data: qs, error: qErr } = await supabase
            .from('questions')
            .select('id, category')
            .contains('category', [oldName]);
          if (qErr) throw qErr;
          await Promise.all(
            (qs || []).map((q) => {
              const next = (q.category || []).map((c) => (c === oldName ? trimmed : c));
              return supabase.from('questions').update({ category: next }).eq('id', q.id);
            }),
          );
          queryClient.invalidateQueries({ queryKey: ['questions'] });
          queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
          toast.success(`Category updated. ${qs?.length || 0} question(s) re-tagged.`);
        } else {
          toast.success('Category updated');
        }
      } else {
        await createMut.mutateAsync({ name: trimmed, display_order: editing.display_order, is_active: editing.is_active });
        toast.success('Category added');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = (c: { id: string; is_active: boolean | null }) => {
    updateMut.mutate(
      { id: c.id, is_active: !c.is_active },
      { onSuccess: () => toast.success(c.is_active ? 'Category deactivated' : 'Category activated') },
    );
  };

  const handleDelete = async (c: { id: string; name: string }) => {
    try {
      if (deleteAlsoRemoveFromQuestions) {
        const { data: qs, error: qErr } = await supabase
          .from('questions')
          .select('id, category')
          .contains('category', [c.name]);
        if (qErr) throw qErr;
        await Promise.all(
          (qs || []).map((q) =>
            supabase.from('questions').update({ category: (q.category || []).filter((x) => x !== c.name) }).eq('id', q.id),
          ),
        );
        queryClient.invalidateQueries({ queryKey: ['questions'] });
        queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      }
      await deleteMut.mutateAsync(c.id);
      toast.success('Category deleted');
      setDeleteAlsoRemoveFromQuestions(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isRename = !!editing?.id && editing.originalName !== editing.name.trim() && !!editing.originalName;
  const renameAffectedCount = isRename && editing?.originalName ? counts[editing.originalName] || 0 : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading font-extrabold text-2xl">Manage Categories ({categories.length})</h2>
          <p className="text-sm text-muted-foreground">Manage category options for filtering and tagging questions.</p>
        </div>
        <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditing(null); setRenameAlsoUpdateQuestions(false); } }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
              <DialogDescription>
                {editing?.id ? 'Renaming only updates the filter label by default.' : 'Create a new category option.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Category Name *</label>
                <Input
                  value={editing?.name || ''}
                  onChange={(e) => setEditing((p) => p && { ...p, name: e.target.value })}
                  placeholder="e.g. Product Strategy"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Display Order</label>
                <Input
                  type="number"
                  value={editing?.display_order ?? 0}
                  onChange={(e) => setEditing((p) => p && { ...p, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.is_active ?? true}
                  onCheckedChange={(v) => setEditing((p) => p && { ...p, is_active: v })}
                />
                <span className="text-sm">{editing?.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {isRename && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Renaming &ldquo;{editing?.originalName}&rdquo; &rarr; &ldquo;{editing?.name.trim()}&rdquo;
                  </p>
                  <p className="text-muted-foreground">
                    Existing questions tagged with the old name will still reference &ldquo;{editing?.originalName}&rdquo; unless you update them.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={renameAlsoUpdateQuestions}
                      onChange={(e) => setRenameAlsoUpdateQuestions(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Also update all existing questions ({renameAffectedCount} affected)
                  </label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!editing?.name.trim() || createMut.isPending || updateMut.isPending}>
                {editing?.id ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium w-24">Order</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium w-24">Questions</th>
                <th className="px-4 py-2 font-medium w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.display_order ?? 0}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{counts[c.name] || 0}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog onOpenChange={(o) => { if (!o) setDeleteAlsoRemoveFromQuestions(false); }}>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete category &ldquo;{c.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {(counts[c.name] || 0) === 0
                              ? 'No questions are using this category.'
                              : `${counts[c.name]} question(s) are tagged with this category. Consider deactivating instead — it hides the category from public filters while keeping data intact.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        {(counts[c.name] || 0) > 0 && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer px-1">
                            <input
                              type="checkbox"
                              checked={deleteAlsoRemoveFromQuestions}
                              onChange={(e) => setDeleteAlsoRemoveFromQuestions(e.target.checked)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            Also remove &ldquo;{c.name}&rdquo; from all questions
                          </label>
                        )}
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c)} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No categories yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== COURSES ===================== */
function AdminCourses() {
  const queryClient = useQueryClient();
  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('display_order');
      if (error) throw error;
      return data as Course[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-courses'] }); queryClient.invalidateQueries({ queryKey: ['courses'] }); toast.success('Course deleted'); },
  });

  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">Manage Courses ({courses?.length || 0})</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={() => setEditCourse(null)}><Plus className="h-4 w-4" /> Add Course</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editCourse ? 'Edit Course' : 'Add Course'}</DialogTitle>
              <DialogDescription>Fill in the course details below.</DialogDescription>
            </DialogHeader>
            <CourseForm course={editCourse} onClose={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">URL</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Order</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {courses?.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.title}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.category}</td>
                  <td className="p-3 hidden md:table-cell"><a href={c.external_url} target="_blank" rel="noopener noreferrer" className="text-secondary text-xs hover:underline truncate max-w-[120px] block">Link ↗</a></td>
                  <td className="p-3 hidden md:table-cell"><Badge variant={c.status === 'active' ? 'default' : 'outline'}>{c.status}</Badge></td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{c.display_order}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => { setEditCourse(c); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete course?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(c.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CourseForm({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: course?.title || '',
    short_description: course?.short_description || '',
    long_description: course?.long_description || '',
    thumbnail_url: course?.thumbnail_url || '',
    external_url: course?.external_url || '',
    category: course?.category || '',
    display_order: course?.display_order || 0,
    status: course?.status || 'active',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      let thumbnailUrl: string | null = form.thumbnail_url || null;

      if (selectedFile) {
        thumbnailUrl = await uploadImageToBucket('course-thumbnails', selectedFile, course?.id);
      }

      const payload = {
        title: form.title,
        short_description: form.short_description || null,
        long_description: form.long_description || null,
        thumbnail_url: thumbnailUrl,
        external_url: form.external_url,
        category: form.category || null,
        display_order: form.display_order,
        status: form.status,
      };

      if (course) {
        const { error } = await supabase.from('courses').update(payload).eq('id', course.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(course ? 'Course updated' : 'Course added');
      onClose();
    },
    onError: (e) => { setIsSaving(false); toast.error(e.message); },
  });

  return (
    <div className="space-y-4">
      <div><label className="text-sm font-medium block mb-1">Title *</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div><label className="text-sm font-medium block mb-1">Short Description</label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
      <div><label className="text-sm font-medium block mb-1">Long Description</label><Textarea value={form.long_description} onChange={(e) => setForm({ ...form, long_description: e.target.value })} rows={4} /></div>

      <div>
        <label className="text-sm font-medium block mb-1">Thumbnail Image</label>
        <ImageUpload
          bucketName="course-thumbnails"
          inputId="course-thumb-input"
          selectedFile={selectedFile}
          onFileChange={setSelectedFile}
          urlValue={form.thumbnail_url}
          onUrlChange={(url) => setForm((prev) => ({ ...prev, thumbnail_url: url }))}
        />
      </div>

      <div><label className="text-sm font-medium block mb-1">External URL *</label><Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://topmate.io/..." /></div>
      <div className="flex gap-4">
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Category</label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Display Order</label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} /></div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Status</label>
        <div className="flex items-center gap-2">
          <Switch checked={form.status === 'active'} onCheckedChange={(c) => setForm({ ...form, status: c ? 'active' : 'inactive' })} />
          <span className="text-sm">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => mutation.mutate()} disabled={isSaving || !form.title || !form.external_url} className="flex-1 gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : (course ? 'Update' : 'Add') + ' Course'}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

/* ===================== COACHING ===================== */
function AdminCoaching() {
  const queryClient = useQueryClient();
  const { data: services, isLoading } = useQuery({
    queryKey: ['admin-coaching'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coaching_services').select('*').order('display_order');
      if (error) throw error;
      return data as CoachingService[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coaching_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-coaching'] }); queryClient.invalidateQueries({ queryKey: ['coaching'] }); toast.success('Service deleted'); },
  });

  const [editService, setEditService] = useState<CoachingService | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">Manage Coaching ({services?.length || 0})</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={() => setEditService(null)}><Plus className="h-4 w-4" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editService ? 'Edit Service' : 'Add Service'}</DialogTitle>
              <DialogDescription>Fill in the coaching service details.</DialogDescription>
            </DialogHeader>
            <CoachingForm service={editService} onClose={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Type</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Price (Rs.)</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Duration</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Rating</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Badge</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {services?.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.title}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{s.service_type}</td>
                  <td className="p-3 hidden md:table-cell">Rs.{s.price?.toLocaleString('en-IN')}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{s.duration}</td>
                  <td className="p-3 hidden lg:table-cell">{s.rating}</td>
                  <td className="p-3 hidden lg:table-cell">{s.badge_text && <Badge variant="secondary" className="text-xs">{s.badge_text}</Badge>}</td>
                  <td className="p-3 hidden md:table-cell"><Badge variant={s.status === 'active' ? 'default' : 'outline'}>{s.status}</Badge></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => { setEditService(s); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete service?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(s.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CoachingForm({ service, onClose }: { service: CoachingService | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: service?.title || '',
    service_type: service?.service_type || 'mock_interview',
    short_description: service?.short_description || '',
    price: service?.price || 0,
    original_price: service?.original_price || 0,
    duration: service?.duration || '60 mins',
    platform: service?.platform || 'Video meeting',
    rating: service?.rating || 5.0,
    external_url: service?.external_url || '',
    badge_text: service?.badge_text || '',
    display_order: service?.display_order || 0,
    status: service?.status || 'active',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, badge_text: form.badge_text || null, original_price: form.original_price || null };
      if (service) {
        const { error } = await supabase.from('coaching_services').update(payload).eq('id', service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coaching_services').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coaching'] });
      queryClient.invalidateQueries({ queryKey: ['coaching'] });
      toast.success(service ? 'Service updated' : 'Service added');
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div><label className="text-sm font-medium block mb-1">Title *</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div>
        <label className="text-sm font-medium block mb-1">Service Type</label>
        <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="w-full h-9 rounded-lg border bg-background px-3 text-sm">
          <option value="mock_interview">Mock Interview</option>
          <option value="resume_review">Resume Review</option>
          <option value="mentorship">Mentorship</option>
          <option value="masterclass">Masterclass</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div><label className="text-sm font-medium block mb-1">Short Description</label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
      <div className="flex gap-4">
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Price (Rs.)</label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} /></div>
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Original Price (Rs.)</label><Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: parseInt(e.target.value) || 0 })} /></div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Duration</label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="60 mins" /></div>
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Platform</label><Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} /></div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Rating</label><Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} /></div>
        <div className="flex-1"><label className="text-sm font-medium block mb-1">Display Order</label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} /></div>
      </div>
      <div><label className="text-sm font-medium block mb-1">External URL *</label><Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://topmate.io/..." /></div>
      <div><label className="text-sm font-medium block mb-1">Badge Text</label><Input value={form.badge_text} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} placeholder="e.g. Popular, Bestseller" /></div>
      <div>
        <label className="text-sm font-medium block mb-1">Status</label>
        <div className="flex items-center gap-2">
          <Switch checked={form.status === 'active'} onCheckedChange={(c) => setForm({ ...form, status: c ? 'active' : 'inactive' })} />
          <span className="text-sm">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title || !form.external_url} className="flex-1">{service ? 'Update' : 'Add'} Service</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

/* ===================== USERS ===================== */
function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin status updated');
    },
    onError: () => {
      toast.error('Failed to update admin status');
    },
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, rowsPerPage, debouncedSearch],
    queryFn: async () => {
      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, is_admin, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (debouncedSearch) {
        query = query.or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { users: data as Profile[], total: count || 0 };
    },
  });

  const users = data?.users || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const showingTo = Math.min(page * rowsPerPage, totalCount);

  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      let allUsers: Profile[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, is_admin, created_at')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        if (error) throw error;
        allUsers = allUsers.concat(data as Profile[]);
        if (data.length < batchSize) break;
        from += batchSize;
      }

      const rows = allUsers.map((u) => ({
        Name: u.full_name || 'Unknown',
        Email: u.email || '',
        'Signed Up': u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        Admin: u.is_admin ? 'Yes' : 'No',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `TechnoManagers_Users_${today}.xlsx`);
      toast.success('Users exported successfully');
    } catch (e: any) {
      toast.error('Export failed: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Header with stat card */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h2 className="font-heading font-bold text-xl">Users</h2>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold leading-none">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportExcel} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      {/* Search + Rows per page */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: rowsPerPage > 5 ? 5 : rowsPerPage }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Signed Up</th>
              <th className="text-left p-3 font-medium">Admin</th>
            </tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 flex items-center gap-2">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{u.full_name?.charAt(0) || '?'}</div>
                    )}
                    <span>{u.full_name || 'Unknown'}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                  <td className="p-3">
                    <Switch
                      checked={u.is_admin ?? false}
                      disabled={u.id === currentUser?.id || toggleAdminMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleAdminMutation.mutate({ userId: u.id, isAdmin: checked })
                      }
                      aria-label={`Toggle admin for ${u.full_name || u.email}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
        <span className="text-muted-foreground">
          {totalCount > 0 ? `Showing ${showingFrom}-${showingTo} of ${totalCount} users` : 'No users'}
        </span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                size="icon"
                variant={p === page ? 'default' : 'ghost'}
                className="h-8 w-8 text-xs"
                onClick={() => setPage(p as number)}
              >
                {p}
              </Button>
            )
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ===================== WAITLIST ===================== */
function AdminWaitlist() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['admin-waitlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist')
        .select('id, email, user_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (error) throw error;
      return data as { id: string; full_name: string | null }[];
    },
  });

  const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  const handleExport = () => {
    if (!entries?.length) return;
    const csv = ['Email,User,Signed Up', ...entries.map((e) => {
      const name = e.user_id ? profileMap.get(e.user_id) || 'User' : 'Guest';
      return `${e.email},${name},${e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}`;
    })].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waitlist.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">
          Waitlist ({entries?.length || 0})
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport} disabled={!entries?.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="text-4xl font-heading font-extrabold text-primary">
        {entries?.length || 0}
        <span className="text-sm font-normal text-muted-foreground ml-2">total signups</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {entries?.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3">{e.email}</td>
                  <td className="p-3 text-muted-foreground">
                    {e.user_id ? profileMap.get(e.user_id) || 'User' : 'Guest'}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== EVENTS ===================== */
const EVENT_TYPES = [
  { value: 'webinar', label: 'Webinar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'live_qa', label: 'Live Q&A' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'other', label: 'Other' },
];
const EVENT_STATUSES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function AdminEvents() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
  });

  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">Manage Events ({events?.length || 0})</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={() => setEditEvent(null)}>
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
              <DialogDescription>Fill in the event details.</DialogDescription>
            </DialogHeader>
            <EventForm event={editEvent} onClose={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Type</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Duration</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events?.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 max-w-xs truncate">{e.title}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground capitalize">
                    {e.event_type?.replace('_', ' ')}
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">
                    {new Date(e.event_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{e.duration}</td>
                  <td className="p-3 hidden md:table-cell">
                    <Badge variant={e.status === 'upcoming' || e.status === 'live' ? 'default' : 'outline'}>
                      {e.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => { setEditEvent(e); setShowForm(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete event?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(e.id)} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {events && events.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No events yet. Click &ldquo;Add Event&rdquo; to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function toLocalDateTimeInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventForm({ event, onClose }: { event: Event | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    event_type: event?.event_type || 'webinar',
    event_date: toLocalDateTimeInput(event?.event_date) || '',
    duration: event?.duration || '',
    thumbnail_url: event?.thumbnail_url || '',
    external_url: event?.external_url || '',
    status: event?.status || 'upcoming',
    display_order: event?.display_order || 0,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let thumbnailUrl: string | null = form.thumbnail_url || null;
      if (selectedFile) {
        thumbnailUrl = await uploadImageToBucket('event-thumbnails', selectedFile, event?.id);
      }
      const payload = {
        ...form,
        description: form.description || null,
        duration: form.duration || null,
        thumbnail_url: thumbnailUrl,
        external_url: form.external_url || null,
        event_date: new Date(form.event_date).toISOString(),
      };
      if (event) {
        const { error } = await supabase.from('events').update(payload).eq('id', event.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(event ? 'Event updated' : 'Event added');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Title *</label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Description</label>
        <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Event Type</label>
          <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full h-9 rounded-lg border bg-background px-3 text-sm">
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 rounded-lg border bg-background px-3 text-sm">
            {EVENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Event Date & Time *</label>
          <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Duration</label>
          <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="60 mins" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Thumbnail Image</label>
        <ImageUpload
          bucketName="event-thumbnails"
          inputId="event-thumb-input"
          selectedFile={selectedFile}
          onFileChange={setSelectedFile}
          urlValue={form.thumbnail_url}
          onUrlChange={(url) => setForm((prev) => ({ ...prev, thumbnail_url: url }))}
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">External URL (Register/Join)</label>
        <Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://..." />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Display Order</label>
        <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title || !form.event_date} className="flex-1">
          {event ? 'Update' : 'Add'} Event
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

/* ===================== COMPANIES ===================== */
function AdminCompanies() {
  const queryClient = useQueryClient();
  const { data: companies = [], isLoading } = useAllCompanies();
  const { data: counts = [] } = useCompaniesWithCounts(true);
  const createMut = useCreateCompany();
  const updateMut = useUpdateCompany();
  const deleteMut = useDeleteCompany();

  const countMap: Record<string, number> = {};
  counts.forEach((c) => { countMap[c.company_name] = Number(c.question_count); });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; name: string; is_active: boolean; originalName?: string } | null>(null);
  const [renameAlsoUpdateQuestions, setRenameAlsoUpdateQuestions] = useState(false);
  const [deleteAlsoRemoveFromQuestions, setDeleteAlsoRemoveFromQuestions] = useState(false);

  const openNew = () => {
    setEditing({ name: '', is_active: true });
    setRenameAlsoUpdateQuestions(false);
    setShowForm(true);
  };
  const openEdit = (c: { id: string; name: string; is_active: boolean | null }) => {
    setEditing({ id: c.id, name: c.name, is_active: c.is_active ?? true, originalName: c.name });
    setRenameAlsoUpdateQuestions(false);
    setShowForm(true);
  };

  const submit = async () => {
    if (!editing) return;
    const trimmed = editing.name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      toast.error('Name must be 1–80 characters');
      return;
    }
    const dup = companies.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing.id,
    );
    if (dup) {
      toast.error('A company with this name already exists');
      return;
    }

    try {
      if (editing.id) {
        await updateMut.mutateAsync({
          id: editing.id,
          name: trimmed,
          is_active: editing.is_active,
        });
        if (renameAlsoUpdateQuestions && editing.originalName && editing.originalName !== trimmed) {
          const oldName = editing.originalName;
          const { data: qs, error: qErr } = await supabase
            .from('questions')
            .select('id, company')
            .contains('company', [oldName]);
          if (qErr) throw qErr;
          await Promise.all(
            (qs || []).map((q) => {
              const next = (q.company || []).map((c) => (c === oldName ? trimmed : c));
              return supabase.from('questions').update({ company: next }).eq('id', q.id);
            }),
          );
          queryClient.invalidateQueries({ queryKey: ['questions'] });
          queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
          toast.success(`Company updated. ${qs?.length || 0} question(s) re-tagged.`);
        } else {
          toast.success('Company updated');
        }
      } else {
        await createMut.mutateAsync({ name: trimmed, is_active: editing.is_active });
        toast.success('Company added');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = (c: { id: string; is_active: boolean | null }) => {
    updateMut.mutate(
      { id: c.id, is_active: !c.is_active },
      { onSuccess: () => toast.success(c.is_active ? 'Company deactivated' : 'Company activated') },
    );
  };

  const handleDelete = async (c: { id: string; name: string }) => {
    try {
      if (deleteAlsoRemoveFromQuestions) {
        const { data: qs, error: qErr } = await supabase
          .from('questions')
          .select('id, company')
          .contains('company', [c.name]);
        if (qErr) throw qErr;
        await Promise.all(
          (qs || []).map((q) =>
            supabase.from('questions').update({ company: (q.company || []).filter((x) => x !== c.name) }).eq('id', q.id),
          ),
        );
        queryClient.invalidateQueries({ queryKey: ['questions'] });
        queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      }
      await deleteMut.mutateAsync(c.id);
      toast.success('Company deleted');
      setDeleteAlsoRemoveFromQuestions(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isRename = !!editing?.id && editing.originalName !== editing.name.trim() && !!editing.originalName;
  const renameAffectedCount = isRename && editing?.originalName ? countMap[editing.originalName] || 0 : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading font-extrabold text-2xl">Manage Companies ({companies.length})</h2>
          <p className="text-sm text-muted-foreground">Companies appear in question filters and the admin question form.</p>
        </div>
        <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditing(null); setRenameAlsoUpdateQuestions(false); } }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Company</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit Company' : 'Add Company'}</DialogTitle>
              <DialogDescription>
                {editing?.id ? 'Renaming only updates the filter label by default.' : 'Create a new company option.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Company Name *</label>
                <Input
                  value={editing?.name || ''}
                  onChange={(e) => setEditing((p) => p && { ...p, name: e.target.value })}
                  placeholder="e.g. McKinsey"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.is_active ?? true}
                  onCheckedChange={(v) => setEditing((p) => p && { ...p, is_active: v })}
                />
                <span className="text-sm">{editing?.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {isRename && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Renaming &ldquo;{editing?.originalName}&rdquo; &rarr; &ldquo;{editing?.name.trim()}&rdquo;
                  </p>
                  <p className="text-muted-foreground">
                    Existing questions tagged with the old name will still reference &ldquo;{editing?.originalName}&rdquo; unless you update them.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={renameAlsoUpdateQuestions}
                      onChange={(e) => setRenameAlsoUpdateQuestions(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Also update all existing questions ({renameAffectedCount} affected)
                  </label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!editing?.name.trim() || createMut.isPending || updateMut.isPending}>
                {editing?.id ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium w-28">Questions</th>
                <th className="px-4 py-2 font-medium w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{countMap[c.name] || 0}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog onOpenChange={(o) => { if (!o) setDeleteAlsoRemoveFromQuestions(false); }}>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete company &ldquo;{c.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {(countMap[c.name] || 0) === 0
                              ? 'No questions reference this company.'
                              : `${countMap[c.name]} question(s) reference this company. Deleting will remove it from filter dropdowns. Questions keep the company name in their data unless you also remove it below.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        {(countMap[c.name] || 0) > 0 && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer px-1">
                            <input
                              type="checkbox"
                              checked={deleteAlsoRemoveFromQuestions}
                              onChange={(e) => setDeleteAlsoRemoveFromQuestions(e.target.checked)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            Also remove &ldquo;{c.name}&rdquo; from all questions
                          </label>
                        )}
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c)} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No companies yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
