import { useTranslation } from "react-i18next";

import { LiveVersionCard } from "@/components/admin/image-quality/live/live-version-card";
import { LiveVersionRow } from "@/components/admin/image-quality/live/live-version-row";
import { SectionCard } from "@/components/admin/image-quality/section-card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { ImageQualityLiveVersion } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type LiveVersionTableProps = {
  versions: ImageQualityLiveVersion[];
};

const COLUMNS = [
  { labelKey: "admin.imageQuality.live.providerPromptVersion", isNumeric: false },
  { labelKey: "admin.imageQuality.shared.images", isNumeric: true },
  { labelKey: "admin.imageQuality.shared.approvedOnReview", isNumeric: false },
  { labelKey: "admin.imageQuality.shared.textCorrectOcr", isNumeric: false },
  { labelKey: "admin.imageQuality.shared.regeneratePerProduct", isNumeric: true },
  { labelKey: "admin.imageQuality.shared.failedOrBlocked", isNumeric: false },
  { labelKey: "admin.imageQuality.shared.timePerImage", isNumeric: true },
  { labelKey: "admin.imageQuality.shared.costPerImage", isNumeric: true },
] as const;

export const LiveVersionTable = ({ versions }: LiveVersionTableProps) => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();

  return (
  <SectionCard
    title={t("admin.imageQuality.live.tableTitle")}
    description={t("admin.imageQuality.live.tableDescription")}
  >
    {isPhone ? (
      <ul className="divide-ink-100 divide-y">
        {versions.map((version) => (
          <LiveVersionCard key={version.key} version={version} />
        ))}
      </ul>
    ) : (
    <Table className="min-w-240">
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
        {versions.map((version) => (
          <LiveVersionRow key={version.key} version={version} />
        ))}
      </TableBody>
    </Table>
    )}
  </SectionCard>
  );
};
