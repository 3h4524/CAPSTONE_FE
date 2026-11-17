"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SUBSCRIPTION_PATH } from "@/helpers/plan-errors";
import { useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import { cn } from "@/utils/cn";

/** One thing Pro opens here, shown as a tile under the lock. */
export type ProLockedFeature = { title: string; description: string };

type ProLockedProps = {
  /** What is locked: the heading over the lock, its word "Pro" highlighted. */
  label: string;
  hint?: string;
  /** What Pro opens here, up to three tiles. */
  features?: ProLockedFeature[];
  /** The main button's words; "Unlock Pro" when left out. */
  actionLabel?: string;
  onUnlock: () => void;
  /**
   * A stand-in drawn under the blur. It must not be the locked data itself: the server does not send that, and a
   * blurred copy would still be readable in the page.
   */
  children: ReactNode;
  className?: string;
};

/** A heading with each word "Pro" in the Pro colour. */
export const HighlightPro = ({ text }: { text: string }) => (
  <>
    {text.split(/(\bPro\b)/).map((part, index) =>
      part === "Pro"
        ? <span key={index} className="text-amber-400">{part}</span>
        : <Fragment key={index}>{part}</Fragment>)}
  </>
);

/** The glowing lock with its PRO tag, over a lock and in the Pro offer. */
export const ProLockBadge = ({ className }: { className?: string }) => (
  <div className={cn("relative w-fit", className)}>
    <span className="flex size-16 items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/25 to-amber-600/10 shadow-[0_0_32px_rgba(251,191,36,0.25)]">
      <Lock className="size-7 text-amber-300" aria-hidden="true" />
    </span>
    <span className="absolute -right-3 -bottom-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#0b1324]">PRO</span>
  </div>
);

/**
 * A Pro part of a page: its stand-in blurred under a dark panel that says what Pro opens, with the way to unlock it and
 * the plans. The free trial is named only when the Seller can still start one.
 */
export const ProLocked = ({ label, hint, features = [], actionLabel, onUnlock, children, className }: ProLockedProps) => {
  const { t } = useTranslation("common");
  const { data: overview } = useSubscriptionOverview();
  const trialNote = overview?.trialEligible
    ? t("proPaywall.lock.trialNote", { defaultValue: "{{days}}-day free trial of Pro", days: overview.trialDays })
    : null;

  return (
    <div className={cn("isolate grid overflow-hidden rounded-2xl", className)}>
      <div aria-hidden="true" className="pointer-events-none col-start-1 row-start-1 blur-[3px] select-none">{children}</div>
      <div className="relative z-10 col-start-1 row-start-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#0b1324]/80 via-[#0b1324]/92 to-[#0b1324] px-4 py-8 text-center sm:px-8 sm:py-10">
        <ProLockBadge className="mb-5" />

        <h3 className="max-w-md text-xl font-bold text-balance text-white sm:text-2xl"><HighlightPro text={label} /></h3>
        {hint && <p className="mt-3 max-w-lg text-sm leading-relaxed text-pretty text-white/75">{hint}</p>}

        {features.length > 0 && (
          <ul className="mt-6 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            {features.slice(0, 3).map((feature) => (
              <li key={feature.title} className="flex gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3">
                <Check className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-white">{feature.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/60">{feature.description}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-2.5 text-sm font-bold text-[#0b1324] shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition hover:from-amber-300 hover:to-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:w-auto"
          >
            {actionLabel ?? t("proPaywall.lock.unlock", { defaultValue: "Unlock Pro" })}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <Link
            href={SUBSCRIPTION_PATH}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            {t("proPaywall.lock.viewPlans", { defaultValue: "View all plans" })}
          </Link>
        </div>

        {trialNote && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-white/60">
            <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
            {trialNote}
          </p>
        )}
      </div>
    </div>
  );
};

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
