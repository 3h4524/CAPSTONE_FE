import { RateMeter } from "@/components/admin/image-quality/rate-meter";
import { TableCell, TableRow } from "@/components/ui/table";
import { IMAGE_EVAL_PHASE_LABELS } from "@/constants/image-quality";
import { formatImageQualityNumber } from "@/helpers/image-quality-format";
import type { ImageEvalVersionStats } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type VersionProgressRowProps = {
  stats: ImageEvalVersionStats;
};

const PHASE_TONES = {
  before: "bg-slate-100 text-slate-600",
  after: "bg-sky-100 text-sky-900",
  trial: "bg-white text-slate-400 ring-1 ring-slate-200",
} as const;

export const VersionProgressRow = ({ stats }: VersionProgressRowProps) => (
  <TableRow className={cn(stats.version.phase === "trial" && "text-slate-500")}>
    <TableCell className="py-2.5 pl-5 whitespace-normal sm:pl-6">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
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
    <TableCell className="text-right font-mono text-sm text-slate-600">{stats.letteredCount}</TableCell>
    <TableCell>
      <RateMeter value={stats.textOk} />
    </TableCell>
    <TableCell>
      <RateMeter value={stats.textClear} />
    </TableCell>
    <TableCell>
      <RateMeter value={stats.layoutOk} />
    </TableCell>
    <TableCell className="text-right font-mono text-sm text-slate-700">
      {formatImageQualityNumber(stats.clipOverall, 1)}
    </TableCell>
    <TableCell className="pr-5 text-right font-mono text-sm text-slate-700 sm:pr-6">
      {formatImageQualityNumber(stats.musiq, 1)}
    </TableCell>
  </TableRow>
);
