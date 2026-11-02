import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/utils/format-currency";

type TrialOfferCardProps = {
  trialDays: number;
  // The plan the trial gives and what it includes, as an Admin set them.
  planName: string;
  allowances: { code: string; label: string; limit: number }[];
  isStarting: boolean;
  onStart: () => void;
};

// Framed like the plan cards beside it (PlanComparisonCard), so the trial reads as one more option.
export const TrialOfferCard = ({ trialDays, planName, allowances, isStarting, onStart }: TrialOfferCardProps) => {
  const lines = [
    `${planName}'s tools with standard videos`,
    ...allowances.map((item) => `Up to ${item.limit.toLocaleString()} ${item.label}`),
    "Connect your Gemini API key first",
    "Back to Free when it ends, keeping everything you made",
  ];

  return (
    <Card className="@container relative flex h-full flex-col gap-0 rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
      {/* Rivets in the corners, a quiet frame for the card. */}
      {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((spot) => (
        <span key={spot} aria-hidden="true" className={`absolute size-1.5 rounded-full bg-slate-200 ${spot}`} />
      ))}

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{planName} trial</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
          <span className="size-1.5 rounded-full bg-violet-500" />
          Free trial
        </span>
      </div>

      <div className="mt-5">
        <p className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{formatVnd(0)}</span>
          <span className="text-sm text-slate-500">/{trialDays} days</span>
        </p>
        <p className="mt-1 min-h-4 text-xs text-slate-500">No payment needed</p>
      </div>

      <Button className="mt-5 w-full" onClick={onStart} disabled={isStarting}>
        {isStarting ? "Starting…" : "Start free trial"}
      </Button>

      <ul className="mt-5 grid flex-1 content-start gap-x-6 gap-y-2.5 text-sm @md:grid-cols-2">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-slate-700">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {line}
          </li>
        ))}
      </ul>
    </Card>
  );
};
