"use client";

import { useEffect, useMemo, useState } from "react";
import { Clapperboard, ImageIcon, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { KeyActions, KeyName, KeyStatus, KeyUsage, lastChecked } from "@/components/admin/system-api-keys/key-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCheckSystemApiKey,
  useClearSystemApiKeyRefusal,
  useReorderSystemApiKeys,
  useUpdateSystemApiKey,
  useUpdateSystemApiKeyProvider,
} from "@/hooks/mutations/use-admin-system-api-key-mutations";
import { useIsPhone } from "@/hooks/use-is-phone";
import { type SystemApiKeyProviderFormValues, systemApiKeyProviderSchema, toLimit } from "@/schemas/admin-system-api-keys";
import type { AdminSystemApiKey, AdminSystemApiKeyProvider, SystemApiKeyStrategy } from "@/types/admin-system-api-keys";

const PROVIDER_USE: Record<string, { icon: typeof ImageIcon; textKey: string }> = {
  ideogram: { icon: ImageIcon, textKey: "admin.systemApiKeys.providerUse.ideogram" },
  minimax: { icon: Clapperboard, textKey: "admin.systemApiKeys.providerUse.minimax" },
};

const STRATEGY_TEXT_KEYS: Record<SystemApiKeyStrategy, string> = {
  fill: "admin.systemApiKeys.strategy.fill",
  rotate: "admin.systemApiKeys.strategy.rotate",
};

const toDraft = (provider: AdminSystemApiKeyProvider): SystemApiKeyProviderFormValues => ({
  dailyLimitPerKey: provider.dailyLimitPerKey?.toString() ?? "",
  maxConcurrentPerKey: provider.maxConcurrentPerKey?.toString() ?? "",
  strategy: provider.strategy,
});

type ProviderSectionProps = {
  provider: AdminSystemApiKeyProvider;
  onDelete: (key: AdminSystemApiKey) => void;
};

export const ProviderSection = ({ provider, onDelete }: ProviderSectionProps) => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();
  const use = PROVIDER_USE[provider.provider];
  const Icon = use?.icon ?? KeyRound;
  const inUse = provider.keys.filter((key) => key.isActive && key.readable).length;

  return (
    <section aria-labelledby={`provider-${provider.provider}`} className="bg-card rounded-xl border shadow-sm">
      <header className="flex items-start gap-3 border-b px-5 py-4 max-md:px-4">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={`provider-${provider.provider}`} className="text-ink-900 text-base font-semibold">
            {provider.name}
          </h2>
          <p className="text-muted-foreground text-sm">{use ? t(use.textKey) : ""}</p>
        </div>
        <span className="bg-ink-100 text-ink-700 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums">
          {t("admin.systemApiKeys.inUseBadge", { inUse, total: provider.keys.length })}
        </span>
      </header>

      <ProviderLimits provider={provider} />

      {provider.keys.length === 0 ? (
        <div className="text-ink-600 m-5 flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center text-sm max-md:m-4">
          <KeyRound className="text-ink-400 size-5" aria-hidden="true" />
          {t("admin.systemApiKeys.emptyState", { provider: provider.name })}
        </div>
      ) : isPhone ? (
        <ul className="divide-y">
          {provider.keys.map((key, index) => (
            <li key={key.id} className="flex flex-col gap-3 px-4 py-4">
              <div className="flex flex-col gap-2">
                <KeyName apiKey={key} />
                <KeyStatus apiKey={key} />
              </div>
              <div className="flex items-end justify-between gap-3">
                <KeyUsage apiKey={key} dailyLimit={provider.dailyLimitPerKey} />
                <span className="text-muted-foreground text-xs">{lastChecked(key.lastCheckedAt)}</span>
              </div>
              <KeyRowActions provider={provider} apiKey={key} index={index} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs font-semibold tracking-wide uppercase">
              <tr>
                <th scope="col" className="w-10 px-5 py-2.5">
                  #
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t("admin.systemApiKeys.table.key")}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t("admin.systemApiKeys.table.status")}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t("admin.systemApiKeys.table.today")}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t("admin.systemApiKeys.table.lastCheck")}
                </th>
                <th scope="col" className="px-5 py-2.5 text-right">
                  {t("admin.systemApiKeys.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {provider.keys.map((key, index) => (
                <tr key={key.id} className={key.isActive ? undefined : "bg-muted/30"}>
                  <td className="text-muted-foreground px-5 py-3 align-top tabular-nums">{index + 1}</td>
                  <td className="max-w-64 px-3 py-3 align-top">
                    <KeyName apiKey={key} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <KeyStatus apiKey={key} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <KeyUsage apiKey={key} dailyLimit={provider.dailyLimitPerKey} />
                  </td>
                  <td className="text-muted-foreground px-3 py-3 align-top text-xs whitespace-nowrap">{lastChecked(key.lastCheckedAt)}</td>
                  <td className="px-5 py-2 align-top">
                    <KeyRowActions provider={provider} apiKey={key} index={index} onDelete={onDelete} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const KeyRowActions = ({
  provider,
  apiKey,
  index,
  onDelete,
}: {
  provider: AdminSystemApiKeyProvider;
  apiKey: AdminSystemApiKey;
  index: number;
  onDelete: (key: AdminSystemApiKey) => void;
}) => {
  const update = useUpdateSystemApiKey();
  const check = useCheckSystemApiKey();
  const clear = useClearSystemApiKeyRefusal();
  const reorder = useReorderSystemApiKeys();
  const busy = update.isPending || check.isPending || clear.isPending || reorder.isPending;

  const move = (step: -1 | 1) => {
    const ids = provider.keys.map((key) => key.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    reorder.mutate({ provider: provider.provider, keyIds: ids });
  };

  return (
    <KeyActions
      apiKey={apiKey}
      isFirst={index === 0}
      isLast={index === provider.keys.length - 1}
      busy={busy}
      onToggle={(active) =>
        update.mutate({ id: apiKey.id, input: { label: apiKey.label, isActive: active, updatedAt: apiKey.updatedAt } })
      }
      onCheck={() => check.mutate(apiKey.id)}
      onClearRefusal={() => clear.mutate(apiKey.id)}
      onMove={move}
      onDelete={() => onDelete(apiKey)}
    />
  );
};

const ProviderLimits = ({ provider }: { provider: AdminSystemApiKeyProvider }) => {
  const { t } = useTranslation("common");
  const save = useUpdateSystemApiKeyProvider();
  const saved = useMemo(() => toDraft(provider), [provider]);
  const [draft, setDraft] = useState(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof SystemApiKeyProviderFormValues, string>>>({});
  // A save, or another Admin's change picked up by the refresh, becomes the new starting point.
  useEffect(() => setDraft(saved), [saved]);

  const dirty =
    draft.dailyLimitPerKey !== saved.dailyLimitPerKey ||
    draft.maxConcurrentPerKey !== saved.maxConcurrentPerKey ||
    draft.strategy !== saved.strategy;
  const id = (field: string) => `${provider.provider}-${field}`;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = systemApiKeyProviderSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    setErrors({});
    save.mutate({
      provider: provider.provider,
      input: {
        dailyLimitPerKey: toLimit(parsed.data.dailyLimitPerKey),
        maxConcurrentPerKey: toLimit(parsed.data.maxConcurrentPerKey),
        strategy: parsed.data.strategy,
        updatedAt: provider.updatedAt,
      },
    });
  };

  return (
    <form onSubmit={submit} className="bg-ink-50 border-b px-5 py-4 max-md:px-4" aria-label={t("admin.systemApiKeys.limits.formAria", { provider: provider.name })}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-start">
        <LimitField
          id={id("daily")}
          label={t("admin.systemApiKeys.limits.dailyLabel")}
          hint={t("admin.systemApiKeys.limits.dailyHint")}
          value={draft.dailyLimitPerKey}
          error={errors.dailyLimitPerKey}
          onChange={(value) => setDraft({ ...draft, dailyLimitPerKey: value })}
        />
        <LimitField
          id={id("concurrent")}
          label={t("admin.systemApiKeys.limits.concurrentLabel")}
          hint={t("admin.systemApiKeys.limits.concurrentHint")}
          value={draft.maxConcurrentPerKey}
          error={errors.maxConcurrentPerKey}
          onChange={(value) => setDraft({ ...draft, maxConcurrentPerKey: value })}
        />
        <div className="space-y-1.5">
          <label htmlFor={id("strategy")} className="text-ink-700 text-sm font-medium">
            {t("admin.systemApiKeys.limits.orderLabel")}
          </label>
          <Select value={draft.strategy} onValueChange={(value) => setDraft({ ...draft, strategy: value as SystemApiKeyStrategy })}>
            <SelectTrigger id={id("strategy")} className="bg-card w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fill">{t("admin.systemApiKeys.strategy.fillOption")}</SelectItem>
              <SelectItem value="rotate">{t("admin.systemApiKeys.strategy.rotateOption")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-ink-500 text-xs leading-relaxed">{t(STRATEGY_TEXT_KEYS[draft.strategy])}</p>
        </div>
        <Button type="submit" variant="outline" className="md:mt-6" disabled={!dirty || save.isPending}>
          {save.isPending ? t("admin.systemApiKeys.limits.saving") : t("admin.systemApiKeys.limits.save")}
        </Button>
      </div>
    </form>
  );
};

const LimitField = ({
  id,
  label,
  hint,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) => {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-ink-700 text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder={t("admin.systemApiKeys.limits.noLimitPlaceholder")}
        className="bg-card"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-hint`} role={error ? "alert" : undefined} className={error ? "text-destructive text-xs" : "text-ink-500 text-xs leading-relaxed"}>
        {error ?? hint}
      </p>
    </div>
  );
};
