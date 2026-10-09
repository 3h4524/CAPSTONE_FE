import { vi } from "vitest";

export const routerPush = vi.fn();
export const routerReplace = vi.fn();
export const routerBack = vi.fn();
export const routerForward = vi.fn();
export const routerRefresh = vi.fn();
export const routerPrefetch = vi.fn();

export const useRouter = () => ({
  push: routerPush,
  replace: routerReplace,
  back: routerBack,
  forward: routerForward,
  refresh: routerRefresh,
  prefetch: routerPrefetch,
});

export const usePathname = vi.fn(() => "/");

export const useSearchParams = vi.fn(() => new URLSearchParams());

export const useParams = vi.fn(() => ({}));

export const useSelectedLayoutSegment = vi.fn(() => null);

export const useSelectedLayoutSegments = vi.fn(() => []);

export const redirect = vi.fn();

export const permanentRedirect = vi.fn();

export const notFound = vi.fn();

export const RedirectType = { push: "push", replace: "replace" } as const;