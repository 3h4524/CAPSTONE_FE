import { useTranslation } from "react-i18next";

import { HeadlineCard } from "@/components/admin/image-quality/evaluation/headline-card";
import { findImageEvalMetric } from "@/helpers/image-eval-comparison";
import type {
  ImageEvalComparison,
  ImageEvalMetricDefinition,
} from "@/types/admin-image-quality";

type HeadlineCardsProps = {
  comparison: ImageEvalComparison;
};

const HEADLINE_FIELDS: ReadonlyArray<ImageEvalMetricDefinition["field"]> = [
  "textOk",
  "cer",
  "layoutOk",
];

export const HeadlineCards = ({ comparison }: HeadlineCardsProps) => {
  const { t } = useTranslation("common");
  const results = HEADLINE_FIELDS.map((field) => findImageEvalMetric(comparison, field)).filter(
    (result) => result !== null
  );

  return (
    <div className="grid gap-4 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {results.map((result) => (
        <HeadlineCard key={result.definition.field} result={result} />
      ))}
      <article className="border-ink-200 bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] max-md:gap-1.5 max-md:p-3">
        <p className="text-ink-600 text-[13px] font-semibold">{t("admin.imageQuality.evaluation.imagesCompared")}</p>
        <p className="font-display text-ink-900 text-3xl font-bold tracking-tight tabular-nums max-md:text-lg">
          {comparison.beforeImages.length} → {comparison.afterImages.length}
        </p>
        <p className="text-ink-500 text-[13px] max-md:text-[11px]">
          {t("admin.imageQuality.evaluation.productsHint", { count: comparison.products.length })}
        </p>
      </article>
    </div>
  );
};
