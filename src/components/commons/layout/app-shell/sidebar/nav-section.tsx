"use client";

import { useTranslation } from "react-i18next";

import type { AppNavSection } from "@/types/navigation";

import { NavItem } from "./nav-item";

type NavSectionProps = {
  section: AppNavSection;
  collapsed: boolean;
};

export const NavSection = ({ section, collapsed }: NavSectionProps) => {
  const { t } = useTranslation("common");
  const sectionKey = section.label.toLowerCase() as "overview" | "workspace" | "system";
  const translatedSection = {
    ...section,
    label: t(`navigation.sections.${sectionKey}`),
    items: section.items.map((item) => ({
      ...item,
      // A page without a translation yet still shows its name, never the key.
      label: t(item.titleKey, { defaultValue: item.label }),
    })),
  };

  return (
    <div className="flex flex-col gap-1">
      {!collapsed && (
        <p className="text-muted-foreground px-3 text-xs font-medium tracking-wider uppercase">
          {translatedSection.label}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {translatedSection.items.map((item) => (
          <li key={item.href}>
            <NavItem item={item} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </div>
  );
};
