"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MOBILE_TABS } from "@/constants/navigation";
import { cn } from "@/utils/cn";

type MobileBottomNavProps = {
  /** Opens the full menu, which holds every page without a tab of its own. */
  onOpenMore: () => void;
  tabs?: typeof MOBILE_TABS;
  /** The tab to mark as needing attention. */
  alertHref?: string;
  isMoreOpen?: boolean;
};

const TAB_LABEL_KEYS: Record<string, string> = {
  "/dashboard": "navigation.items.dashboard",
  "/shop": "navigation.items.shop",
  "/workflows": "navigation.items.workflows",
  "/batches": "navigation.items.batches",
  "/admin/dashboard": "navigation.admin.items.dashboard",
  "/admin/users": "navigation.admin.items.users",
  "/admin/revenue": "commons.mobileTabs.revenue",
  "/admin/support-tickets": "navigation.items.support",
};

const TAB_CLASS_NAME =
  "text-muted-foreground focus-visible:ring-ring/40 flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset";
const ACTIVE_TAB_CLASS_NAME = "text-primary font-semibold";
const ICON_CLASS_NAME = "flex h-7 w-12 items-center justify-center rounded-full transition-colors";
const ACTIVE_ICON_CLASS_NAME = "bg-muted";

/**
 * The phone's main navigation. It sits in the shell's column rather than floating over the page,
 * so every page keeps its full height above it without reserving any space of its own.
 */
export const MobileBottomNav = ({ onOpenMore, tabs = MOBILE_TABS, alertHref, isMoreOpen = false }: MobileBottomNavProps) => {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const isTabActive = (href: string) => !isMoreOpen && (pathname === href || pathname.startsWith(`${href}/`));
  const isMoreActive = isMoreOpen || !tabs.some((tab) => isTabActive(tab.href));

  return (
    <nav aria-label={t("commons.mobileTabs.label")} className="bg-card grid shrink-0 grid-cols-5 border-t md:hidden">
      {tabs.map(({ label, href, icon: Icon }) => {
        const isActive = isTabActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(TAB_CLASS_NAME, isActive && ACTIVE_TAB_CLASS_NAME)}
          >
            <span className={cn("relative", ICON_CLASS_NAME, isActive && ACTIVE_ICON_CLASS_NAME)}>
              <Icon className="size-5" aria-hidden="true" />
              {href === alertHref && (
                <span className="absolute top-0.5 right-2.5 size-2 rounded-full bg-rose-500">
                  <span className="sr-only">{t("commons.mobileTabs.needsAttention")}</span>
                </span>
              )}
            </span>
            {TAB_LABEL_KEYS[href] ? t(TAB_LABEL_KEYS[href], { defaultValue: label }) : label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMore}
        aria-expanded={isMoreOpen}
        className={cn(TAB_CLASS_NAME, isMoreActive && ACTIVE_TAB_CLASS_NAME)}
      >
        <span className={cn(ICON_CLASS_NAME, isMoreActive && ACTIVE_ICON_CLASS_NAME)}>
          <Ellipsis className="size-5" aria-hidden="true" />
        </span>
        {t("commons.mobileTabs.more")}
      </button>
    </nav>
  );
};
