'use client';


import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { hubHref } from '@/lib/hubs';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { questionsQueryOptions, useSavedQuestions, useSaveQuestion, useUnsaveQuestion } from '@/hooks/useQuestions';
import { useUserLikedQuestionIds, useToggleLike } from '@/hooks/useLikes';
import { useRoles, useRoleQuestionCounts } from '@/hooks/useRoles';
import { usePopularCompanies } from '@/hooks/useCompanies';
import { useQuestionFacets, type FacetRow } from '@/hooks/useQuestionFacets';
import { useAuth } from '@/contexts/AuthContext';
import QuestionCard from '@/components/questions/QuestionCard';
import { RoleFilter, CompanyFilter, CategoryFilter, GeneralFilter, SortFilter } from '@/components/questions/QuestionFilters';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export default function QuestionsClient() {
  // NOT next/navigation's useSearchParams() — that forces the whole
  // statically-generated page to render an empty HTML shell (zero crawlable
  // content). This hook returns '' during SSG so the default list is baked
  // into the static HTML, then live params after hydration. See the hook doc.
  const searchParams = useLocationSearch();
  const router = useRouter();

  // How many PAGE_SIZE pages are shown. Each page is its own live query in
  // the useQueries() below — no local copy of the rows exists, so optimistic
  // cache updates (upvote counters) reach every rendered card.
  const [pageCount, setPageCount] = useState(1);

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
  const sort = searchParams.get('sort') || 'Newest';
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
      if (v && v !== 'Newest') params.set('sort', v);
      else params.delete('sort');
      router.replace(`/questions?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const { user } = useAuth();

  // One live query per loaded page. Page 0 uses the EXACT key the server
  // prefetches (app/questions/page.tsx), so hydration is preserved: a fresh
  // load renders the 20 server-fetched cards with no refetch. Deliberately
  // NOT useInfiniteQuery — that would change the load-bearing page-1 key
  // shape shared with the homepage and the server prefetch.
  const pages = useQueries({
    queries: useMemo(
      () =>
        Array.from({ length: pageCount }, (_, i) =>
          questionsQueryOptions({
            categories,
            companies,
            difficulties,
            role: role || undefined,
            search,
            sort,
            limit: PAGE_SIZE,
            offset: i * PAGE_SIZE,
          }),
        ),
      [pageCount, categories, companies, difficulties, role, search, sort],
    ),
  });
  const { data: savedIds = [] } = useSavedQuestions(user?.id);
  const { data: likedIds = new Set<string>() } = useUserLikedQuestionIds(user?.id);
  const { data: rolesList = [] } = useRoles();
  const { data: roleCounts = {} } = useRoleQuestionCounts();
  const { data: trendingCompanies = [] } = usePopularCompanies(6);
  const { data: facetRows = [] } = useQuestionFacets();
  const toggleLike = useToggleLike();
  const save = useSaveQuestion();
  const unsave = useUnsaveQuestion();

  // Collapse back to page 1 when any filter changes
  const filterKey = searchParams.toString();
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setPageCount(1);
    }
  }, [filterKey]);

  const handleLoadMore = () => setPageCount((n) => n + 1);

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

  // Rendered rows come straight from the live page queries — server render and
  // first client render both read the hydrated page-0 cache, so the HTML
  // matches and there is no hydration mismatch.
  const displayedQuestions = useMemo(() => pages.flatMap((p) => p.data ?? []), [pages]);
  const lastPage = pages[pages.length - 1];
  const hasMore = (lastPage.data?.length ?? 0) === PAGE_SIZE;

  // ── Faceted filter options ────────────────────────────────────────────────
  // Each filter's available options reflect the questions that match the OTHER
  // currently-applied filters (a filter never constrains its own options, so you
  // can still add/remove values within it). Options with a count of 0 are hidden
  // by the filter components, so e.g. selecting role "Product Management" removes
  // companies that have no PM questions from the Company dropdown.
  const facets = useMemo(() => {
    // Until the facet corpus has loaded, return null so the filters fall back to
    // showing all options (rather than hiding everything against empty counts).
    if (facetRows.length === 0) return null;

    const matchRole = (q: FacetRow) => !role || q.role === role;
    const matchCompanies = (q: FacetRow) =>
      companies.length === 0 || companies.some((c) => q.company?.includes(c));
    const matchCategories = (q: FacetRow) =>
      categories.length === 0 || categories.some((c) => q.category?.includes(c));
    const matchDifficulties = (q: FacetRow) =>
      difficulties.length === 0 || (!!q.difficulty && difficulties.includes(q.difficulty));
    const lowerSearch = search.trim().toLowerCase();
    const matchSearch = (q: FacetRow) =>
      !lowerSearch || q.question_text.toLowerCase().includes(lowerSearch);

    const role_: Record<string, number> = {};
    const company: Record<string, number> = {};
    const category: Record<string, number> = {};
    const difficulty: Record<string, number> = {};

    facetRows.forEach((q) => {
      // Role options: apply every filter except role itself.
      if (matchCompanies(q) && matchCategories(q) && matchDifficulties(q) && matchSearch(q) && q.role) {
        role_[q.role] = (role_[q.role] || 0) + 1;
      }
      // Company options: apply every filter except company itself.
      if (matchRole(q) && matchCategories(q) && matchDifficulties(q) && matchSearch(q)) {
        q.company?.forEach((c) => { company[c] = (company[c] || 0) + 1; });
      }
      // Category options: apply every filter except category itself.
      if (matchRole(q) && matchCompanies(q) && matchDifficulties(q) && matchSearch(q)) {
        q.category?.forEach((c) => { category[c] = (category[c] || 0) + 1; });
      }
      // Difficulty options: apply every filter except difficulty itself.
      if (matchRole(q) && matchCompanies(q) && matchCategories(q) && matchSearch(q) && q.difficulty) {
        difficulty[q.difficulty] = (difficulty[q.difficulty] || 0) + 1;
      }
    });

    return { role: role_, company, category, difficulty };
  }, [facetRows, role, companies, categories, difficulties, search]);

  // Sidebar "Top Categories": counted over the WHOLE corpus (facet rows), not
  // the ≤20 loaded cards, and sorted by true count so "top" means top.
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    facetRows.forEach((q) => {
      q.category?.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [facetRows]);

  const showInitialLoading = pages[0].isPending && displayedQuestions.length === 0;
  const showLoadingMore = pageCount > 1 && lastPage.isPending;

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
          <RoleFilter value={role} onChange={setRole} counts={facets?.role} />
          <CompanyFilter value={companies} onChange={setCompanies} counts={facets?.company} />
          <CategoryFilter value={categories} onChange={setCategories} counts={facets?.category} />
          <GeneralFilter difficulties={difficulties} onDifficultiesChange={setDifficulties} counts={facets?.difficulty} />
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
            <h2 className="font-heading font-bold text-sm">Top Categories</h2>
            {topCategories.map(([cat, count]) => (
              <Link
                key={cat}
                href={hubHref('category', cat)}
                className="flex justify-between items-center w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{cat}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{count}</span>
              </Link>
            ))}
          </div>

          {/* Browse by Role */}
          <div className="rounded-xl border p-5 space-y-2.5">
            <h2 className="font-heading font-bold text-sm">Browse by Role</h2>
            {rolesList.map((r) => (
              <Link
                key={r.id}
                href={hubHref('role', r.name)}
                className={`flex justify-between items-center w-full text-sm transition-colors ${
                  role === r.name ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{r.name}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{roleCounts[r.name] || 0}</span>
              </Link>
            ))}
          </div>

          {/* Trending Companies */}
          <div className="rounded-xl border p-5 space-y-3">
            <h2 className="font-heading font-bold text-sm">Trending Companies</h2>
            <div className="flex flex-wrap gap-2">
              {trendingCompanies.map((c) => (
                <Link
                  key={c.company_name}
                  href={hubHref('company', c.company_name)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {c.company_name}
                </Link>
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
