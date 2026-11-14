"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Lock, PowerOff } from "lucide-react";

import { DIALOG_CLASS, DialogHead } from "@/components/admin/content-safety/blocklist/form-parts";
import {
  CATEGORY_LABELS,
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

const CATEGORY_HINTS: Partial<Record<ModerationCategory, string>> = {
  sexual: "Medium includes suggestive slang and sexual innuendo.",
  violence_gore: "Medium includes stylized horror with blood.",
  hate: "Medium includes edgy jokes about groups.",
  ip_trademark: "Medium includes designs that only hint at a brand or character.",
};

const Notice = ({ children }: { children: React.ReactNode }) => (
  <div
    role="status"
    className="border-ink-200 bg-ink-50 text-ink-700 dark:bg-ink-800/40 dark:text-ink-200 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
  >
    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div>{children}</div>
  </div>
);

export const SettingsPanel = () => {
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
      <Section title="Settings">
        <PanelMessage tone="error" title="The settings could not be loaded." />
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
          <strong className="font-semibold">Gemini is switched off in the server configuration</strong>{" "}
          (<code className="text-xs">Moderation:Enabled</code>). Only the blocklist runs, whatever is set here.
        </Notice>
      )}
      {data.configEnabled && !data.geminiConfigured && (
        <Notice>
          <strong className="font-semibold">No Gemini key is configured</strong> for the platform, so only the blocklist
          runs. Set <code className="text-xs">Gemini:TextGeneration:ApiKey</code>.
        </Notice>
      )}

      <Section
        title="Gemini check"
        description="The blocklist always runs. Gemini reads what the blocklist lets through, and every image the AI returns."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="moderation-enabled" className="text-ink-800 dark:text-ink-100 text-sm font-semibold">
              Check seller text and AI images with Gemini
            </label>
            <p className="text-ink-500 text-xs leading-relaxed">
              Model {data.model} · policy version {data.policyVersion}. Paid with the platform&apos;s key, about $0.0005 per check.
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
        title="When to block"
        description="Gemini rates each concern low, medium or high. High always blocks; choose whether medium blocks too. Medium that does not block is let through and logged as flagged."
      >
        <ul className="divide-ink-100 divide-y">
          {data.thresholds.map((threshold) => (
            <li key={threshold.category} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-ink-800 dark:text-ink-100 flex items-center gap-1.5 text-sm font-semibold">
                  {CATEGORY_LABELS[threshold.category]}
                  {threshold.locked ? <Lock className="text-ink-400 size-3.5" aria-label="Locked" /> : null}
                </p>
                <p className="text-ink-500 text-xs leading-relaxed">
                  {threshold.locked
                    ? "Any concern about minors in a sexual context blocks. This cannot be changed."
                    : CATEGORY_HINTS[threshold.category] ?? "Medium covers edgy content common in streetwear designs."}
                </p>
              </div>
              {threshold.locked ? (
                <span className="text-ink-600 bg-ink-100 dark:bg-ink-800/60 justify-self-start rounded-lg px-3 py-1.5 text-xs font-semibold sm:justify-self-end">
                  Blocks at any rating
                </span>
              ) : (
                <RadioGroup
                  value={draft.blockAt[threshold.category] ?? "high"}
                  onValueChange={(value) =>
                    setDraft({ ...draft, blockAt: { ...draft.blockAt, [threshold.category]: value as ModerationThreshold } })
                  }
                  disabled={!editable}
                  aria-label={`${CATEGORY_LABELS[threshold.category]} threshold`}
                  className="bg-ink-100 dark:bg-ink-800/60 inline-flex gap-1 justify-self-start rounded-lg p-1 sm:justify-self-end"
                >
                  {(["high", "medium"] as const).map((value) => (
                    <label
                      key={value}
                      htmlFor={`threshold-${threshold.category}-${value}`}
                      className="has-[[data-state=checked]]:bg-card has-[[data-state=checked]]:text-ink-900 dark:has-[[data-state=checked]]:text-ink-50 text-ink-600 flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium has-[[data-state=checked]]:shadow-sm"
                    >
                      <RadioGroupItem id={`threshold-${threshold.category}-${value}`} value={value} />
                      {value === "high" ? "Block high only" : "Block medium too"}
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
            ? `Last changed ${formatDateTime(data.updatedAt)}${data.updatedByEmail ? ` by ${data.updatedByEmail}` : ""}.`
            : "Using the default settings."}{" "}
          Changes apply to the next check.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!dirty || update.isPending} onClick={() => setDraft(draftOf(data))}>
            Discard
          </Button>
          <Button type="button" disabled={!dirty || !editable || update.isPending} onClick={save}>
            {update.isPending && <Spinner className="size-4" />}
            Save settings
          </Button>
        </div>
      </div>

      <Dialog open={confirmOff} onOpenChange={setConfirmOff}>
        <DialogContent showCloseButton={false} className={`${DIALOG_CLASS} max-w-[460px]`}>
          <DialogHead
            icon={PowerOff}
            eyebrow="SWITCH OFF GEMINI"
            title="Check with the blocklist only?"
            description="Without Gemini, only listed words are caught: explicit or hateful text written another way gets through, and AI images are no longer checked. Save to apply."
            onClose={() => setConfirmOff(false)}
          />
          <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setConfirmOff(false)}>
              Keep Gemini on
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDraft({ ...draft, enabled: false });
                setConfirmOff(false);
              }}
            >
              Switch off
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
