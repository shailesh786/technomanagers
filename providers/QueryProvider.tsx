'use client';

/**
 * providers/QueryProvider.tsx — TanStack Query client provider
 *
 * Creates the QueryClient once per session using useState so the client is
 * not re-created on every server render. Config mirrors the original
 * QueryClient in src/App.tsx exactly:
 *   staleTime 60 s, gcTime 5 min, retry 1, refetchOnWindowFocus false.
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
