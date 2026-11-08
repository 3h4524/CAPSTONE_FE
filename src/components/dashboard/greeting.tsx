"use client";

import { Activity, AlertTriangle, ClipboardCheck } from "lucide-react";

import { describeGreeting, splitActionItems } from "@/helpers/seller-dashboard";
import { useAuthStore } from "@/stores/auth";
import type { ActionItem } from "@/types/seller-dashboard";

type GreetingProps = {
  items: ActionItem[];
  activeBatchCount: number;
};

const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

const getFirstName = (fullName?: string | null): string => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? "";
};

/** Who is signed in and, at a glance, what needs them: urgent fixes, reviews and running jobs. */
export const Greeting = ({ items, activeBatchCount }: GreetingProps) => {
  const fullName = useAuthStore((state) => state.user?.fullName);
  const firstName = getFirstName(fullName);
  const { fixNow, toReview } = splitActionItems(items);

  return (
    <div className="min-w-0 space-y-2">
      <div>
        <p className="text-muted-foreground text-xs">{today()}</p>
        <h1 className="truncate text-2xl font-semibold tracking-tight" title={fullName ?? undefined}>
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="text-muted-foreground text-sm">{describeGreeting(items)}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        {fixNow.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {fixNow.length} to fix
          </span>
        )}
        {toReview.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-amber-800 dark:text-amber-300">
            <ClipboardCheck className="size-3.5" aria-hidden="true" />
            {toReview.length} to review
          </span>
        )}
        {activeBatchCount > 0 && (
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
            <Activity className="size-3.5" aria-hidden="true" />
            {activeBatchCount} batch {activeBatchCount === 1 ? "job" : "jobs"} in progress
          </span>
        )}
      </div>
    </div>
  );
};
