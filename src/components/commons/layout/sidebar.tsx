"use client";

import Link from "next/link";

import { SELLER_NAV_LINKS } from "@/data/seller-nav";
import { useNavigation } from "@/hooks/use-navigation";
import { cn } from "@/utils/cn";

export const Sidebar = () => {
  const { handleNavClick, isItemActive } = useNavigation();

  return (
    <aside className="bg-background w-60 shrink-0 border-r">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          APCS
        </Link>
      </div>
      <nav className="flex flex-col gap-1 px-3" aria-label="Seller">
        {SELLER_NAV_LINKS.map((link) => {
          const isActive = isItemActive(link);
          return (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNavClick(link)}
              className={cn(
                "focus-visible:ring-ring rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isActive
                  ? "bg-muted text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
