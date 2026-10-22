import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, type RenderHookOptions } from "@testing-library/react";

// `retry: false` keeps a failing query at exactly one network call so tests can assert the
// wrapper's `retry: 0`, and `gcTime: 0` stops one test's cache from leaking into the next.
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

export const renderQueryHook = <TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: Omit<RenderHookOptions<TProps>, "wrapper"> = {}
) => {
  const queryClient = createTestQueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { ...renderHook(hook, { ...options, wrapper }), queryClient };
};
