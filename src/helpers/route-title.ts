import { ROUTE_TITLES } from "@/constants/navigation";
import type { RouteTitle } from "@/types/navigation";

const isUnderPath = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

export const findRouteTitle = (pathname: string | null): RouteTitle | null => {
  if (!pathname) return null;

  return (
    ROUTE_TITLES.filter((route) => isUnderPath(pathname, route.path)).sort(
      (first, second) => second.path.length - first.path.length
    )[0] ?? null
  );
};
