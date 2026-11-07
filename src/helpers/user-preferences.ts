import { changeAppLanguage } from "@/i18n/client";
import type { Profile } from "@/types/profile";

export const applyUserPreferences = (preferences: Pick<Profile, "language" | "themePreference">) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const theme = preferences.themePreference ?? "system";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  root.classList.toggle("dark", isDark);
  root.dataset.theme = theme;
  root.lang = preferences.language || "en";
  void changeAppLanguage(preferences.language);
};
