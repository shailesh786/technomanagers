/**
 * Per-question share card: the question text with its companies and
 * difficulty. Unknown/unpublished id (or any error, e.g. a non-UUID slug)
 * falls back to the site-wide card — this route must never throw.
 */

import { createSupabasePublicClient } from '@/lib/supabase/public';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard, SITE_OG_CARD } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'PM interview question on Technomanagers';

export default async function OgImage({ params }: { params: { id: string } }) {
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase
      .from('questions')
      .select('question_text, company, difficulty')
      .eq('id', params.id)
      .eq('status', 'published')
      .maybeSingle();
    if (data?.question_text) {
      const companies = (data.company ?? []).slice(0, 2).join(' · ');
      return renderOgCard({
        eyebrow: companies ? `Asked at ${companies}` : 'PM Interview Question',
        title: data.question_text,
        meta: [data.difficulty, 'Sample answer & community answers inside'].filter(Boolean).join(' · '),
      });
    }
  } catch {
    // fall through to the site card
  }
  return renderOgCard(SITE_OG_CARD);
}
