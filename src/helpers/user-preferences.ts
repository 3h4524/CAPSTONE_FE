import { applyTheme } from "@/helpers/theme";
import { changeAppLanguage } from "@/i18n/client";
import type { Profile } from "@/types/profile";

export const applyUserPreferences = (preferences: Pick<Profile, "language" | "themePreference">) => {
  if (typeof document === "undefined") return;

  applyTheme(preferences.themePreference);
  document.documentElement.lang = preferences.language || "en";
  void changeAppLanguage(preferences.language);
};
