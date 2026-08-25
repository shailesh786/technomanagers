/**
 * lib/hub-page.tsx — one implementation behind the three hub routes
 * (/questions/company/[slug], /questions/category/[slug],
 * /questions/role/[slug]). Each route file is a thin wrapper calling
 * createHubPage(kind); everything they share lives here.
 *
 * Server-only, cookieless, ISR (the route files declare `revalidate`).
 * The page: breadcrumb › h1 › data-driven intro › the hub's questions as
 * QuestionCards › "Browse more" links into the sibling hubs, plus
 * CollectionPage/ItemList + BreadcrumbList JSON-LD. Sub-threshold hubs render
 * but are noindex (see lib/hubs.ts).
 */

import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import HubQuestionList from '@/components/questions/HubQuestionList';
import { getHubQuestions, getHubTaxonomy } from '@/lib/hub-data';
import {
  findHub,
  hubDescription,
  hubHref,
  hubIntro,
  hubJsonLd,
  hubStats,
  hubTitle,
  isIndexable,
  pickBrowseHubs,
  type HubKind,
  type HubRef,
} from '@/lib/hubs';
import { serializeJsonLd } from '@/lib/question-seo';
import { resolveSiteUrl } from '@/lib/site-url';

interface RouteProps {
  params: { slug: string };
}

function BrowseChips({ heading, hubs }: { heading: string; hubs: HubRef[] }) {
  if (!hubs.length) return null;
  return (
    <div>
      <h2 className="font-heading font-bold text-sm mb-3">{heading}</h2>
      <div className="flex flex-wrap gap-2">
        {hubs.map((hub) => (
          <Link
            key={hub.slug}
            href={hubHref(hub.kind, hub.name)}
            className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {hub.name} <span aria-hidden="true">({hub.count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function createHubPage(kind: HubKind) {
  // Deduplicates the taxonomy + questions reads between generateMetadata and
  // the page component within one render.
  const load = cache(async (slug: string) => {
    const taxonomy = await getHubTaxonomy();
    const hub = findHub(taxonomy, kind, slug);
    if (!hub) return null;
    const questions = await getHubQuestions(kind, hub.name);
    // The tag can vanish between the cached taxonomy and now (question edited);
    // an empty hub is a 404, not an empty shell.
    if (!questions.length) return null;
    return { taxonomy, hub, questions };
  });

  async function generateStaticParams() {
    const taxonomy = await getHubTaxonomy();
    return taxonomy[kind].map(({ slug }) => ({ slug }));
  }

  async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
    const data = await load(params.slug);
    if (!data) return { title: 'Not Found' };
    const { hub, questions } = data;

    const title = hubTitle(hub);
    const description = hubDescription(hub, hubStats(hub, questions).crossNames);
    const path = hubHref(kind, hub.name);
    return {
      title,
      description,
      alternates: { canonical: path },
      // The page is real either way, but only worth indexing once it holds
      // enough questions to stand on its own; flips automatically as the
      // bank grows past the threshold.
      ...(isIndexable(hub) ? {} : { robots: { index: false, follow: true } }),
      openGraph: { title: `${title} | Technomanagers`, description, type: 'website', url: path },
    };
  }

  async function HubPage({ params }: RouteProps) {
    const data = await load(params.slug);
    if (!data) notFound();
    const { taxonomy, hub, questions } = data;
    const browse = pickBrowseHubs(taxonomy, hub);

    return (
      <>
        <script
          type="application/ld+json"
          // Server-rendered from our own database rows; serializeJsonLd
          // escapes `<` so content cannot close the script element.
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(hubJsonLd({ hub, questions, siteUrl: resolveSiteUrl() })),
          }}
        />
        <div className="container py-8 max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="hover:text-foreground">Home</Link></li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li><Link href="/questions" className="hover:text-foreground">Questions</Link></li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li aria-current="page" className="text-foreground">{hub.name}</li>
            </ol>
          </nav>

          <h1 className="font-heading font-extrabold text-2xl md:text-3xl leading-tight mb-3">{hubTitle(hub)}</h1>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">{hubIntro(hub, hubStats(hub, questions))}</p>

          <HubQuestionList questions={questions} />

          {hub.count > questions.length && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing the top {questions.length} of {hub.count} questions.{' '}
              <Link href="/questions" className="text-secondary hover:text-primary transition-colors">
                Browse all questions
              </Link>
            </p>
          )}

          <section aria-label="Browse more questions" className="mt-10 pt-8 border-t space-y-6">
            <BrowseChips heading="Browse by category" hubs={browse.categories} />
            <BrowseChips heading="Browse by company" hubs={browse.companies} />
          </section>
        </div>
      </>
    );
  }

  return { generateStaticParams, generateMetadata, Page: HubPage };
}
