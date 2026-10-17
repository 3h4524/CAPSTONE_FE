import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type PanelEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** A button that fills the empty place, shown under the text. */
  children?: ReactNode;
  className?: string;
};

// Stands in for a list or a preview that has nothing in it yet, and says what fills it.
export const PanelEmptyState = ({ icon: Icon, title, description, children, className }: PanelEmptyStateProps) => (
  <div className={cn("flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center", className)}>
    <span className="bg-muted flex size-9 items-center justify-center rounded-full text-slate-500">
      <Icon className="size-4" aria-hidden="true" />
    </span>
    <p className="text-sm font-medium text-slate-800">{title}</p>
    {description && <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">{description}</p>}
    {children && <div className="pt-1">{children}</div>}
  </div>
);
