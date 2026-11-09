import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type SectionCardProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export const SectionCard = ({
  title,
  description,
  actions,
  className,
  children,
}: SectionCardProps) => (
  <section
    className={cn(
      "border-ink-200 bg-card relative min-w-0 overflow-hidden rounded-xl border shadow-[0_2px_8px_rgba(15,23,42,0.03)]",
      className
    )}
  >
    <div className="border-ink-100 flex flex-col justify-between gap-3 border-b px-5 py-4 max-md:px-4 max-md:py-3 sm:flex-row sm:items-start sm:px-6">
      <div className="min-w-0">
        <h3 className="text-ink-900 text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-ink-500 mt-1 max-w-3xl text-[13px] leading-relaxed">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
    {children}
  </section>
);
