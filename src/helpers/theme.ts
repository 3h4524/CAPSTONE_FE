import { THEME_VALUES } from "@/constants/profile";

export type ThemePreference = (typeof THEME_VALUES)[number];

// The saved theme lives on the backend profile. These keys are only a per-device copy so the
// right colours are painted before React hydrates and the profile request returns.
// Keyed by user id so two people sharing one browser never see each other's theme.
const THEME_KEY_PREFIX = "pod:theme:";
const ACTIVE_USER_KEY = "pod:theme:active-user";

const themeKey = (userId: string) => `${THEME_KEY_PREFIX}${userId}`;

export const toThemePreference = (value: string | null | undefined): ThemePreference =>
  THEME_VALUES.includes(value as ThemePreference) ? (value as ThemePreference) : "system";

const prefersDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

export const applyTheme = (preference: string | null | undefined) => {
  if (typeof document === "undefined") return;

  const theme = toThemePreference(preference);
  const isDark = theme === "dark" || (theme === "system" && prefersDark());
  const root = document.documentElement;

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.theme = theme;
};

export const readStoredTheme = (userId: string): ThemePreference | null => {
  try {
    const value = window.localStorage.getItem(themeKey(userId));
    return value ? toThemePreference(value) : null;
  } catch {
    return null;
  }
};

export const rememberUserTheme = (userId: string, preference: string | null | undefined) => {
  try {
    window.localStorage.setItem(themeKey(userId), toThemePreference(preference));
    window.localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch {
    // Storage blocked (private mode, quota): the profile request still applies the theme.
  }
};

// Signing out keeps `pod:theme:<id>` so the same person gets their colours instantly next time,
// but drops the active-user pointer so the login page and the next person start from "system".
export const forgetActiveThemeUser = () => {
  try {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  } catch {
    // ignore
  }
  applyTheme("system");
};

// Runs inline in <head> before first paint. Must stay dependency-free plain JS.
export const THEME_BOOT_SCRIPT = `(function(){try{
var p="${THEME_KEY_PREFIX}",d=document.documentElement,s=window.localStorage,u=null,t="system";
try{u=s.getItem("${ACTIVE_USER_KEY}");if(u){t=s.getItem(p+u)||"system";}}catch(e){}
if(t!=="light"&&t!=="dark")t="system";
var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)");
var apply=function(){var th=d.dataset.theme||t;var dark=th==="dark"||(th==="system"&&m&&m.matches);
d.classList.toggle("dark",!!dark);d.style.colorScheme=dark?"dark":"light";};
d.dataset.theme=t;apply();
if(m&&m.addEventListener)m.addEventListener("change",function(){if(d.dataset.theme==="system")apply();});
}catch(e){}})();`;
