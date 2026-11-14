import { Badge } from "@/components/ui/badge";
import type { AdminStyleArtPresetViStatus } from "@/types/admin-style-art-presets";

const STATUS_META: Record<AdminStyleArtPresetViStatus, { label: string; className: string }> = {
  ok: { label: "VI ready", className: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300" },
  pending: { label: "Translation pending", className: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300" },
  failed: { label: "Translation failed", className: "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300" },
  manual: { label: "Manual VI", className: "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300" },
};

export const ViStatusBadge = ({ status }: { status: AdminStyleArtPresetViStatus | null }) =>
  status === null ? (
    <Badge variant="outline" className="border-ink-300 text-ink-500">
      No VI yet
    </Badge>
  ) : (
    <Badge variant="outline" className={STATUS_META[status].className}>
      {STATUS_META[status].label}
    </Badge>
  );
