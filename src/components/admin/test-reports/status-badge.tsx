import { Badge } from "@/components/ui/badge";
import type {
  TestReportSpecStatus,
  TestReportStatus,
} from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

const RUN_STYLES: Record<TestReportStatus, string> = {
  running: "border-sky-200 bg-sky-50 text-sky-700",
  passed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  error: "border-amber-200 bg-amber-50 text-amber-700",
};

const SPEC_STYLES: Record<TestReportSpecStatus, string> = {
  passed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  flaky: "border-amber-200 bg-amber-50 text-amber-700",
  skipped: "border-slate-200 bg-slate-50 text-slate-500",
  unknown: "border-slate-200 bg-slate-50 text-slate-500",
};

type TestReportStatusBadgeProps = {
  status: TestReportStatus | TestReportSpecStatus;
  className?: string;
};

export const TestReportStatusBadge = ({
  status,
  className,
}: TestReportStatusBadgeProps) => {
  const style = RUN_STYLES[status as TestReportStatus] ?? SPEC_STYLES[status as TestReportSpecStatus];

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-1.5 py-0 text-[10px] font-bold tracking-wide uppercase",
        style,
        className
      )}
    >
      {status}
    </Badge>
  );
};
