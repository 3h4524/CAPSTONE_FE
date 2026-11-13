import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
};

export const PageHeader = ({ title, description, eyebrow, actions, breadcrumb, className }: PageHeaderProps) => (
  <header className={cn("flex flex-col gap-3", className)}>
    {breadcrumb}
    <div className="flex flex-col gap-4 max-md:flex-row max-md:items-center max-md:gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase max-md:hidden">{eyebrow}</p>
        )}
        <h1 className="font-display text-ink-900 text-2xl font-bold tracking-tight max-md:text-xl sm:text-[28px]">{title}</h1>
        {description && <p className="text-muted-foreground text-sm max-md:hidden">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  </header>
);
