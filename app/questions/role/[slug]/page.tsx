/**
 * /questions/role/[slug] — role hub page. Thin wrapper; the shared
 * implementation (data, copy, JSON-LD, layout) lives in lib/hub-page.tsx.
 */

import { createHubPage } from '@/lib/hub-page';

export const revalidate = 300;

const hub = createHubPage('role');

export const generateStaticParams = hub.generateStaticParams;
export const generateMetadata = hub.generateMetadata;
export default hub.Page;
