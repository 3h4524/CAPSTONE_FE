import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type PanelSectionProps = {
  title: string;
  description?: ReactNode;
  /** A button or a count shown at the right of the title. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

// A titled block of the node panel, set apart by a rule rather than a card.
export const PanelSection = ({ title, description, aside, children, className }: PanelSectionProps) => (
  <section aria-label={title} className={cn("space-y-3.5 border-t px-5 py-5", className)}>
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-muted-foreground truncate text-xs font-medium">{title}</h3>
        {aside}
      </div>
      {description && <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>}
    </div>
    {children}
  </section>
);
