import { useTranslation } from "react-i18next";

import { VersionProgressCard } from "@/components/admin/image-quality/evaluation/version-progress-card";
import { VersionProgressRow } from "@/components/admin/image-quality/evaluation/version-progress-row";
import { SectionCard } from "@/components/admin/image-quality/section-card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { ImageEvalVersionStats } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type VersionProgressProps = {
  stats: ImageEvalVersionStats[];
};

const COLUMNS = [
  { labelKey: "admin.imageQuality.evaluation.promptVersionColumn", isNumeric: false },
  { labelKey: "admin.imageQuality.shared.images", isNumeric: true },
  { labelKey: "admin.imageQuality.shared.textCorrect", isNumeric: false },
  { labelKey: "admin.imageQuality.evaluation.letteringClear", isNumeric: false },
  { labelKey: "admin.imageQuality.evaluation.layoutPasses", isNumeric: false },
  { labelKey: "admin.imageQuality.shared.clipScore", isNumeric: true },
  { labelKey: "admin.imageQuality.shared.musiq", isNumeric: true },
] as const;

export const VersionProgress = ({ stats }: VersionProgressProps) => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();

  return (
  <SectionCard
    title={t("admin.imageQuality.evaluation.everyVersionTitle")}
    description={t("admin.imageQuality.evaluation.everyVersionDescription")}
  >
    {isPhone ? (
      <ul className="divide-ink-100 divide-y">
        {stats.map((item) => (
          <VersionProgressCard key={item.version.key} stats={item} />
        ))}
      </ul>
    ) : (
    <Table className="min-w-225">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((column, index) => (
            <TableHead
              key={column.labelKey}
              className={cn(
                "text-ink-600 text-xs font-semibold",
                column.isNumeric && "text-right",
                index === 0 && "pl-5 sm:pl-6",
                index === COLUMNS.length - 1 && "pr-5 sm:pr-6"
              )}
            >
              {t(column.labelKey)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map((item) => (
          <VersionProgressRow key={item.version.key} stats={item} />
        ))}
      </TableBody>
    </Table>
    )}
  </SectionCard>
  );
};
