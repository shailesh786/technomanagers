'use client';


import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuestions, useSavedQuestions, useSaveQuestion, useUnsaveQuestion } from '@/hooks/useQuestions';
import { useUserLikedQuestionIds, useToggleLike } from '@/hooks/useLikes';
import { useRoles, useRoleQuestionCounts } from '@/hooks/useRoles';
import { usePopularCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import QuestionCard from '@/components/questions/QuestionCard';
import { RoleFilter, CompanyFilter, CategoryFilter, GeneralFilter, SortFilter } from '@/components/questions/QuestionFilters';
import { toast } from 'sonner';
import type { Question } from '@/types';

const PAGE_SIZE = 20;

export default function QuestionsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // URL is the single source of truth for all filters
  const role = searchParams.get('role') || '';
  const companies = useMemo(() => {
    const c = searchParams.get('company');
    return c ? c.split(',') : [];
  }, [searchParams]);
  const categories = useMemo(() => {
    const cat = searchParams.get('category');
    return cat ? cat.split(',') : [];
  }, [searchParams]);
  const difficulties = useMemo(() => {
    const d = searchParams.get('difficulty');
    return d ? d.split(',') : [];
  }, [searchParams]);
  const sort = searchParams.get('sort') || 'Hot';
  const search = searchParams.get('q') || '';

  // Local state for search input — avoids a URL round-trip on every keystroke
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Sync local input when the URL param changes externally (e.g. "Clear Filters")
  useEffect(() => { setSearchInput(search); }, [search]);

  // Helper to update a single filter param and replace the URL.
  // Reads from window.location.search (always current) instead of the React
  // searchParams state, which can be stale when multiple filters change in
  // rapid succession — that was the root cause of filters clearing each other.
  const updateParam = useCallback(
    (key: string, value: string | string[]) => {
      const params = new URLSearchParams(window.location.search);
      const v = Array.isArray(value) ? value.join(',') : value;
      if (v) params.set(key, v);
      else params.delete(key);
      router.replace(`/questions?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const setRole = useCallback((v: string) => updateParam('role', v), [updateParam]);
  const setCompanies = useCallback((v: string[]) => updateParam('company', v), [updateParam]);
  const setCategories = useCallback((v: string[]) => updateParam('category', v), [updateParam]);
  const setDifficulties = useCallback((v: string[]) => updateParam('difficulty', v), [updateParam]);
  const setSort = useCallback(
    (v: string) => {
      const params = new URLSearchParams(window.location.search);
      if (v && v !== 'Hot') params.set('sort', v);
      else params.delete('sort');
      router.replace(`/questions?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const { user } = useAuth();

  const { data: questions, isLoading } = useQuestions({
    categories,
    companies,
    difficulties,
    role: role || undefined,
    search,
    sort,
    limit: PAGE_SIZE,
    offset,
  });
  const { data: savedIds = [] } = useSavedQuestions(user?.id);
  const { data: likedIds = new Set<string>() } = useUserLikedQuestionIds(user?.id);
  const { data: rolesList = [] } = useRoles();
  const { data: roleCounts = {} } = useRoleQuestionCounts();
  const { data: trendingCompanies = [] } = usePopularCompanies(6);
  const toggleLike = useToggleLike();
  const save = useSaveQuestion();
  const unsave = useUnsaveQuestion();

  // Reset offset when filters change
  const filterKey = searchParams.toString();
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setOffset(0);
      setAllQuestions([]);
      setHasMore(true);
    }
  }, [filterKey]);

  // Accumulate results — only apply data matching current filterKey
  const lastAppliedKey = useRef('');
  useEffect(() => {
    if (!questions) return;
    const currentKey = `${filterKey}|${offset}`;
    if (lastAppliedKey.current === currentKey) return;
    lastAppliedKey.current = currentKey;

    if (offset === 0) {
      setAllQuestions(questions);
    } else {
      setAllQuestions((prev) => [...prev, ...questions]);
    }
    setHasMore(questions.length === PAGE_SIZE);
  }, [questions, offset, filterKey]);

  const handleLoadMore = () => setOffset((prev) => prev + PAGE_SIZE);

  const handleUpvote = (id: string) => {
    if (!user) { toast.info('Sign in to upvote'); return; }
    toggleLike.mutate({ questionId: id, userId: user.id });
  };

  const handleToggleSave = (id: string) => {
    if (!user) { toast.info('Sign in to save questions'); return; }
    if (savedIds.includes(id)) {
      unsave.mutate({ userId: user.id, questionId: id });
    } else {
      save.mutate({ userId: user.id, questionId: id });
    }
  };

  // Use accumulated allQuestions for pagination; fall back to the raw `questions`
  // data (available from server-prefetch on both SSR and first client render) so
  // the initial HTML is identical on server and client — avoids a hydration mismatch
  // caused by useEffect not running on the server while the query cache is populated.
  const displayedQuestions = useMemo(() => {
    if (offset > 0 || allQuestions.length > 0) return allQuestions;
    return questions ?? [];
  }, [offset, allQuestions, questions]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    displayedQuestions.forEach((q) => {
      q.category?.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  }, [displayedQuestions]);

  const showInitialLoading = isLoading && displayedQuestions.length === 0;
  const showLoadingMore = isLoading && offset > 0;

  const clearAll = useCallback(() => {
    router.replace('/questions', { scroll: false });
  }, [router]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="font-heading font-extrabold text-3xl">Interview Questions</h1>
        <p className="text-muted-foreground">Browse and practice real interview questions asked by top companies.</p>
      </div>

      {/* Mobile search */}
      <div className="lg:hidden mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              clearTimeout(searchDebounce.current);
              searchDebounce.current = setTimeout(() => updateParam('q', e.target.value), 300);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur pb-4 -mx-2 px-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <RoleFilter value={role} onChange={setRole} />
          <CompanyFilter value={companies} onChange={setCompanies} />
          <CategoryFilter value={categories} onChange={setCategories} />
          <GeneralFilter difficulties={difficulties} onDifficultiesChange={setDifficulties} />
          <div className="ml-auto shrink-0">
            <SortFilter value={sort} onChange={setSort} />
          </div>
        </div>
      </div>

      <div className="flex gap-8 mt-2">
        {/* Main content */}
        <div className="flex-1 space-y-4 min-w-0">
          {showInitialLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-5 space-y-3">
                <div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /></div>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-3 pt-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /></div>
              </div>
            ))
          ) : displayedQuestions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">No questions found matching your filters.</p>
              <Button variant="outline" className="mt-4" onClick={clearAll}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {displayedQuestions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  isSaved={savedIds.includes(q.id)}
                  isLiked={likedIds.has(q.id)}
                  isAuthenticated={!!user}
                  onUpvote={() => handleUpvote(q.id)}
                  onToggleSave={() => handleToggleSave(q.id)}
                />
              ))}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={handleLoadMore} disabled={showLoadingMore} className="gap-2">
                    {showLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-72 space-y-5 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                clearTimeout(searchDebounce.current);
                searchDebounce.current = setTimeout(() => updateParam('q', e.target.value), 300);
              }}
              className="pl-9"
            />
          </div>

          {/* Top Categories */}
          <div className="rounded-xl border p-5 space-y-2.5">
            <h3 className="font-heading font-bold text-sm">Top Categories</h3>
            {Object.entries(categoryCounts).slice(0, 8).map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setCategories([cat])}
                className="flex justify-between items-center w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{cat}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{count}</span>
              </button>
            ))}
          </div>

          {/* Browse by Role */}
          <div className="rounded-xl border p-5 space-y-2.5">
            <h3 className="font-heading font-bold text-sm">Browse by Role</h3>
            {rolesList.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(role === r.name ? '' : r.name)}
                className={`flex justify-between items-center w-full text-sm transition-colors ${
                  role === r.name ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{r.name}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{roleCounts[r.name] || 0}</span>
              </button>
            ))}
          </div>

          {/* Trending Companies */}
          <div className="rounded-xl border p-5 space-y-3">
            <h3 className="font-heading font-bold text-sm">Trending Companies</h3>
            <div className="flex flex-wrap gap-2">
              {trendingCompanies.map((c) => (
                <button
                  key={c.company_name}
                  onClick={() => setCompanies([c.company_name])}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {c.company_name}
                </button>
              ))}
              {trendingCompanies.length === 0 && (
                <p className="text-xs text-muted-foreground">No companies yet</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
