"use client";

import type { NavSectionConfig } from "./app-navigation";
import { NavItem } from "./nav-item";

type NavSectionProps = {
  section: NavSectionConfig;
  collapsed: boolean;
};

export const NavSection = ({ section, collapsed }: NavSectionProps) => {
  return (
    <div className="flex flex-col gap-1">
      {!collapsed && (
        <p className="text-muted-foreground px-3 text-xs font-medium tracking-wider uppercase">
          {section.label}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {section.items.map((item) => (
          <li key={item.href}>
            <NavItem item={item} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </div>
  );
};
