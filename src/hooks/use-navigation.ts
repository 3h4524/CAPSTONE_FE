"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { scrollToSection } from "@/helpers/scroll";
import type { NavItem } from "@/types/navigation";

export const useNavigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const navigateToSection = useCallback(
    (sectionId: string) => {
      const cleanId = sectionId.replace(/^#/, "");
      if (pathname !== "/") {
        router.push(`/#${cleanId}`);
        return;
      }

      window.history.replaceState(null, "", `/#${cleanId}`);
      scrollToSection(cleanId);
    },
    [pathname, router]
  );

  const navigateToRoute = useCallback(
    (href: string) => {
      if (pathname === href) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(href);
    },
    [pathname, router]
  );

  const handleNavClick = useCallback(
    (item: NavItem) => {
      if (item.kind === "route") {
        navigateToRoute(item.href);
        return;
      }
      navigateToSection(item.href);
    },
    [navigateToRoute, navigateToSection]
  );

  const isItemActive = useCallback(
    (item: NavItem) => {
      if (item.kind === "route") {
        return (
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href))
        );
      }
      return false;
    },
    [pathname]
  );

  useEffect(() => {
    if (pathname !== "/") return;

    const hash = window.location.hash;
    if (!hash) return;

    const sectionId = hash.replace("#", "");
    if (!sectionId) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToSection(sectionId);
      });
    });
  }, [pathname]);

  return {
    navigateToSection,
    navigateToRoute,
    handleNavClick,
    isItemActive,
  };
};
