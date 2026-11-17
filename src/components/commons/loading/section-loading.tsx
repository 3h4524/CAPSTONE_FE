"use client";

import { useTranslation } from "react-i18next";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/cn";

type SectionLoadingProps = {
  label?: string;
  className?: string;
};

export const SectionLoading = ({ label: labelProp, className }: SectionLoadingProps) => {
  const { t } = useTranslation("common");
  const label = labelProp ?? t("commons.loading.section");
  return (
  <div
    role="status"
    aria-label={label}
    className={cn("flex items-center justify-center gap-2 p-6", className)}
  >
    <Spinner className="size-5" aria-hidden="true" />
    <span className="text-muted-foreground text-sm">{label}…</span>
  </div>
  );
};
