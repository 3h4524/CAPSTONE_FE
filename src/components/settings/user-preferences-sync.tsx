"use client";

import { useEffect } from "react";

import { applyTheme, readStoredTheme, rememberUserTheme } from "@/helpers/theme";
import { applyUserPreferences } from "@/helpers/user-preferences";
import { useProfile } from "@/hooks/queries/use-profile";
import { useAuthStore } from "@/stores/auth";

// System-theme changes are handled by THEME_BOOT_SCRIPT's matchMedia listener in the root layout.
export const UserPreferencesSync = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const { data } = useProfile();

  // Right after sign-in the profile is still loading: paint this user's last theme on this device.
  useEffect(() => {
    if (!userId) return;
    const stored = readStoredTheme(userId);
    if (stored) applyTheme(stored);
  }, [userId]);

  useEffect(() => {
    if (!data) return;
    applyUserPreferences(data);
    if (userId) rememberUserTheme(userId, data.themePreference);
  }, [data, userId]);

  return null;
};
