import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** The `lg` breakpoint, where the workflow canvas replaces the phone step list. */
export const useIsDesktop = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  );
