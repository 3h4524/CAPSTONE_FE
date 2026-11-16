"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type ProLockedProps = {
  /** What is locked, read by screen readers and shown on the lock. */
  label: string;
  hint?: string;
  onUnlock: () => void;
  /**
   * A stand-in drawn under the blur. It must not be the locked data itself: the server does not send that, and a
   * blurred copy would still be readable in the page.
   */
  children: ReactNode;
  className?: string;
};

/** A Pro part of a page: its stand-in blurred, and a lock that opens the Pro offer. */
export const ProLocked = ({ label, hint, onUnlock, children, className }: ProLockedProps) => (
  <div className={cn("relative overflow-hidden rounded-xl", className)}>
    <div aria-hidden="true" className="pointer-events-none blur-[3px] select-none">{children}</div>
    <div className="bg-card/30 absolute inset-0 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onUnlock}
        className="bg-card/95 border-ink-200 flex max-w-xs flex-col items-center gap-1.5 rounded-xl border px-5 py-4 text-center shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <span className="text-ink-900 text-sm font-semibold">{label}</span>
        {hint && <span className="text-ink-500 text-xs leading-relaxed">{hint}</span>}
        <span className="mt-1 rounded-full bg-[#17263f] px-3 py-0.5 text-xs font-semibold text-white">Pro</span>
      </button>
    </div>
  </div>
);

/** Grey rows that stand in for a locked list or table under the blur. */
export const ProPlaceholderRows = ({ rows = 4 }: { rows?: number }) => (
  <div className="border-ink-200 bg-card space-y-3 rounded-xl border p-4">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-3">
        <span className="bg-ink-200 size-8 shrink-0 rounded-lg" />
        <span className="flex-1 space-y-1.5">
          <span className="bg-ink-200 block h-2.5 rounded" style={{ width: `${70 - index * 9}%` }} />
          <span className="bg-ink-100 block h-2 rounded" style={{ width: `${45 + index * 7}%` }} />
        </span>
        <span className="bg-ink-100 h-6 w-14 rounded-full" />
      </div>
    ))}
  </div>
);

/** Bars that stand in for a locked chart under the blur. */
export const ProPlaceholderChart = () => (
  <div className="border-ink-200 bg-card flex h-48 items-end gap-2 rounded-xl border p-4">
    {[38, 62, 45, 80, 55, 70, 30, 66, 50, 74].map((height, index) => (
      <span key={index} className="bg-ink-200 flex-1 rounded-t" style={{ height: `${height}%` }} />
    ))}
  </div>
);
