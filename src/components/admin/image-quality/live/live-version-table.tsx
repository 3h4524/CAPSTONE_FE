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
  { label: "Provider · prompt version", isNumeric: false },
  { label: "Images", isNumeric: true },
  { label: "Approved on review", isNumeric: false },
  { label: "Text correct (OCR)", isNumeric: false },
  { label: "Regenerate / product", isNumeric: true },
  { label: "Failed or blocked", isNumeric: false },
  { label: "Time / image", isNumeric: true },
  { label: "Cost / image", isNumeric: true },
] as const;

export const LiveVersionTable = ({ versions }: LiveVersionTableProps) => {
  const isPhone = useIsPhone();

  return (
  <SectionCard
    title="Every version"
    description="One row per image provider and prompt version, oldest first. The counts behind every rate sit next to it."
  >
    {isPhone ? (
      <ul className="divide-y divide-ink-100">
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
              key={column.label}
              className={cn(
                "text-xs font-semibold text-ink-600",
                column.isNumeric && "text-right",
                index === 0 && "pl-5 sm:pl-6",
                index === COLUMNS.length - 1 && "pr-5 sm:pr-6"
              )}
            >
              {column.label}
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
