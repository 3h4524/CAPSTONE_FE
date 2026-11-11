"use client";

import { KeyRound, Pencil, Trash2 } from "lucide-react";

import { relativeTime } from "@/components/api-keys/relative-time";
import { Button } from "@/components/ui/button";
import type { ApiKeyConnection } from "@/types/api-keys";
import { cn } from "@/utils/cn";

const UNUSED_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;

const statusReason = (connection: ApiKeyConnection, now: number) => {
  if (connection.status === "Connected") {
    return `Checked ${relativeTime(connection.lastCheckedAtUtc, now, "never")}`;
  }
  if (connection.status === "Reconnect") return "Key invalid, inactive, or expired";
  return "Not validated yet";
};

const unusedDays = (connection: ApiKeyConnection, now: number) => {
  if (connection.status !== "Connected" || !connection.lastUsedAtUtc) return null;
  const days = Math.floor((now - Date.parse(connection.lastUsedAtUtc)) / DAY_MS);
  return days >= UNUSED_AFTER_DAYS ? days : null;
};

export type ConnectionHandlers = {
  onEdit: () => void;
  onDelete: () => void;
  onValidate: () => void;
  busy: boolean;
};

// The pieces of a connection, shared by the desktop table's row and the phone's card.

export const ConnectionProvider = ({ connection, labelClassName }: { connection: ApiKeyConnection; labelClassName?: string }) => (
  <div className="flex items-center gap-3">
    <span aria-hidden="true" className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
      {connection.provider.slice(0, 1)}
    </span>
    <div className="min-w-0">
      <div className="text-foreground text-sm font-medium">{connection.provider}</div>
      <div className={cn("text-muted-foreground truncate", labelClassName)} title={`${connection.label} · ${connection.providerCategory}`}>
        {connection.label}
        <span className="mx-1.5 opacity-50">·</span>
        {connection.providerCategory}
      </div>
    </div>
  </div>
);

export const ConnectionCredential = ({ connection }: { connection: ApiKeyConnection }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {connection.authType === "OAuth" ? (
      <span className="inline-flex max-w-52 items-center gap-1.5 truncate" title={connection.credential}>
        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">OAuth</span>
        {connection.credential}
      </span>
    ) : (
      <code className="bg-muted/60 text-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px]" title={connection.authType}>
        <KeyRound className="text-muted-foreground size-3" aria-hidden="true" />
        {connection.credential}
      </code>
    )}
    {connection.environment && (
      <span className="text-muted-foreground max-w-24 truncate rounded-md border px-1.5 py-0.5 text-[10px]" title={connection.environment}>
        {connection.environment}
      </span>
    )}
  </div>
);

export const ConnectionStatus = ({ connection, now }: { connection: ApiKeyConnection; now: number }) => {
  const connected = connection.status === "Connected";
  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
          connected ? "bg-success-background text-success-text" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
        )}
      >
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", connected ? "bg-success-text" : "bg-amber-500")} />
        {connection.status}
      </span>
      <div className="text-muted-foreground mt-1 text-[11px]">{statusReason(connection, now)}</div>
    </>
  );
};

export const ConnectionLastUsed = ({ connection, now }: { connection: ApiKeyConnection; now: number }) => {
  const unused = unusedDays(connection, now);
  return (
    <>
      <time dateTime={connection.lastUsedAtUtc ?? undefined} title={connection.lastUsedAtUtc ?? "Never used"}>
        {relativeTime(connection.lastUsedAtUtc, now)}
      </time>
      {unused !== null && <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Unused for {unused} days — delete if no longer needed</div>}
    </>
  );
};

export const ConnectionActions = ({ connection, onEdit, onDelete, onValidate, busy, className }: ConnectionHandlers & { connection: ApiKeyConnection; className?: string }) => {
  const editLabel = `Edit ${connection.provider} ${connection.label}`;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {connection.authType !== "OAuth" && (
        <>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onValidate} className="text-muted-foreground hover:text-foreground h-8 px-2.5 text-xs">
            Validate
          </Button>
          {connection.status === "Connected" ? (
            <Button variant="ghost" size="icon-sm" onClick={onEdit} disabled={busy} aria-label={editLabel} className="text-muted-foreground hover:text-foreground">
              <Pencil className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={onEdit} disabled={busy} aria-label={editLabel} className="h-8 px-3 text-xs">
              Fix key
            </Button>
          )}
        </>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={busy}
        aria-label={`Delete ${connection.provider} ${connection.label}`}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
};
