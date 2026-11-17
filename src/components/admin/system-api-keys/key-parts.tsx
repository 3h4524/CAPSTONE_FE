"use client";

import { ArrowDown, ArrowUp, KeyRound, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { i18n } from "@/i18n/client";
import type { AdminSystemApiKey } from "@/types/admin-system-api-keys";
import { cn } from "@/utils/cn";

type Tone = "ok" | "warn" | "off" | "bad";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-success-background text-success-text",
  warn: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  off: "bg-ink-100 text-ink-600",
  bad: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** What a key is doing now, worst first: a key that is not used for more than one reason shows the one to fix first. */
export const keyStatus = (key: AdminSystemApiKey): { label: string; tone: Tone; detail?: string } => {
  const t = i18n.t.bind(i18n);
  if (!key.readable)
    return { label: t("admin.systemApiKeys.status.cannotDecrypt"), tone: "bad", detail: t("admin.systemApiKeys.status.cannotDecryptDetail") };
  if (!key.isActive) return { label: t("admin.systemApiKeys.status.off"), tone: "off", detail: t("admin.systemApiKeys.status.offDetail") };
  if (key.refusedToday) return { label: t("admin.systemApiKeys.status.refusedToday"), tone: "warn", detail: key.refusedToday };
  if (key.lastCheckSucceeded === false)
    return { label: t("admin.systemApiKeys.status.checkFailed"), tone: "warn", detail: t("admin.systemApiKeys.status.checkFailedDetail") };
  return { label: t("admin.systemApiKeys.status.inUse"), tone: "ok" };
};

export const KeyName = ({ apiKey }: { apiKey: AdminSystemApiKey }) => {
  const { t } = useTranslation("common");
  return (
    <div className="min-w-0">
      <div className="text-ink-900 truncate font-medium">{apiKey.label}</div>
      <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
        <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
        <code className="bg-muted/60 rounded px-1.5 py-0.5 font-mono text-[11px]">{apiKey.maskedKey}</code>
        <span className="truncate font-mono text-[11px]" title={t("admin.systemApiKeys.keyIdTitle")}>
          {apiKey.keyId}
        </span>
      </div>
    </div>
  );
};

export const KeyStatus = ({ apiKey }: { apiKey: AdminSystemApiKey }) => {
  const status = keyStatus(apiKey);
  return (
    <div className="min-w-0">
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", TONE_CLASS[status.tone])}>{status.label}</span>
      {status.detail && status.tone !== "off" && (
        <p className="text-muted-foreground mt-1 line-clamp-2 max-w-64 text-xs" title={status.detail}>
          {status.detail}
        </p>
      )}
    </div>
  );
};

/** Today's uses against the daily limit, as a bar when there is a limit. */
export const KeyUsage = ({ apiKey, dailyLimit }: { apiKey: AdminSystemApiKey; dailyLimit: number | null }) => {
  const { t } = useTranslation("common");
  if (dailyLimit === null) {
    return (
      <div className="text-ink-700 text-sm tabular-nums">
        {apiKey.usedToday} <span className="text-muted-foreground text-xs">{t("admin.systemApiKeys.usage.todayNoLimit")}</span>
      </div>
    );
  }
  const share = dailyLimit === 0 ? 1 : Math.min(1, apiKey.usedToday / dailyLimit);
  return (
    <div className="w-36 max-w-full">
      <div className="text-ink-700 text-sm tabular-nums">
        {apiKey.usedToday} <span className="text-muted-foreground text-xs">{t("admin.systemApiKeys.usage.ofLimitToday", { limit: dailyLimit })}</span>
      </div>
      <div
        className="bg-ink-100 mt-1 h-1.5 overflow-hidden rounded-full"
        role="meter"
        aria-label={t("admin.systemApiKeys.usage.usedTodayAria", { label: apiKey.label })}
        aria-valuemin={0}
        aria-valuemax={dailyLimit}
        aria-valuenow={Math.min(apiKey.usedToday, dailyLimit)}
      >
        <div className={cn("h-full rounded-full", share >= 1 ? "bg-amber-500" : "bg-primary")} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
};

export const lastChecked = (value: string | null, now = Date.now()) => {
  const t = i18n.t.bind(i18n);
  if (!value) return t("admin.systemApiKeys.lastChecked.never");
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60_000));
  if (minutes < 1) return t("admin.systemApiKeys.lastChecked.justNow");
  if (minutes < 60) return t("admin.systemApiKeys.lastChecked.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("admin.systemApiKeys.lastChecked.hoursAgo", { count: hours });
  return t("admin.systemApiKeys.lastChecked.daysAgo", { count: Math.floor(hours / 24) });
};

type KeyActionsProps = {
  apiKey: AdminSystemApiKey;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onToggle: (active: boolean) => void;
  onCheck: () => void;
  onClearRefusal: () => void;
  onMove: (step: -1 | 1) => void;
  onDelete: () => void;
};

export const KeyActions = ({ apiKey, isFirst, isLast, busy, onToggle, onCheck, onClearRefusal, onMove, onDelete }: KeyActionsProps) => {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-wrap items-center justify-end gap-1 md:flex-nowrap">
      <label className="text-ink-600 mr-1 flex items-center gap-2 text-xs font-medium">
        <Switch
          checked={apiKey.isActive}
          disabled={busy || !apiKey.readable}
          onCheckedChange={onToggle}
          aria-label={t(apiKey.isActive ? "admin.systemApiKeys.actions.switchOffAria" : "admin.systemApiKeys.actions.switchOnAria", {
            label: apiKey.label,
          })}
        />
        <span className="max-md:sr-only">{t(apiKey.isActive ? "admin.systemApiKeys.actions.on" : "admin.systemApiKeys.actions.off")}</span>
      </label>
      {apiKey.refusedToday && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          onClick={onClearRefusal}
          aria-label={t("admin.systemApiKeys.actions.useAgainAria", { label: apiKey.label })}
          title={t("admin.systemApiKeys.actions.useAgainTitle")}
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={busy || !apiKey.readable}
        onClick={onCheck}
        aria-label={t("admin.systemApiKeys.actions.checkAria", { label: apiKey.label })}
        title={t("admin.systemApiKeys.actions.checkTitle")}
      >
        {busy ? <RefreshCw className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={busy || isFirst}
        onClick={() => onMove(-1)}
        aria-label={t("admin.systemApiKeys.actions.moveUpAria", { label: apiKey.label })}
        title={t("admin.systemApiKeys.actions.useEarlierTitle")}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={busy || isLast}
        onClick={() => onMove(1)}
        aria-label={t("admin.systemApiKeys.actions.moveDownAria", { label: apiKey.label })}
        title={t("admin.systemApiKeys.actions.useLaterTitle")}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-500/10"
        disabled={busy}
        onClick={onDelete}
        aria-label={t("admin.systemApiKeys.actions.deleteAria", { label: apiKey.label })}
        title={t("admin.systemApiKeys.actions.deleteTitle")}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
};
