# Technomanagers

A community platform for product managers — featuring interview question prep, coaching services, courses, events, and a cohort programme.

Built on **Next.js 14 App Router** with Supabase for the database and auth, deployed on Vercel.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 + CSS variables |
| Components | shadcn/ui (Radix UI primitives) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth via `@supabase/ssr` (cookie-based, SSR-safe) |
| Data fetching (client) | TanStack Query v5 |
| Forms | react-hook-form + zod |
| Fonts | Plus Jakarta Sans (headings), DM Sans (body) via `next/font/google` |
| Images | `next/image` |
| Testing | Vitest + Testing Library |
| Deployment | Vercel |

---

## Prerequisites

### 1. Install Homebrew (Mac)

If you don't have Homebrew installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the prompts. After installation, add Homebrew to your PATH if prompted (required on Apple Silicon Macs):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 2. Install nvm (Node Version Manager)

nvm lets you switch Node versions per project — required because this repo pins a specific version via `.nvmrc`.

```bash
brew install nvm
```

Add nvm to your shell profile. Open `~/.zprofile` (or `~/.zshrc`) and add:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
```

Reload your shell:

```bash
source ~/.zprofile   # or: source ~/.zshrc
```

Verify nvm is working:

```bash
nvm --version
```

### 3. Install the correct Node version

The repo includes a `.nvmrc` file. From inside the project directory, run:

```bash
nvm install   # installs the version pinned in .nvmrc
nvm use       # switches to that version
```

Verify:

```bash
node --version   # should match the version in .nvmrc
```

> **Tip:** To auto-switch Node versions when you `cd` into the project, add this to your `~/.zshrc`:
> ```bash
> autoload -U add-zsh-hook
> load-nvmrc() {
>   local nvmrc_path
>   nvmrc_path="$(nvm_find_nvmrc)"
>   if [ -n "$nvmrc_path" ]; then
>     nvm use
>   fi
> }
> add-zsh-hook chpwd load-nvmrc
> load-nvmrc
> ```

---

## Local Setup

### 1. Clone the repo

```bash
git clone git@github.com:shailesh786/technomanagers.git
cd technomanagers
```

### 2. Use the correct Node version

```bash
nvm use
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env.local` file in the project root (never commit this file — it is gitignored):

```bash
touch .env.local
```

Add the following variables (get the values from **Supabase Dashboard → Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Apply database migrations (first-time setup only)

If you are setting up a fresh Supabase project, apply all migration files in order via **Supabase Dashboard → SQL Editor**.

Migration files live in `supabase/migrations/` — run them in **chronological order** (the filename timestamp prefix is the correct order).

---

## Running Locally

```bash
# Start the development server at http://localhost:3000
npm run dev

# Type-check without emitting output
npm run type-check

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Build for production (validates ISR static generation — catches cookie-in-cache bugs)
npm run build

# Serve the production build locally
npm start
```

> **SSL note:** If you see SSL certificate errors when connecting to a local Supabase instance, use `npm run dev:local` or `npm run build:local` instead. These set `NODE_TLS_REJECT_UNAUTHORIZED=0`. **Never use this in production.**

---

## Project Structure

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
│   │   └── [id]/page.tsx         ← /questions/:id      (dynamic SSR + draft preview for admins)
│   ├── coaching/page.tsx         ← /coaching           (ISR, 300 s)
│   ├── courses/page.tsx          ← /courses            (ISR, 300 s)
│   ├── cohort/page.tsx           ← /cohort             (static)
│   ├── events/page.tsx           ← /events             (ISR, 300 s)
│   ├── auth/
│   │   ├── page.tsx              ← /auth sign-in       (CSR)
│   │   └── callback/route.ts     ← OAuth PKCE callback handler
│   ├── profile/page.tsx          ← /profile            (CSR, auth-gated)
│   ├── admin/[[...slug]]/
│   │   └── page.tsx              ← /admin/*            (CSR, admin-only)
│   └── api/revalidate/
│       ├── hero/route.ts         ← POST → flush hero slides ISR cache
│       └── questions/route.ts    ← POST → flush questions ISR cache
│
├── components/                   ← React components
│   ├── admin/                    ← Admin panel (questions, companies, roles, hero, cohort, users)
│   ├── coaching/                 ← Coaching listing + cards
│   ├── cohort/                   ← Cohort programme page
│   ├── courses/                  ← Courses listing + cards
│   ├── events/                   ← Events listing
│   ├── home/                     ← Hero slideshow, featured questions
│   ├── layout/                   ← Navbar, Footer, wrappers
│   ├── profile/                  ← Profile page
│   ├── questions/                ← Question list, card, filters, detail, comments
│   └── ui/                       ← shadcn/ui primitives (auto-generated, do not edit)
│
├── contexts/
│   ├── AuthContext.tsx            ← User session (Supabase Auth)
│   └── QuestionAccessContext.tsx  ← Question view-gating context
│
├── hooks/                        ← TanStack Query data hooks (client-side)
│   ├── useQuestions.ts            ← Questions list, upvote, save/unsave
│   ├── useQuestionFacets.ts       ← Per-filter option counts for faceted search
│   ├── useRoles.ts                ← Roles list + question counts
│   ├── useCompanies.ts            ← Companies list + question counts
│   ├── useCoaching.ts             ← Coaching services
│   ├── useCourses.ts              ← Courses
│   ├── useEvents.ts               ← Events
│   ├── useHeroSlides.ts           ← Hero slideshow CRUD (admin + public read)
│   ├── useCohortSettings.ts       ← Cohort CTA links config (admin editable)
│   └── ...
│
├── lib/
│   └── supabase/
│       ├── server.ts              ← Server client — RSC + route handlers (reads cookies)
│       ├── client.ts              ← Browser singleton — 'use client' components only
│       ├── public.ts              ← Cookieless anon client — ISR-safe public data reads
│       └── middleware-client.ts   ← Session-refresh client — middleware.ts only
│
├── providers/
│   └── QueryProvider.tsx          ← TanStack Query client wrapper
│
├── types/
│   └── index.ts                   ← Shared TypeScript interfaces
│
├── supabase/
│   └── migrations/                ← SQL migrations — never edit existing files
│
├── middleware.ts                  ← Edge: refreshes Supabase auth cookie on every request
├── next.config.ts                 ← Next.js config
├── tailwind.config.ts             ← Tailwind config + design tokens
└── vitest.config.ts               ← Test runner config
```

---

## Git Workflow

### Branching convention

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deploys to Vercel on every push |
| `feat/<description>` | New feature |
| `fix/<description>` | Bug fix |
| `perf/<description>` | Performance improvement |

### Daily workflow

```bash
# 1. Start from an up-to-date main
git checkout main
git pull

# 2. Create a feature branch
git checkout -b feat/your-feature-name

# 3. Make changes, then stage specific files
#    (avoid `git add .` — it can accidentally include .env files or build artifacts)
git add components/home/HeroSlideshow.tsx hooks/useHeroSlides.ts

# 4. Commit with a descriptive message
#    Common prefixes: feat | fix | perf | refactor | docs | chore
git commit -m "feat: add auto-scroll to hero slideshow"

# 5. Push your branch
git push -u origin feat/your-feature-name
```

### Opening a Pull Request

Using the GitHub CLI:

```bash
gh pr create \
  --title "Add auto-scroll to hero slideshow" \
  --body "$(cat <<'EOF'
## Summary
- Hero slideshow now auto-advances every 5 s when there is more than one slide
- Manual arrow navigation pauses the timer and resumes after the next tick
- Falls back gracefully if only one slide is configured

## Test plan
- [ ] Add 2+ slides in admin panel → slideshow auto-scrolls on homepage
- [ ] Click arrows → navigation works; auto-scroll resumes
- [ ] Single slide → no arrows, no auto-scroll
EOF
)"
```

You can also open a PR via the GitHub web interface at `github.com/shailesh786/technomanagers`.

### After your PR is merged

```bash
git checkout main
git pull
git branch -d feat/your-feature-name   # delete the local branch
```

---

## Admin Panel

Navigate to `/admin` (must be signed in as an admin user). Tabs available:

| Tab | Manages |
|-----|---------|
| Questions | Add / edit / delete / publish interview questions |
| Companies | Manage company list used for tagging questions |
| Roles | Manage role list used for filtering |
| Coaching | Add / edit coaching service listings |
| Courses | Add / edit course listings |
| Events | Add / edit events |
| Homepage Hero | Configure the hero slideshow slides and CTAs |
| Cohort | Edit the "Apply Now" and "Ask on WhatsApp" CTA links |
| Users | View users; toggle admin status |

### Flushing ISR caches manually

ISR caches are flushed automatically when you save/delete content via the admin panel. To flush manually:

```bash
# Flush the homepage hero cache
curl -X POST https://your-domain.com/api/revalidate/hero

# Flush the questions cache (homepage + listing page)
curl -X POST https://your-domain.com/api/revalidate/questions
```

---

## Database Migrations

- **Never edit existing migration files.** Each file is a point-in-time snapshot of a schema change.
- Create new migrations for every schema change:

```bash
# Name format: YYYYMMDDHHMMSS_describe_the_change.sql
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_waitlist_table.sql
```

Write your SQL (table, RLS policies, triggers, grants), then apply it via **Supabase Dashboard → SQL Editor**. Commit the file to the repo.

---

## Deployment

The app auto-deploys to **Vercel** on every push to `main`.

**Required environment variables** (set in Vercel Dashboard → Project → Settings → Environment Variables):

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |

**ISR cache TTLs** (how long Vercel serves a cached page before regenerating):

| Route | TTL |
|-------|-----|
| `/` | 5 minutes |
| `/questions` | 1 minute |
| `/coaching` | 5 minutes |
| `/courses` | 5 minutes |
| `/events` | 5 minutes |
| `/cohort` | Static (redeployed on new commit) |
| `/questions/[id]` | Dynamic — served fresh per request |
