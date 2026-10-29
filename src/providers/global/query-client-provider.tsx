"use client";

import { useMemo } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Reuse recently fetched page data during client-side navigation. Mutations
            // invalidate their affected keys so edits still appear immediately.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
