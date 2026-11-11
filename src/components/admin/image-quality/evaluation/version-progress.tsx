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
  { label: "Prompt version", isNumeric: false },
  { label: "Images", isNumeric: true },
  { label: "Text correct", isNumeric: false },
  { label: "Lettering clear", isNumeric: false },
  { label: "Layout passes", isNumeric: false },
  { label: "CLIPScore", isNumeric: true },
  { label: "MUSIQ", isNumeric: true },
] as const;

export const VersionProgress = ({ stats }: VersionProgressProps) => {
  const isPhone = useIsPhone();

  return (
  <SectionCard
    title="Every prompt version"
    description="Lettering designs only, oldest first. Each version has only a few images, so read one row as a hint, not a result."
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
              key={column.label}
              className={cn(
                "text-ink-600 text-xs font-semibold",
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
        {stats.map((item) => (
          <VersionProgressRow key={item.version.key} stats={item} />
        ))}
      </TableBody>
    </Table>
    )}
  </SectionCard>
  );
};
