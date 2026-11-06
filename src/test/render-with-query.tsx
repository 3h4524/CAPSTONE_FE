import type { ReactElement, ReactNode } from "react";

import { createTestQueryClient } from "@/test/render-query-hook";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

export const renderWithQuery = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...render(ui, { wrapper }), queryClient };
};
