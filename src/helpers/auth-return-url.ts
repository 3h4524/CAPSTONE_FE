export const getSafeReturnUrl = (): string => {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  const value = new URLSearchParams(window.location.search).get("returnUrl");
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
};
