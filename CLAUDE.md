# Technomanagers — Next.js Migration Guide

This file is the source of truth for Claude Code in this repository.
Read it fully before making any changes.

---

## Project Overview

**Technomanagers** is a community platform for product managers — featuring interview question prep, coaching services, courses, events, and a cohort programme.

We are migrating from a **Lovable (Vite + React Router)** project to **Next.js 14 App Router** for maximum performance and SEO.

---

## Current Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Scaffold: Next.js skeleton, Supabase SSR utils, config | ✅ Complete |
| 2 | Migrate SSR pages: `/`, `/questions`, `/questions/[id]`, `/coaching`, `/courses`, `/cohort`, `/events` | ⏳ Pending |
| 3 | Migrate CSR pages: `/auth`, `/profile`, `/admin` + replace Lovable auth with native Supabase OAuth | ⏳ Pending |
| 4 | Migrate shared components: Navbar, Footer, layout wrappers, providers | ⏳ Pending |
| 5 | SEO: `generateMetadata` on all SSR pages, `app/sitemap.ts`, `robots.ts` | ⏳ Pending |
| 6 | Remove Vite artefacts (`index.html`, `vite.config.ts`, `src/main.tsx`) | ⏳ Pending |
| 7 | Vercel deployment config, env vars, final QA | ⏳ Pending |

---

## Architecture Decisions

### Directory Layout

```
technomanagers/
├── app/                     ← Next.js App Router (new)
│   ├── layout.tsx           ← Root layout: Navbar, Footer, all Providers
│   ├── page.tsx             ← / (SSR)
│   ├── not-found.tsx        ← 404
│   ├── sitemap.ts           ← Dynamic XML sitemap
│   ├── questions/
│   │   ├── page.tsx         ← /questions (SSR)
│   │   └── [id]/page.tsx    ← /questions/[id] (SSR)
│   ├── coaching/page.tsx    ← /coaching (SSR)
│   ├── courses/page.tsx     ← /courses (SSR)
│   ├── cohort/page.tsx      ← /cohort (SSR)
│   ├── events/page.tsx      ← /events (SSR)
│   ├── auth/page.tsx        ← /auth (CSR — 'use client')
│   ├── profile/page.tsx     ← /profile (CSR — 'use client')
│   └── admin/[[...slug]]/   ← /admin/* (CSR — protected)
│       └── page.tsx
│
├── lib/
│   └── supabase/
│       ├── server.ts        ← Server-side client (@supabase/ssr, for RSC + Route Handlers)
│       ├── client.ts        ← Browser singleton (replaces src/integrations/supabase/client.ts)
│       └── middleware-client.ts  ← Session-refresh client (used only in middleware.ts)
│
├── middleware.ts            ← Edge middleware: refreshes Supabase auth cookie on every request
├── next.config.ts           ← Next.js config
│
├── src/                     ← LEGACY Vite app — DO NOT DELETE until Phase 6
│   ├── components/          ← Will be moved to /components in Phase 4
│   ├── contexts/            ← Will be moved to /contexts in Phase 4
│   ├── hooks/               ← Will be moved to /hooks in Phase 4
│   ├── integrations/        ← lovable/ will be deleted; supabase/ superseded by lib/supabase/
│   ├── pages/               ← Will be migrated into app/ pages in Phases 2–3
│   └── types/               ← Will be moved to /types in Phase 4
│
└── supabase/                ← Supabase config & migrations — NEVER modify
```

### SSR vs CSR Split

| Route | Rendering | Reason |
|-------|-----------|--------|
| `/` | SSR (RSC) | Public landing — needs og:image, meta, fast FCP |
| `/questions` | SSR (RSC) | Indexed by search engines; initial data from server |
| `/questions/[id]` | SSR (RSC) | Individual question pages need per-page meta/OG |
| `/coaching` | SSR (RSC) | Public marketing page |
| `/courses` | SSR (RSC) | Public marketing page |
| `/cohort` | SSR (RSC) | Public marketing page |
| `/events` | SSR (RSC) | Public marketing page |
| `/auth` | CSR | No crawlable content; browser-only OAuth flow |
| `/profile` | CSR | Authenticated-only, personalised content |
| `/admin` | CSR | Protected; no SEO value |

### Auth Architecture

**Old (removed):** `@lovable.dev/cloud-auth-js` — Lovable platform wrapper that proxied OAuth through their servers and called `supabase.auth.setSession(tokens)`.

**New:** Native Supabase Auth via `@supabase/ssr`.

Key differences:
- OAuth is initiated directly via `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`
- A new **`/auth/callback` Route Handler** (`app/auth/callback/route.ts`) will exchange the PKCE code for a session and set the cookie — this is created in Phase 3
- Session is stored in **cookies** (not `localStorage`) so the server can read it in RSC
- `middleware.ts` calls `supabase.auth.getSession()` on every request to keep the cookie fresh

**Required Supabase Dashboard change (before Phase 3):**
Add `https://yourdomain.com/auth/callback` to:
→ Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

### `@/` Path Alias — Dual-Alias Strategy

During migration both Vite (`src/`) and Next.js (root) code coexist.

```json
// tsconfig.json paths
"@/*": ["./*"],       ← Next.js code uses this (app/, lib/, components/, etc.)
"@src/*": ["./src/*"] ← Legacy Vite src/ code keeps using @src/ during transition
```

When a `src/` file is **migrated** into the Next.js structure, update its imports from `@src/` → `@/`.

### Supabase Client Rules

| Context | Import from | Client type |
|---------|-------------|-------------|
| React Server Component / Route Handler | `@/lib/supabase/server` | `createServerClient` |
| Client Component (`'use client'`) | `@/lib/supabase/client` | `createBrowserClient` (singleton) |
| `middleware.ts` only | `@/lib/supabase/middleware-client` | `createServerClient` with cookie adapter |
| Legacy `src/` code (pre-migration) | `@src/integrations/supabase/client` | Old browser client — **do not use in new files** |

**Never** import `@/lib/supabase/server` inside a Client Component — it will throw at runtime.

---

## Tech Stack (Post-Migration)

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
| Fonts | Plus Jakarta Sans (headings), DM Sans (body) — loaded via `next/font/google` |
| Images | `next/image` — replaces all `<img>` tags |
| Deployment | Vercel |

---

## Performance & SEO Constraints

1. **No `'use client'` in page-level components for SSR routes** — RSC must do the initial data fetch
2. **All `<img>` tags → `<Image>` from `next/image`** with explicit `width`, `height` or `fill`
3. **`generateMetadata`** must be exported from every SSR page — see Phase 5
4. **Dynamic imports** (`next/dynamic`) replace React `lazy()` for CSR pages
5. **TanStack Query** is used only in Client Components for interactive re-fetching after hydration; initial data is passed as props from the RSC parent
6. **Font loading** — use `next/font/google` in `app/layout.tsx`; never link Google Fonts via `<link>` in HTML
7. **`robots.txt`** — replace the static `public/robots.txt` with `app/robots.ts` in Phase 5

---

## Env Vars

The following env vars must exist. Rename from `VITE_` to `NEXT_PUBLIC_` for client-side exposure:

| Old (Vite) | New (Next.js) | Used in |
|------------|---------------|---------|
| `VITE_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase clients |

Create `.env.local` at the project root (never commit it):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## What NOT to Do

- ❌ Do not change any Supabase queries or data models in `src/`
- ❌ Do not modify any file inside `supabase/migrations/`
- ❌ Do not refactor or clean up business logic — only migrate it
- ❌ Do not change UI/visual design — pixel-perfect match is required
- ❌ Do not delete `src/` until Phase 6 is explicitly started
- ❌ Do not import `@/lib/supabase/server` in any `'use client'` file
- ❌ Do not use `localStorage` for auth tokens — cookies only in Next.js
- ❌ Do not add `export const dynamic = 'force-dynamic'` unless a page genuinely cannot be statically generated
- ❌ Do not use `react-router-dom` — it is removed

---

## Component Migration Checklist (Phase 4)

When moving a component from `src/components/` to `components/`:

1. Update the import path from `@src/` → `@/`
2. Add `'use client'` at the top if the component uses: `useState`, `useEffect`, `useRef`, event handlers, browser APIs, or any hook
3. Replace `<img>` → `<Image from 'next/image'>`
4. Replace `<a href>` → `<Link from 'next/link'>`
5. Replace `useNavigate` → `useRouter` from `next/navigation`
6. Replace `useParams` → `useParams` from `next/navigation` (same name, different import)
7. Replace `<Link to="...">` from react-router-dom → `<Link href="...">` from `next/link`
8. Remove any `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — Providers, Navbar, Footer |
| `lib/supabase/server.ts` | Server Supabase client factory |
| `lib/supabase/client.ts` | Browser Supabase singleton |
| `middleware.ts` | Session cookie refresh on every request |
| `src/contexts/AuthContext.tsx` | Legacy auth context — will be rewritten in Phase 3 |
| `src/integrations/lovable/index.ts` | **To be deleted in Phase 3** |
| `src/integrations/supabase/client.ts` | Legacy browser client — superseded by `lib/supabase/client.ts` |
| `src/types/index.ts` | Shared TypeScript types — copy to `types/index.ts` in Phase 4 |
| `supabase/migrations/` | DB schema — never touch |
