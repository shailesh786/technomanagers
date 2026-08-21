# Deploying the cohort testimonial wall

Branch: `feat/cohort-testimonials-dynamic`

This change adds one new table, one new storage bucket, one new API route and a
new `/admin` tab. **The SQL must be applied before the code is merged** — see
*Why the order matters* below.

No new environment variables are needed.

---

## 1. Apply the migration (Supabase Dashboard → SQL Editor)

Paste the whole of
[`supabase/migrations/20260821000000_cohort_testimonials.sql`](../supabase/migrations/20260821000000_cohort_testimonials.sql)
into the SQL Editor and run it.

It is written to be safe to re-run: the bucket insert uses `ON CONFLICT DO
NOTHING`, the storage policies are dropped first, and the seed rows are guarded
by `WHERE NOT EXISTS`. If it fails partway, fix the error and run the whole
script again rather than running fragments.

What it creates:

| Object | Purpose |
|---|---|
| `public.cohort_testimonials` | The rows behind the wall |
| `cohort_testimonials_stream_idx` | Partial index matching the page's only read |
| 4 RLS policies on the table | Anon reads visible rows; admins do everything |
| `storage.buckets` row `testimonial-images` | Screenshots and poster overrides |
| 4 RLS policies on `storage.objects` | Public read, admin write |
| `update_cohort_testimonials_updated_at` trigger | Reuses the existing shared function |

It also **seeds the content that is live on `/cohort` today**: the 3 Cloudinary
video testimonials and the 19 review screenshots that were hardcoded in
`CohortPage.tsx`. Nothing invented is seeded — the section is being moved out of
source code and into the database, so the page keeps its social proof through
the deploy.

### Verify before moving on

In the SQL Editor:

```sql
-- 22 rows: 3 video + 19 image
select kind, count(*) from public.cohort_testimonials group by kind order by kind;

-- Should list 4 policies
select policyname from pg_policies where tablename = 'cohort_testimonials';

-- Should return one row, public = true
select id, public from storage.buckets where id = 'testimonial-images';
```

You can also confirm anon read access works — this is exactly the query the
page's ISR fetch makes — using the anon key from `.env.local`:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/cohort_testimonials?select=id,kind,visible&visible=eq.true" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" | head -c 400
```

An empty array here means RLS is blocking anon reads and the section will be
invisible in production — do not merge until this returns rows.

---

## 2. Ship the code

```bash
git push -u origin feat/cohort-testimonials-dynamic
```

Then open the compare URL, review, and merge to `main`:

https://github.com/shailesh786/technomanagers/compare/main...feat/cohort-testimonials-dynamic?expand=1

Vercel auto-deploys `main`.

### Why the order matters

The page's fetch swallows a missing-table error and simply hides the section, so
merging first would not break the public page — but `/admin → Testimonials`
would fail to load, and `/cohort` would silently lose all its reviews until the
SQL ran. Applying the SQL first means the wall is populated the moment the
deploy goes live.

---

## 3. After the deploy

1. Open `/cohort` and confirm the wall renders with the seeded content.
2. Open `/admin → Testimonials`.
3. **Replace the three Cloudinary videos with YouTube links.** They are direct
   MP4s, so YouTube cannot supply a poster frame and they currently render the
   brand gradient with a play badge. Editing each one and pasting the YouTube
   URL for the same story fixes it — the poster then comes from the video id
   automatically. (Alternatively, upload a poster image for each.)
4. Add the written testimonials. These are the highest-value rows: they are the
   only kind that becomes crawlable text and `schema.org` review markup.

### If the wall is empty even though the rows are there

The Supabase read is wrapped in `unstable_cache`, and that cache is keyed on
`cohort-testimonials` and persisted — on Vercel across deployments, and locally
in `.next/cache`. If anything rendered the page *before* the table existed, the
empty result it cached is what keeps being served, and no amount of reloading
fixes it. The database is fine; the cache is stale.

Clear it by any of:

- **Any edit in `/admin → Testimonials`** — every mutation POSTs to
  `/api/revalidate/cohort`, which flushes the tag. Toggling a row's visibility
  off and on again is enough.
- **Vercel → Deployments → Redeploy** with "Use existing Build Cache" *off*.
- **Locally:** `rm -rf .next/cache` and restart the dev server.
- Or just wait out the 5-minute `revalidate` window.

This is only a risk when code reaches an environment before the SQL does, which
is why the order in this document is SQL first, merge second.

### Rollback

The change is additive. To take just the wall down without redeploying, hide
every row (`update public.cohort_testimonials set visible = false;`) — the
section removes itself entirely when nothing is visible. To revert the code,
revert the merge commit; the table can stay.

---

## Operating notes

**Caching.** `/cohort` is statically generated with `revalidate = 300`, and the
Supabase read is separately wrapped in `unstable_cache` tagged
`cohort-testimonials`. Every admin mutation POSTs to `/api/revalidate/cohort`,
which flushes that tag, so edits appear within a second. If that request fails
it is swallowed — the change still lands within the 5-minute window.

**Storage.** Screenshots and poster overrides go to the `testimonial-images`
bucket, capped at 2 MB per file by `ImageUpload`. Deleting a testimonial does
not delete its uploaded image; that is deliberate (deletes are irreversible and
an orphaned image costs nothing), but the bucket will accumulate over time.

**A logged 404 from `i.ytimg.com` is expected, not a fault.** Posters try
`maxresdefault.jpg` first and fall back to `hqdefault.jpg`, which YouTube
generates for every video. Only low-resolution or older uploads trigger the
fallback. `hqdefault` is 4:3, so those cards show black bars — upload a poster
override for any video where that looks bad.

**Regenerating Supabase types.** `hooks/useCohortTestimonials.ts` casts the
client to `any`, matching the existing hero and cohort-settings hooks, because
the generated `Database` type does not know about this table. If
`supabase gen types` is re-run, that cast and its comment can go.
