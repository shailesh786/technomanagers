# Technomanagers — Claude Code Guide

This file is the source of truth for Claude Code in this repository.
Read it fully before making any changes.

---

## Project Overview

**Technomanagers** is a community platform for product managers — featuring interview question prep, coaching services, courses, events, and a cohort programme.

The app is fully migrated from a legacy **Lovable (Vite + React Router)** project to **Next.js 14 App Router**. The `src/` directory and all Vite artefacts have been removed.

---

## Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Scaffold: Next.js skeleton, Supabase SSR utils, config | ✅ Complete |
| 2 | SSR pages: `/`, `/questions`, `/questions/[id]`, `/coaching`, `/courses`, `/cohort`, `/events` | ✅ Complete |
| 3 | CSR pages: `/auth`, `/profile`, `/admin` + native Supabase OAuth (`/auth/callback`) | ✅ Complete |
| 4 | Shared components: Navbar, Footer, layout wrappers, providers, hooks, contexts, types | ✅ Complete |
| 5 | SEO: `generateMetadata` on all SSR pages, `app/sitemap.ts`, `app/robots.ts` | ✅ Complete |
| 6 | Remove Vite artefacts (`src/`, `index.html`, `vite.config.ts`) | ✅ Complete |
| 7 | Vercel deployment, ISR performance tuning, Speed Insights | ✅ Complete |

---

## Architecture Decisions

### Directory Layout

```
technomanagers/
├── app/                          ← Next.js App Router pages & API routes
│   ├── layout.tsx                ← Root layout (Providers, Navbar, Footer)
│   ├── page.tsx                  ← / homepage          (ISR, 300 s)
│   ├── not-found.tsx             ← 404 page
│   ├── robots.ts                 ← /robots.txt
│   ├── sitemap.ts                ← /sitemap.xml
│   ├── questions/
│   │   ├── page.tsx              ← /questions list     (ISR, 60 s)
│   │   ├── [id]/page.tsx         ← /questions/:id      (ISR, 60 s) + Breadcrumb/paywall JSON-LD
│   │   ├── [id]/preview/page.tsx ← /questions/:id/preview (dynamic, admin drafts, noindex)
│   │   └── {company,category,role}/[slug]/page.tsx ← hub pages (ISR, 300 s; lib/hub-page.tsx)
│   ├── coaching/page.tsx         ← /coaching           (ISR, 300 s)
│   ├── courses/page.tsx          ← /courses            (ISR, 300 s)
│   ├── cohort/page.tsx           ← /cohort             (ISR, 300 s) + Course JSON-LD
│   ├── events/page.tsx           ← /events             (ISR, 300 s)
│   ├── auth/
│   │   ├── page.tsx              ← /auth sign-in       (CSR)
│   │   └── callback/route.ts     ← OAuth PKCE callback
│   ├── profile/page.tsx          ← /profile            (CSR, auth-gated)
│   ├── admin/[[...slug]]/
│   │   └── page.tsx              ← /admin/*            (CSR, admin-only)
│   └── api/revalidate/
│       ├── hero/route.ts         ← POST → revalidateTag('hero')
│       ├── questions/route.ts    ← POST → revalidateTag('questions')
│       └── cohort/route.ts       ← POST → revalidateTag('cohort-testimonials')
│
├── components/                   ← React components
│   ├── admin/                    ← Admin panel (questions, users, hero, cohort, etc.)
│   ├── coaching/ courses/ events/ cohort/ home/ layout/ profile/ questions/
│   └── ui/                       ← shadcn/ui primitives — do not edit manually
│
├── contexts/
│   ├── AuthContext.tsx            ← User session state (Supabase Auth)
│   └── QuestionAccessContext.tsx
│
├── hooks/                        ← TanStack Query data hooks (client-side only)
│   ├── useQuestions.ts            ← Questions list, upvote, save
│   ├── useQuestionFacets.ts       ← Faceted filter option counts
│   ├── useRoles.ts / useCompanies.ts / useCoaching.ts / useCourses.ts / useEvents.ts
│   ├── useHeroItems.ts            ← Hero Priority Board items (admin CRUD + moves)
│   ├── useCohortSettings.ts       ← Cohort CTA config (admin editable, single row)
│   └── useCohortTestimonials.ts   ← Cohort testimonial CRUD + reorder
│
├── lib/
│   └── supabase/
│       ├── server.ts              ← Server client (RSC + route handlers — reads cookies)
│       ├── client.ts              ← Browser singleton ('use client' components)
│       ├── public.ts              ← Cookieless anon client (ISR-safe public reads) ← NEW
│       └── middleware-client.ts   ← Session-refresh client (middleware.ts only)
│
├── providers/
│   └── QueryProvider.tsx          ← TanStack Query client + HydrationBoundary wrapper
│
├── types/
│   └── index.ts                   ← Shared TypeScript interfaces
│
├── supabase/
│   └── migrations/                ← SQL migrations — NEVER modify existing files
│
├── middleware.ts                  ← Edge: refreshes Supabase auth cookie
├── next.config.ts
├── tailwind.config.ts
└── vitest.config.ts
```

### SSR vs CSR Split

| Route | Rendering | Reason |
|-------|-----------|--------|
| `/` | Static + ISR 300 s | Public landing — SEO, fast FCP |
| `/questions` | Static + ISR 60 s | Crawlable; data from server prefetch |
| `/questions/[id]` | Static + ISR 60 s | Public data only — no cookies/searchParams, so ISR genuinely applies. Answer, related questions and breadcrumbs are in the HTML |
| `/questions/[id]/preview` | Dynamic SSR | Admin draft preview — reads the session cookie; noindex |
| `/questions/company/[slug]` · `/questions/category/[slug]` · `/questions/role/[slug]` | Static + ISR 300 s | Hub landing pages built from question tags; noindex + off the sitemap under 3 questions (lib/hubs.ts) |
| `/coaching` | Static + ISR 300 s | Public marketing page |
| `/courses` | Static + ISR 300 s | Public marketing page |
| `/cohort` | Static + ISR 300 s | Marketing page; testimonials are admin-managed and server-fetched |
| `/events` | Static + ISR 300 s | Public marketing page |
| `/auth` | CSR | Browser-only OAuth flow |
| `/profile` | CSR | Authenticated-only, personalised content |
| `/admin` | CSR | Protected; no SEO value |

### Auth Architecture

- Native Supabase Auth via `@supabase/ssr`
- OAuth initiated via `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`
- `/auth/callback` Route Handler exchanges the PKCE code for a session and sets the cookie
- Session stored in **cookies** (not `localStorage`) so RSC can read it
- `middleware.ts` calls `supabase.auth.getSession()` on every request to keep the cookie fresh

**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs** must include your production callback URL.

### `@/` Path Alias

All code uses the root-level alias:

```json
"@/*": ["./*"]   // app/, lib/, components/, hooks/, types/, etc.
```

---

## Supabase Client Rules — CRITICAL

There are four Supabase clients. Using the wrong one causes hard-to-debug bugs.

| Context | Import | Client type |
|---------|--------|-------------|
| React Server Component / Route Handler that needs the **user's session** | `@/lib/supabase/server` | `createServerClient` (reads cookies) |
| **ISR-cached pages / `unstable_cache` fetchers** reading **public data** | `@/lib/supabase/public` | `createSupabasePublicClient()` — cookieless |
| Client Component (`'use client'`) | `@/lib/supabase/client` | `createBrowserClient` (singleton) |
| `middleware.ts` only | `@/lib/supabase/middleware-client` | `createServerClient` with cookie adapter |

### The cookies()-in-ISR trap

**Never** use `createSupabaseServerClient()` (from `@/lib/supabase/server`) inside:

1. `unstable_cache(() => { ... })` — Next 14 **throws** when `cookies()` is accessed inside a cached function. The throw is swallowed by `prefetchQuery`, so the cache ships empty and the client refetches everything.
2. A page component that uses `export const revalidate = N` for ISR — any `cookies()` call in the render opts the whole route into **dynamic rendering**, silently defeating the ISR.

Use `createSupabasePublicClient()` (from `@/lib/supabase/public`) for any data that is publicly readable via RLS. All published questions, active courses, coaching services, events, hero items, and cohort settings are public to the anon role.

```ts
// ✅ CORRECT — inside unstable_cache or an ISR page
import { createSupabasePublicClient } from '@/lib/supabase/public';
const supabase = createSupabasePublicClient();

// ❌ WRONG — throws inside unstable_cache; opts ISR page into dynamic rendering
import { createSupabaseServerClient } from '@/lib/supabase/server';
const supabase = await createSupabaseServerClient(); // reads cookies()
```

**Never** import `@/lib/supabase/server` inside a `'use client'` component — it will throw at runtime.

---

## Performance Patterns

### TanStack Query + HydrationBoundary

Server Components prefetch data into a `QueryClient`, dehydrate it into HTML, and pass it to a `HydrationBoundary`. Client components read the dehydrated cache on first render — no loading skeleton, no refetch waterfall.

```tsx
// app/courses/page.tsx (Server Component)
const queryClient = new QueryClient();
await queryClient.prefetchQuery({
  queryKey: ['courses'],
  queryFn: async () => {
    const supabase = createSupabasePublicClient(); // ← cookieless
    const { data } = await supabase.from('courses').select(...).eq('status', 'active');
    return data ?? [];
  },
});
return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <CoursesPage /> {/* 'use client'; reads ['courses'] from cache immediately */}
  </HydrationBoundary>
);
```

**Query key alignment is critical.** The key used in `prefetchQuery` must exactly match the key in the client hook (`useQuery`). A mismatch silently ignores the prefetch and forces a client refetch.

### `unstable_cache` for per-query caching

Use `unstable_cache` to cache the Supabase query result independently of the page ISR TTL. This prevents DB hammering during revalidation spikes.

```ts
const getDefaultQuestions = unstable_cache(
  async () => {
    const supabase = createSupabasePublicClient(); // cookieless — mandatory
    const { data } = await supabase.from('questions')...
    return data ?? [];
  },
  ['questions-default-hot'],          // unique cache key
  { revalidate: 60, tags: ['questions'] },
);
```

### QuestionsClient is server-rendered (no `ssr: false`)

`QuestionsClient` reads filters through `hooks/useLocationSearch.ts`, whose server snapshot is `''`, so static generation bakes the default unfiltered list — 20 question links land in the HTML — and filtered URLs (`/questions?role=PM`) hydrate without a mismatch. Do not reintroduce `useSearchParams()` there: it forces a client-only render and the list drops out of the HTML.

### Question detail pages must stay free of request-time input

`app/questions/[id]/page.tsx` is ISR. Reading `searchParams` or `cookies()` in it (or in its `generateMetadata`) silently turns every visit into a per-request render with `no-store` headers. Anything that needs the session — admin draft preview — belongs in `app/questions/[id]/preview/page.tsx`.

### Cache invalidation

Admin mutations call `/api/revalidate/hero` or `/api/revalidate/questions` after writes. These route handlers call `revalidateTag(...)` to flush the ISR and `unstable_cache` caches immediately.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 + CSS variables |
| Components | shadcn/ui (Radix UI primitives) |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Auth SSR | @supabase/ssr |
| Data fetching (client) | TanStack Query v5 |
| Forms | react-hook-form + zod |
| Fonts | Plus Jakarta Sans + DM Sans via `next/font/google` |
| Images | `next/image` |
| Analytics | @vercel/analytics + @vercel/speed-insights |
| Testing | Vitest + Testing Library |
| Deployment | Vercel |

---

## Env Vars

Create `.env.local` at the project root (never commit it):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both variables are prefixed `NEXT_PUBLIC_` so they are available in both Server and Client Components.

---

## What NOT to Do

- ❌ Do not modify any file inside `supabase/migrations/` — create new files for schema changes
- ❌ Do not use `createSupabaseServerClient()` inside `unstable_cache()` or in ISR page renders — use `createSupabasePublicClient()` for public data
- ❌ Do not import `@/lib/supabase/server` inside any `'use client'` file — it throws at runtime
- ❌ Do not use `localStorage` for auth tokens — cookies only
- ❌ Do not add `export const dynamic = 'force-dynamic'` unless the page genuinely requires a fresh session on every request
- ❌ Do not use `react-router-dom` — it is removed; use `next/link` and `next/navigation`
- ❌ Do not edit files in `components/ui/` manually — they are shadcn/ui generated components; use the CLI to add new ones
- ❌ Do not change UI/visual design without explicit instruction — pixel-perfect match is required
- ❌ Do not run `git add -A` or `git add .` — always add specific files to avoid committing `.env.local` or build artifacts
- ❌ Do not commit unless explicitly asked

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — Providers, Navbar, Footer |
| `app/page.tsx` | Homepage — Hero Priority Board + featured questions (ISR, 300 s) |
| `app/questions/page.tsx` | Questions listing — server prefetch + HydrationBoundary (ISR, 60 s) |
| `app/questions/[id]/page.tsx` | Question detail — ISR 60 s. Loads the question, related clusters, prev/next neighbours and the first page of community answers (hydrated into the comments hooks' keys); emits QAPage/WebPage + BreadcrumbList JSON-LD |
| `app/questions/[id]/preview/page.tsx` | Admin draft preview — dynamic, session cookie, noindex |
| `components/questions/QuestionDetailClient.tsx` | Detail page body — breadcrumbs, badge/chip links to the filtered list, answer always in the DOM (collapsed; reveal goes through the free-view gate), community answers, then the related block |
| `components/questions/RelatedQuestions.tsx` | Related clusters (same category ×3, same company ×2, trending fallback) rendered with `QuestionCard` + "View all" hub links, then `QuestionPager` |
| `components/questions/QuestionPager.tsx` | ← Previous / Next → question links (newest-first chain); clicks go through the free-view gate like cards do |
| `components/RelativeTime.tsx` | Hydration-safe "N days ago" `<time>` — renders the server label, recomputes after mount |
| `lib/related-questions.ts` | Pure cluster selection: sizes, headings, hub hrefs, de-duplication, trending fallback, "View all N" threshold |
| `lib/hubs.ts` | Pure hub logic: slugify, taxonomy from question tags, indexability threshold (3), titles/descriptions/intros, CollectionPage + Breadcrumb JSON-LD |
| `lib/hub-data.ts` | Hub data loaders — taxonomy under `unstable_cache` tag 'questions'; hub question lists (cookieless) |
| `lib/hub-page.tsx` | Shared server implementation of the three hub routes (`createHubPage(kind)`) |
| `components/questions/HubQuestionList.tsx` | Hub page card list — QuestionCard + `useQuestionCardActions` |
| `hooks/useQuestionCardActions.ts` | Like/save wiring for QuestionCard, shared by the listing, related clusters and hub pages |
| `lib/question-seo.ts` | Question `<title>`, meta description (sample-answer excerpt or template) and JSON-LD graph (QAPage/WebPage with paywall markup + BreadcrumbList) |
| `lib/comments-query.ts` | Shared comments query shape (select, filters, order, page size, keys) used by `hooks/useComments.ts` and the question route's prefetch — keep both on it |
| `app/auth/callback/route.ts` | OAuth PKCE exchange — sets session cookie |
| `app/api/revalidate/hero/route.ts` | Admin-gated POST → `revalidateTag('hero')` |
| `app/api/revalidate/questions/route.ts` | Admin-gated POST → `revalidateTag('questions')` |
| `app/api/revalidate/cohort/route.ts` | Admin-gated POST → `revalidateTag('cohort-testimonials')` |
| `lib/supabase/server.ts` | Server Supabase client (cookies, for auth-gated RSC) |
| `lib/supabase/client.ts` | Browser Supabase singleton |
| `lib/supabase/public.ts` | Cookieless anon client — use for all ISR/cached public reads |
| `lib/supabase/middleware-client.ts` | Session-refresh client (middleware.ts only) |
| `middleware.ts` | Edge: refreshes auth cookie on every request |
| `components/home/HeroPriorityBoard.tsx` | Homepage hero: static 3-card board (md+), manual scroll-snap slideshow below; renders nothing with 0 visible items |
| `components/home/HeroCard.tsx` | Single hero card (white/navy surface, 16:9 image or gradient fallback); whole card is one link |
| `components/admin/AdminHeroBoard.tsx` | Admin hero slots UI — 3 priority slots, visibility switches, editor with live preview, bench |
| `lib/hero.ts` | Hero selection logic: visibility + IST schedule window + priority sort + cap 3; promotion planner |
| `components/cohort/CohortPage.tsx` | Cohort page; CTA links from `cohort_settings`, testimonials passed in as props from the server route. All colours resolve through the `C` map to design tokens — read the note above it before adding one |
| `components/cohort/InstructorCard.tsx` | Mentor credentials card in the cohort hero (lg+ only) — portrait, practitioner tagline, three proof lines, YouTube + LinkedIn links. Profile URLs are the `INSTRUCTOR_*_URL` constants at the top of the file |
| `components/cohort/CohortTestimonials.tsx` | Testimonial wall — video / text / screenshot cards in JS-built columns that read the admin's order left-to-right then down (card i → column i % N, stable across "Load more"). Renders every card but hides those past the reveal so crawlers see them without the images being fetched |
| `components/cohort/TestimonialLightbox.tsx` | Player/viewer, `next/dynamic`'d so no YouTube JS or Radix Dialog is in the initial bundle |
| `components/admin/AdminCohortTestimonials.tsx` | Admin testimonial CRUD — drag or arrows to reorder, per-kind form, YouTube link validation |
| `lib/youtube.ts` | Parses an admin-pasted URL into a YouTube id + poster chain, or a direct media file. Rejects anything else |
| `lib/cohort-testimonials.ts` | Visibility/order selection, row-major column distribution, renderability check |
| `components/admin/AdminPage.tsx` | Full admin panel — tabs for all content types + homepage + cohort config |
| `components/questions/QuestionsClient.tsx` | Client-side question list — filters, search, pagination, facets |
| `components/questions/QuestionFilters.tsx` | Faceted filter dropdowns (role, company, category, difficulty) |
| `hooks/useQuestions.ts` | Questions data hook — supports single/multi category, role, company, difficulty, sort |
| `hooks/useQuestionFacets.ts` | Fetches all questions client-side to compute per-filter option counts |
| `hooks/useHeroItems.ts` | Hero item CRUD, optimistic visibility toggle, slot promote/demote |
| `hooks/useCohortSettings.ts` | Cohort CTA config read + upsert hooks |
| `types/index.ts` | Shared TypeScript interfaces (Profile, Question, Course, HeroItem, CohortSettings, etc.) |
| `supabase/migrations/` | All SQL migrations — never touch existing files |

---

## Database Tables (current schema)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles — extends `auth.users`; `is_admin` flag |
| `questions` | Interview questions — company[], category[], role, difficulty, upvotes |
| `saved_questions` | User ↔ question save relationship |
| `question_likes` | User ↔ question like relationship (toggles `upvotes` counter via RPC) |
| `comments` | Question comments with moderation |
| `roles` | Role taxonomy for filtering (Product Management, etc.) |
| `companies` | Company taxonomy for tagging questions |
| `coaching_services` | Coaching service listings |
| `courses` | Course listings |
| `events` | Event listings |
| `hero_items` | Hero Priority Board items — priority 1..3 = slotted, NULL = bench; visible flag, IST schedule window, 16:9 image, surface |
| `cohort_settings` | Single-row config for cohort page CTA links (apply_url, whatsapp_url) |
| `cohort_testimonials` | Cohort review wall — kind: text / video (YouTube) / image; visible flag, display_order |

### Key RPCs

| Function | Purpose |
|----------|---------|
| `increment_upvotes(question_id)` | Legacy upvote increment (security definer) |
| `toggle_question_like(p_question_id)` | Idempotent like toggle; updates `upvotes` counter |
| `flag_comment(p_comment_id, p_reason, p_details)` | Atomic user report: flags the comment + writes the `moderation_log` row (security definer; authenticated only) |
| `get_companies_with_counts(include_inactive)` | Returns company name + published question count |
| `is_admin(user_id)` | RLS helper — returns true if user has `is_admin = true` in profiles |

