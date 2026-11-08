"use client";

import { useSyncExternalStore } from "react";

// `.dark` on <html> is the single source of truth (set by THEME_BOOT_SCRIPT and applyTheme).
// Libraries that need a theme prop (sonner, etc.) read it through this hook.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export const useIsDarkTheme = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
