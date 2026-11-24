"use client";

import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupKindBadgeProps = {
  template: Pick<MockupTemplate, "printify">;
  className?: string;
};

// Tells a template linked to a Printify product, which shows what Printify prints, from a standard one.
export const MockupKindBadge = ({ template, className }: MockupKindBadgeProps) => {
  const { t } = useTranslation("common");
  const { printify } = template;
  return (
    <Badge
      variant="outline"
      title={printify ? [printify.blueprintTitle, printify.printProviderTitle].filter(Boolean).join(" · ") : undefined}
      className={cn(
        printify
          ? "border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-ink-200 bg-ink-50 text-ink-600",
        className
      )}
    >
      {printify ? "Printify" : t("mockups.templateCard.standardMockup")}
    </Badge>
  );
};
