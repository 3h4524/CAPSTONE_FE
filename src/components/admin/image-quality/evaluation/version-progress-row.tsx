import { RateMeter } from "@/components/admin/image-quality/rate-meter";
import { TableCell, TableRow } from "@/components/ui/table";
import { IMAGE_EVAL_PHASE_LABELS } from "@/constants/image-quality";
import { formatImageQualityNumber } from "@/helpers/image-quality-format";
import type { ImageEvalVersionStats } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type VersionProgressRowProps = {
  stats: ImageEvalVersionStats;
};

export const PHASE_TONES = {
  before: "bg-ink-100 text-ink-600",
  after: "bg-sky-100 dark:bg-sky-500/15 text-sky-900 dark:text-sky-300",
  trial: "bg-card text-ink-400 ring-1 ring-ink-200",
} as const;

export const VersionProgressRow = ({ stats }: VersionProgressRowProps) => (
  <TableRow className={cn(stats.version.phase === "trial" && "text-ink-500")}>
    <TableCell className="py-2.5 pl-5 whitespace-normal sm:pl-6">
      <span className="text-ink-900 flex flex-wrap items-center gap-2 text-sm font-medium">
        {stats.version.label}
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium",
            PHASE_TONES[stats.version.phase]
          )}
        >
          {IMAGE_EVAL_PHASE_LABELS[stats.version.phase]}
        </span>
      </span>
    </TableCell>
    <TableCell className="text-ink-600 text-right font-mono text-sm">{stats.letteredCount}</TableCell>
    <TableCell>
      <RateMeter value={stats.textOk} />
    </TableCell>
    <TableCell>
      <RateMeter value={stats.textClear} />
    </TableCell>
    <TableCell>
      <RateMeter value={stats.layoutOk} />
    </TableCell>
    <TableCell className="text-ink-700 text-right font-mono text-sm">
      {formatImageQualityNumber(stats.clipOverall, 1)}
    </TableCell>
    <TableCell className="text-ink-700 pr-5 text-right font-mono text-sm sm:pr-6">
      {formatImageQualityNumber(stats.musiq, 1)}
    </TableCell>
  </TableRow>
);
