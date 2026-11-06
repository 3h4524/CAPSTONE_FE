"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Bell, Check, Clock3, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, TIMEZONES } from "@/constants/profile";
import { applyUserPreferences } from "@/helpers/user-preferences";
import { useUpdateProfile } from "@/hooks/mutations/use-update-profile";
import { useProfile } from "@/hooks/queries/use-profile";
import type { Profile, UpdateProfilePayload } from "@/types/profile";

type SettingsDraft = {
  timezone: string;
  language: string;
  themePreference: string;
  notificationEmailEnabled: boolean;
  newsletterSubscribed: boolean;
};

const fromProfile = (profile: Profile): SettingsDraft => ({
  timezone: profile.timezone,
  language: profile.language,
  themePreference: profile.themePreference ?? "system",
  notificationEmailEnabled: profile.notificationEmailEnabled,
  newsletterSubscribed: profile.newsletterSubscribed,
});

export const SettingsPage = () => {
  const { t } = useTranslation("common");
  const { data, isPending } = useProfile();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();
  const [draft, setDraft] = useState<SettingsDraft | null>(null);

  useEffect(() => {
    if (!data) return;
    setDraft(fromProfile(data));
    applyUserPreferences(data);
  }, [data]);

  useEffect(() => {
    if (!draft) return;
    applyUserPreferences(draft);
  }, [draft]);

  if (isPending || !draft) {
    return <div className="text-muted-foreground flex min-h-96 items-center justify-center text-sm">{t("settings.loading")}</div>;
  }

  const languageOptions = LANGUAGES.map((language) => ({
    value: language.value,
    label: t(`settings.languages.${language.value}`),
  }));
  const update = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const save = () => {
    const payload: UpdateProfilePayload = draft;
    updateProfile(payload);
  };

  const discard = () => {
    if (data) setDraft(fromProfile(data));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/70 px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-blue-600 uppercase"><span className="size-1.5 rounded-full bg-blue-600" />{t("settings.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t("settings.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t("settings.description")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/85 p-1 shadow-sm backdrop-blur">
            <Button type="button" variant="ghost" className="text-slate-500 hover:bg-slate-50 hover:text-slate-900" onClick={discard} disabled={isSaving}>{t("settings.discard")}</Button>
            <Button type="button" className="min-w-32 shadow-sm" onClick={save} disabled={isSaving}>{isSaving ? t("settings.saving") : <><Check className="size-4" />{t("settings.save")}</>}</Button>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <SettingsCard icon={<Palette className="size-4" />} title={t("settings.appearance")} description={t("settings.appearanceDescription")}>
          <div className="max-w-md">
            <SettingSelect label={t("settings.language")} value={draft.language} options={languageOptions} onChange={(value) => update("language", value)} />
          </div>
          <InfoNote>{t("settings.languageDescription")}</InfoNote>
        </SettingsCard>

        <SettingsCard icon={<Clock3 className="size-4" />} title={t("settings.regional")} description={t("settings.regionalDescription")}>
          <SettingSelect label={t("settings.timezone")} value={draft.timezone} options={TIMEZONES.map((value) => ({ value, label: value }))} onChange={(value) => update("timezone", value)} />
          <InfoNote>{t("settings.timezoneDescription")}</InfoNote>
        </SettingsCard>

        <SettingsCard icon={<Bell className="size-4" />} title={t("settings.notifications")} description={t("settings.notificationsDescription")}>
          <ToggleRow id="notification-email" label={t("settings.accountEmails")} description={t("settings.accountEmailsDescription")} checked={draft.notificationEmailEnabled} onChange={(value) => update("notificationEmailEnabled", value)} />
          <ToggleRow id="newsletter" label={t("settings.productUpdates")} description={t("settings.productUpdatesDescription")} checked={draft.newsletterSubscribed} onChange={(value) => update("newsletterSubscribed", value)} />
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm"><Bell className="size-4" /></span><div><p className="text-sm font-medium text-slate-800">{t("settings.inAppNotifications")}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{t("settings.inAppNotificationsDescription")}</p></div></div>
        </SettingsCard>

        <SettingsCard icon={<ShieldCheck className="size-4" />} title={t("settings.security")} description={t("settings.securityDescription")}>
          <SettingsRow title={t("settings.twoFactor")} description={t("settings.twoFactorDescription")} trailing={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">{t("settings.comingSoon")}</span>} />
          <SettingsRow title={t("settings.accountProfile")} description={t("settings.accountProfileDescription")} trailing={<Button asChild type="button" variant="outline" size="sm" className="shrink-0"><a href="/profile"><UserRound className="size-3.5" />{t("settings.openProfile")}</a></Button>} />
        </SettingsCard>
      </div>
    </div>
  );
};

function SettingsCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-slate-200/90 bg-white py-0 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <CardHeader className="gap-3 border-b border-slate-100 bg-slate-50/45 px-5 py-4 sm:px-6"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">{icon}</span><div className="min-w-0"><CardTitle className="text-[15px] text-slate-900">{title}</CardTitle><CardDescription className="mt-1 leading-5">{description}</CardDescription></div></div></CardHeader>
      <CardContent className="space-y-3 px-5 py-5 sm:px-6">{children}</CardContent>
    </Card>
  );
}

function SettingSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label className="text-[13px] font-medium text-slate-700">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white shadow-none hover:border-blue-300 focus-visible:border-blue-400 focus-visible:ring-blue-100"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

function ToggleRow({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/35 px-3.5 py-3"><div className="min-w-0"><Label htmlFor={id} className="text-sm font-medium text-slate-800">{label}</Label><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div><Switch id={id} checked={checked} onCheckedChange={onChange} /> </div>;
}

function InfoNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-500">{children}</div>;
}

function SettingsRow({ title, description, trailing }: { title: string; description: string; trailing: ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/35 px-3.5 py-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-800">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div>{trailing}</div>;
}
