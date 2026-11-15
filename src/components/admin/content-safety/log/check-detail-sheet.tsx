"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import {
  CATEGORY_LABELS,
  DeciderBadge,
  DecisionBadge,
  featureLabel,
  formatDateTime,
  PanelMessage,
  subjectLabel,
} from "@/components/admin/content-safety/shared";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useModerationCheck } from "@/hooks/queries/use-admin-moderation";
import type { ModerationCheckDetail } from "@/types/admin-moderation";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The kept text with each piece of evidence marked, so the reviewer sees what was caught. */
const HighlightedText = ({ text, evidence }: { text: string; evidence: string[] }) => {
  const terms = evidence.map((item) => item.trim()).filter((item) => item.length > 1);
  if (terms.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
          <mark key={index} className="rounded bg-rose-100 px-0.5 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
};

const Meta = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
    <dt className="text-ink-500">{label}</dt>
    <dd className="text-ink-800 dark:text-ink-100 min-w-0 break-words">{children}</dd>
  </div>
);

// The phrase to start an allowlist entry from: the blocklist term that matched, else the first evidence.
const allowlistSeed = (check: ModerationCheckDetail) =>
  check.findings.map((finding) => finding.evidence).find((evidence): evidence is string => Boolean(evidence?.trim())) ?? "";

export const CheckDetailSheet = ({
  checkId,
  onClose,
  onAllowlist,
}: {
  checkId: string | null;
  onClose: () => void;
  onAllowlist: (phrase: string, note: string) => void;
}) => {
  const check = useModerationCheck(checkId);
  const data = check.data;

  return (
    <Sheet open={checkId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-ink-100 border-b">
          <SheetTitle className="font-display text-lg">Moderation check</SheetTitle>
          <SheetDescription>{data ? formatDateTime(data.createdAt) : "Loading…"}</SheetDescription>
        </SheetHeader>

        {check.isError ? (
          <PanelMessage tone="error" title="This check could not be loaded." />
        ) : !data ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <DecisionBadge decision={data.decision} />
              <DeciderBadge decider={data.decidedBy} />
              <span className="text-ink-500 text-xs">
                {featureLabel(data.feature)} · {subjectLabel(data.subjectType)} · {data.direction === "output" ? "AI output" : "Seller input"}
              </span>
            </div>

            <section className="space-y-2">
              <h3 className="text-ink-900 dark:text-ink-50 text-sm font-semibold">What was found</h3>
              {data.findings.length === 0 ? (
                <p className="text-ink-500 text-sm">No concern was found.</p>
              ) : (
                <ul className="space-y-2">
                  {data.findings.map((finding, index) => (
                    <li key={index} className="border-ink-200 rounded-lg border px-3 py-2 text-sm">
                      <p className="text-ink-900 dark:text-ink-50 font-medium">
                        {CATEGORY_LABELS[finding.category] ?? finding.category}
                        <span className="text-ink-500 font-normal"> · {finding.severity}</span>
                      </p>
                      {finding.field ? <p className="text-ink-500 text-xs">In {finding.field}</p> : null}
                      {finding.evidence ? <p className="text-ink-700 dark:text-ink-200 mt-1 text-xs">“{finding.evidence}”</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              {data.reason ? <p className="text-ink-600 text-sm">{data.reason}</p> : null}
            </section>

            <section className="space-y-2">
              <h3 className="text-ink-900 dark:text-ink-50 text-sm font-semibold">Seller text</h3>
              {data.contentExcerpt ? (
                <p className="bg-ink-50 dark:bg-ink-800/40 text-ink-800 dark:text-ink-100 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  <HighlightedText
                    text={data.contentExcerpt}
                    evidence={data.findings.map((finding) => finding.evidence ?? "")}
                  />
                </p>
              ) : (
                <p className="text-ink-500 text-sm">
                  {data.direction === "output"
                    ? "An image check keeps no text, and blocked images are not stored."
                    : "Allowed text is not kept."}
                </p>
              )}
            </section>

            <dl className="border-ink-100 space-y-1.5 border-t pt-4">
              <Meta label="Seller">
                {data.userEmail ? (
                  <>
                    {data.userName ? `${data.userName} · ` : ""}
                    {data.userEmail}
                  </>
                ) : (
                  "—"
                )}
              </Meta>
              <Meta label="Model">{data.model ?? "—"}</Meta>
              <Meta label="Check time">{data.latencyMs === null ? "—" : `${data.latencyMs} ms`}</Meta>
              <Meta label="Policy version">{data.policyVersion}</Meta>
              <Meta label="Content hash">
                <span className="font-mono text-xs">{data.contentHash}</span>
              </Meta>
            </dl>

            <div className="flex flex-wrap gap-2">
              {data.decision !== "allow" && data.direction === "input" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAllowlist(allowlistSeed(data), "Added from a check that was blocked by mistake.")}
                >
                  <ShieldCheck aria-hidden="true" />
                  Add to allowlist
                </Button>
              )}
              {data.userEmail && (
                <Button asChild type="button" variant="ghost" size="sm">
                  <Link href={`/admin/users?search=${encodeURIComponent(data.userEmail)}`}>
                    View seller <ArrowUpRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
