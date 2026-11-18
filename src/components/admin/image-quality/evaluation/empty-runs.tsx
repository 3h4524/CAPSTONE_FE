import { FlaskConical, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

type EmptyRunsProps = {
  onUpload: () => void;
};

export const EmptyRuns = ({ onUpload }: EmptyRunsProps) => {
  const { t } = useTranslation("common");

  return (
    <section className="border-ink-300 bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <span className="bg-ink-100 text-ink-500 flex size-10 items-center justify-center rounded-lg">
        <FlaskConical className="size-5" />
      </span>
      <div>
        <p className="text-ink-900 text-base font-semibold">{t("admin.imageQuality.evaluation.emptyTitle")}</p>
        <p className="text-ink-500 mt-1 max-w-md text-[13px] leading-relaxed">
          {t("admin.imageQuality.evaluation.emptyDescription")}
        </p>
      </div>
      <Button type="button" onClick={onUpload} className="gap-2">
        <Upload className="size-4" />
        {t("admin.imageQuality.shared.uploadResults")}
      </Button>
    </section>
  );
};
