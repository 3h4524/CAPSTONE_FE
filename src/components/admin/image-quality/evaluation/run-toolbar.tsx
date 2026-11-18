"use client";

import { Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatImageQualityDate } from "@/helpers/image-quality-format";
import type { ImageEvalRunSummary } from "@/types/admin-image-quality";

type RunToolbarProps = {
  runs: ImageEvalRunSummary[];
  selectedRun: ImageEvalRunSummary | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onUpload: () => void;
  onDelete: () => void;
};

export const RunToolbar = ({
  runs,
  selectedRun,
  isLoading,
  onSelect,
  onUpload,
  onDelete,
}: RunToolbarProps) => {
  const { t } = useTranslation("common");

  return (
    <section className="border-ink-200 bg-card relative flex flex-col gap-4 rounded-xl border p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] max-md:gap-3 max-md:p-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor="image-eval-run" className="text-ink-600 text-xs font-semibold">
          {t("admin.imageQuality.evaluation.runLabel")}
        </label>
        <Select
          value={selectedRun?.id ?? ""}
          onValueChange={onSelect}
          disabled={isLoading || runs.length === 0}
        >
          <SelectTrigger id="image-eval-run" className="h-10 w-full text-sm font-medium sm:w-95">
            <SelectValue placeholder={t("admin.imageQuality.evaluation.noRunPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {runs.map((run) => (
              <SelectItem key={run.id} value={run.id} className="text-sm">
                {run.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRun ? (
          <p className="text-ink-500 text-[13px]">
            <span className="text-ink-700 font-medium">
              {t("admin.imageQuality.shared.imagesCount", { count: selectedRun.imageCount })}
            </span>{" "}
            · {t("admin.imageQuality.shared.productsCount", { count: selectedRun.productCount })} ·{" "}
            {t("admin.imageQuality.shared.promptVersionsCount", { count: selectedRun.versions.length })} ·{" "}
            {t("admin.imageQuality.evaluation.uploadedAt", { date: formatImageQualityDate(selectedRun.createdAtUtc) })}
            {selectedRun.uploadedBy
              ? t("admin.imageQuality.evaluation.uploadedBySuffix", { name: selectedRun.uploadedBy })
              : ""}
            {selectedRun.notes ? <span className="text-ink-500 block">{selectedRun.notes}</span> : null}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" onClick={onUpload} className="h-10 gap-2 max-md:flex-1">
          <Upload className="size-4" />
          {t("admin.imageQuality.shared.uploadResults")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          disabled={!selectedRun}
          className="h-10 gap-2 max-md:flex-1"
        >
          <Trash2 className="size-4" />
          {t("admin.imageQuality.shared.delete")}
        </Button>
      </div>
    </section>
  );
};
