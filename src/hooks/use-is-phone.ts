import { useSyncExternalStore } from "react";

const PHONE_QUERY = "(max-width: 767.98px)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** For layouts CSS cannot switch alone: below the `md` breakpoint, whatever the pointer. */
export const useIsPhone = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false
  );
