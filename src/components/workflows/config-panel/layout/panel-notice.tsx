import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type PanelNoticeTone = "neutral" | "info" | "success" | "warning" | "error";

const TONES: Record<PanelNoticeTone, { className: string; Icon: typeof Info }> = {
  neutral: { className: "bg-slate-100/80 text-slate-700", Icon: Info },
  info: { className: "bg-sky-50 text-sky-900", Icon: Info },
  success: { className: "bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  warning: { className: "bg-amber-50 text-amber-900", Icon: AlertTriangle },
  error: { className: "bg-rose-50 text-rose-900", Icon: XCircle },
};

type PanelNoticeProps = {
  tone?: PanelNoticeTone;
  children: ReactNode;
  /** A small follow-up, such as a retry link, placed under the text. */
  action?: ReactNode;
  className?: string;
};

// A one-line message under a field or at the top of a section: a hint, a warning or an error.
export const PanelNotice = ({ tone = "neutral", children, action, className }: PanelNoticeProps) => {
  const { className: toneClassName, Icon } = TONES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn("flex items-start gap-2 rounded-md px-3 py-2 text-xs leading-relaxed", toneClassName, className)}
    >
      <Icon className="mt-px size-3.5 shrink-0 opacity-80" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div>{children}</div>
        {action}
      </div>
    </div>
  );
};
