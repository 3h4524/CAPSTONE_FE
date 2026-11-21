"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Lock, PowerOff } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { DIALOG_CLASS, DialogHead } from "@/components/admin/content-safety/blocklist/form-parts";
import {
  CATEGORY_LABEL_KEYS,
  formatDateTime,
  PanelMessage,
  Section,
  StorageMissingBanner,
} from "@/components/admin/content-safety/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useUpdateModerationSettings } from "@/hooks/mutations/use-admin-moderation-mutations";
import { useModerationSettings } from "@/hooks/queries/use-admin-moderation";
import type { ModerationCategory, ModerationSettings, ModerationThreshold } from "@/types/admin-moderation";

type Draft = { enabled: boolean; blockAt: Partial<Record<ModerationCategory, ModerationThreshold>> };

const draftOf = (settings: ModerationSettings): Draft => ({
  enabled: settings.enabled,
  blockAt: Object.fromEntries(
    settings.thresholds
      .filter((threshold) => !threshold.locked && threshold.blockAt !== "any")
      .map((threshold) => [threshold.category, threshold.blockAt as ModerationThreshold])
  ),
});

const CATEGORY_HINT_KEYS: Partial<Record<ModerationCategory, string>> = {
  sexual: "admin.contentSafety.settings.hints.sexual",
  violence_gore: "admin.contentSafety.settings.hints.violenceGore",
  hate: "admin.contentSafety.settings.hints.hate",
  ip_trademark: "admin.contentSafety.settings.hints.ipTrademark",
};

const Notice = ({ children }: { children: React.ReactNode }) => (
  <div
    role="status"
    className="border-ink-200 bg-ink-50 text-ink-700 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
  >
    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div>{children}</div>
  </div>
);

export const SettingsPanel = () => {
  const { t } = useTranslation("common");
  const settings = useModerationSettings();
  const update = useUpdateModerationSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const data = settings.data;

  // The form starts from what is stored, and again after each save.
  useEffect(() => {
    if (data) setDraft(draftOf(data));
  }, [data]);

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    const stored = draftOf(data);
    return (
      stored.enabled !== draft.enabled ||
      Object.entries(draft.blockAt).some(([category, value]) => stored.blockAt[category as ModerationCategory] !== value)
    );
  }, [data, draft]);

  if (settings.isError)
    return (
      <Section title={t("admin.contentSafety.tabs.settings")}>
        <PanelMessage tone="error" title={t("admin.contentSafety.settings.loadError")} />
      </Section>
    );
  if (!data || !draft) return <Skeleton className="h-96 w-full rounded-xl" />;

  const editable = data.storageReady;
  const save = () => update.mutate({ enabled: draft.enabled, blockAt: draft.blockAt });

  return (
    <div className="flex flex-col gap-5 max-md:gap-3">
      {!data.storageReady && <StorageMissingBanner />}
      {!data.configEnabled && (
        <Notice>
          <Trans
            i18nKey="admin.contentSafety.settings.noticeGeminiOff"
            components={{ strong: <strong className="font-semibold" />, code: <code className="text-xs" /> }}
          />
        </Notice>
      )}
      {data.configEnabled && !data.geminiConfigured && (
        <Notice>
          <Trans
            i18nKey="admin.contentSafety.settings.noticeNoKey"
            components={{ strong: <strong className="font-semibold" />, code: <code className="text-xs" /> }}
          />
        </Notice>
      )}

      <Section
        title={t("admin.contentSafety.settings.geminiCheck")}
        description={t("admin.contentSafety.settings.geminiCheckDesc")}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="moderation-enabled" className="text-ink-800 text-sm font-semibold">
              {t("admin.contentSafety.settings.enabledLabel")}
            </label>
            <p className="text-ink-500 text-xs leading-relaxed">
              {t("admin.contentSafety.settings.modelLine", { model: data.model, version: data.policyVersion })}
            </p>
          </div>
          <Switch
            id="moderation-enabled"
            checked={draft.enabled}
            disabled={!editable}
            onCheckedChange={(checked) => (checked ? setDraft({ ...draft, enabled: true }) : setConfirmOff(true))}
          />
        </div>
      </Section>

      <Section
        title={t("admin.contentSafety.settings.whenToBlock")}
        description={t("admin.contentSafety.settings.whenToBlockDesc")}
      >
        <ul className="divide-ink-100 divide-y">
          {data.thresholds.map((threshold) => (
            <li key={threshold.category} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-ink-800 flex items-center gap-1.5 text-sm font-semibold">
                  {t(CATEGORY_LABEL_KEYS[threshold.category])}
                  {threshold.locked ? (
                    <Lock className="text-ink-400 size-3.5" aria-label={t("admin.contentSafety.settings.lockedAria")} />
                  ) : null}
                </p>
                <p className="text-ink-500 text-xs leading-relaxed">
                  {threshold.locked
                    ? t("admin.contentSafety.settings.lockedMinors")
                    : t(CATEGORY_HINT_KEYS[threshold.category] ?? "admin.contentSafety.settings.hintFallback")}
                </p>
              </div>
              {threshold.locked ? (
                <span className="text-ink-600 bg-ink-100 justify-self-start rounded-lg px-3 py-1.5 text-xs font-semibold sm:justify-self-end">
                  {t("admin.contentSafety.settings.blocksAtAny")}
                </span>
              ) : (
                <RadioGroup
                  value={draft.blockAt[threshold.category] ?? "high"}
                  onValueChange={(value) =>
                    setDraft({ ...draft, blockAt: { ...draft.blockAt, [threshold.category]: value as ModerationThreshold } })
                  }
                  disabled={!editable}
                  aria-label={t("admin.contentSafety.settings.thresholdAria", { category: t(CATEGORY_LABEL_KEYS[threshold.category]) })}
                  className="bg-ink-100 inline-flex gap-1 justify-self-start rounded-lg p-1 sm:justify-self-end"
                >
                  {(["high", "medium"] as const).map((value) => (
                    <label
                      key={value}
                      htmlFor={`threshold-${threshold.category}-${value}`}
                      className="has-[[data-state=checked]]:bg-card has-[[data-state=checked]]:text-ink-900 dark:has-[[data-state=checked]]:text-ink-50 text-ink-600 flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium has-[[data-state=checked]]:shadow-sm"
                    >
                      <RadioGroupItem id={`threshold-${threshold.category}-${value}`} value={value} />
                      {value === "high"
                        ? t("admin.contentSafety.settings.blockHighOnly")
                        : t("admin.contentSafety.settings.blockMediumToo")}
                    </label>
                  ))}
                </RadioGroup>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-500 text-xs">
          {data.updatedAt
            ? data.updatedByEmail
              ? t("admin.contentSafety.settings.lastChangedBy", { time: formatDateTime(data.updatedAt), email: data.updatedByEmail })
              : t("admin.contentSafety.settings.lastChanged", { time: formatDateTime(data.updatedAt) })
            : t("admin.contentSafety.settings.defaultSettings")}{" "}
          {t("admin.contentSafety.settings.changesApply")}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!dirty || update.isPending} onClick={() => setDraft(draftOf(data))}>
            {t("admin.contentSafety.settings.discard")}
          </Button>
          <Button type="button" disabled={!dirty || !editable || update.isPending} onClick={save}>
            {update.isPending && <Spinner className="size-4" />}
            {t("admin.contentSafety.settings.saveSettings")}
          </Button>
        </div>
      </div>

      <Dialog open={confirmOff} onOpenChange={setConfirmOff}>
        <DialogContent showCloseButton={false} className={`${DIALOG_CLASS} max-w-[460px]`}>
          <DialogHead
            icon={PowerOff}
            eyebrow={t("admin.contentSafety.settings.confirmOffEyebrow")}
            title={t("admin.contentSafety.settings.confirmOffTitle")}
            description={t("admin.contentSafety.settings.confirmOffDesc")}
            onClose={() => setConfirmOff(false)}
          />
          <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setConfirmOff(false)}>
              {t("admin.contentSafety.settings.keepGeminiOn")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDraft({ ...draft, enabled: false });
                setConfirmOff(false);
              }}
            >
              {t("admin.contentSafety.settings.switchOff")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
