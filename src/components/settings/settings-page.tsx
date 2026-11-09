"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Clock3, KeyRound, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, TIMEZONES } from "@/constants/profile";
import { applyTheme } from "@/helpers/theme";
import { applyUserPreferences } from "@/helpers/user-preferences";
import { useUpdateProfile } from "@/hooks/mutations/use-update-profile";
import { useProfile } from "@/hooks/queries/use-profile";
import type { AccountVariant, Profile, UpdateProfilePayload } from "@/types/profile";
import { cn } from "@/utils/cn";

type SettingsDraft = {
  timezone: string;
  language: string;
  themePreference: string;
  notificationEmailEnabled: boolean;
  newsletterSubscribed: boolean;
};

// Sits on the bottom tabs (56px and a 1px border). The right padding leaves the assistant button its place.
const PHONE_SAVE_BAR_CLASS_NAME =
  "fixed inset-x-0 bottom-[57px] z-20 flex gap-2 border-t border-ink-200 bg-card py-2 pr-[4.5rem] pl-4 md:hidden";

// A framed row on larger screens; on a phone the rows of a card are divided by a line.
const ROW_CLASS_NAME =
  "flex items-center justify-between gap-4 rounded-xl border border-ink-200/80 bg-ink-50/35 px-3.5 py-3 max-md:rounded-none max-md:border-x-0 max-md:border-t-0 max-md:bg-transparent max-md:px-0 max-md:pt-0 max-md:pb-3 max-md:last:border-b-0 max-md:last:pb-0";

const fromProfile = (profile: Profile): SettingsDraft => ({
  timezone: profile.timezone,
  language: profile.language,
  themePreference: profile.themePreference ?? "system",
  notificationEmailEnabled: profile.notificationEmailEnabled,
  newsletterSubscribed: profile.newsletterSubscribed,
});

type SettingsPageProps = {
  /** "admin" hides the seller newsletter and shows the mandatory email 2FA and password controls. */
  variant?: AccountVariant;
};

export const SettingsPage = ({ variant = "seller" }: SettingsPageProps) => {
  const isAdmin = variant === "admin";
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

  // The draft previews live; leaving without saving must fall back to the saved theme.
  const savedThemeRef = useRef(data?.themePreference);
  useEffect(() => {
    savedThemeRef.current = data?.themePreference;
  }, [data]);
  useEffect(() => () => applyTheme(savedThemeRef.current), []);

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
    const { newsletterSubscribed, ...shared } = draft;
    const payload: UpdateProfilePayload = isAdmin ? shared : { ...shared, newsletterSubscribed };
    updateProfile(payload);
  };

  const discard = () => {
    if (data) setDraft(fromProfile(data));
  };

  const saved = data ? fromProfile(data) : draft;
  const hasChanges = (Object.keys(draft) as (keyof SettingsDraft)[]).some((key) => draft[key] !== saved[key]);

  return (
    // The admin shell already pads its page area, so the admin variant adds none of its own.
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6 max-md:gap-3", !isAdmin && "md:p-6 lg:p-8", hasChanges ? "max-md:pb-20" : "max-md:pb-14")}>
      <section className="relative overflow-hidden rounded-2xl border border-ink-200 bg-gradient-to-br from-card via-card to-blue-50/70 dark:to-blue-500/10 px-5 py-5 shadow-sm max-md:p-4 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-blue-100/70 dark:bg-blue-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-blue-600 dark:text-blue-400 uppercase max-md:hidden"><span className="size-1.5 rounded-full bg-blue-600" />{t("settings.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 max-md:mt-0 max-md:text-2xl">{t("settings.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500 max-md:hidden">{t("settings.description")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-ink-200 bg-card/85 p-1 shadow-sm backdrop-blur max-md:hidden">
            <Button type="button" variant="ghost" className="text-ink-500 hover:bg-ink-50 hover:text-ink-900" onClick={discard} disabled={isSaving}>{t("settings.discard")}</Button>
            <Button type="button" className="min-w-32 shadow-sm" onClick={save} disabled={isSaving}>{isSaving ? t("settings.saving") : <><Check className="size-4" />{t("settings.save")}</>}</Button>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-3 lg:grid-cols-2">
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
          {!isAdmin && <ToggleRow id="newsletter" label={t("settings.productUpdates")} description={t("settings.productUpdatesDescription")} checked={draft.newsletterSubscribed} onChange={(value) => update("newsletterSubscribed", value)} />}
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 px-3.5 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-blue-600 dark:text-blue-400 shadow-sm"><Bell className="size-4" /></span><div><p className="text-sm font-medium text-ink-800">{t("settings.inAppNotifications")}</p><p className="mt-0.5 text-xs leading-5 text-ink-500">{t("settings.inAppNotificationsDescription")}</p></div></div>
        </SettingsCard>

        <SettingsCard icon={<ShieldCheck className="size-4" />} title={t("settings.security")} description={t("settings.securityDescription")}>
          {isAdmin ? (
            <SettingsRow title={t("settings.twoFactor")} description={t("settings.adminTwoFactorDescription")} trailing={<span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{t("settings.alwaysOn")}</span>} />
          ) : (
            <SettingsRow title={t("settings.twoFactor")} description={t("settings.twoFactorDescription")} trailing={<span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-500">{t("settings.comingSoon")}</span>} />
          )}
          {isAdmin && (
            <SettingsRow stacksOnPhone title={t("settings.password")} description={t("settings.passwordDescription")} trailing={<Button asChild type="button" variant="outline" size="sm" className="shrink-0 max-sm:w-full"><Link href="/change-password"><KeyRound className="size-3.5" />{t("settings.changePassword")}</Link></Button>} />
          )}
          <SettingsRow stacksOnPhone title={t("settings.accountProfile")} description={t(isAdmin ? "settings.adminAccountProfileDescription" : "settings.accountProfileDescription")} trailing={<Button asChild type="button" variant="outline" size="sm" className="shrink-0 max-sm:w-full"><Link href={isAdmin ? "/admin/profile" : "/profile"}><UserRound className="size-3.5" />{t("settings.openProfile")}</Link></Button>} />
        </SettingsCard>
      </div>

      {/* A phone scrolls past the page's own buttons, so the choice to save follows the change. */}
      {hasChanges && (
        <div className={PHONE_SAVE_BAR_CLASS_NAME}>
          <Button type="button" variant="outline" className="flex-1 px-2" onClick={discard} disabled={isSaving}>{t("settings.discard")}</Button>
          <Button type="button" className="flex-1 px-2" onClick={save} disabled={isSaving}>{isSaving ? t("settings.saving") : <><Check className="size-4" />{t("settings.save")}</>}</Button>
        </div>
      )}
    </div>
  );
};

function SettingsCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-ink-200/90 bg-card py-0 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <CardHeader className="gap-3 border-b border-ink-100 bg-ink-50/45 px-5 py-4 max-md:px-4 max-md:py-3 sm:px-6"><div className="flex items-start gap-3 max-md:items-center"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-500/30">{icon}</span><div className="min-w-0"><CardTitle className="text-[15px] text-ink-900">{title}</CardTitle><CardDescription className="mt-1 leading-5 max-md:hidden">{description}</CardDescription></div></div></CardHeader>
      <CardContent className="space-y-3 px-5 py-5 max-md:p-4 sm:px-6">{children}</CardContent>
    </Card>
  );
}

function SettingSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label className="text-[13px] font-medium text-ink-700">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="h-11 w-full rounded-xl border-ink-200 bg-card shadow-none hover:border-blue-300 dark:hover:border-blue-500/40 focus-visible:border-blue-400 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-500/30"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

function ToggleRow({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  // The switch is small for a finger, so on a phone the whole row is its label.
  return <div className={cn(ROW_CLASS_NAME, "relative")}><div className="min-w-0"><Label htmlFor={id} className="text-sm font-medium text-ink-800">{label}</Label><p className="mt-0.5 text-xs leading-5 text-ink-500">{description}</p></div><Switch id={id} checked={checked} onCheckedChange={onChange} /><label htmlFor={id} aria-hidden="true" className="absolute inset-0 md:hidden" /></div>;
}

function InfoNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-2.5 text-xs leading-5 text-ink-500 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0">{children}</div>;
}

function SettingsRow({ title, description, trailing, stacksOnPhone }: { title: string; description: string; trailing: ReactNode; stacksOnPhone?: boolean }) {
  return <div className={cn(ROW_CLASS_NAME, stacksOnPhone && "max-sm:flex-col max-sm:items-stretch max-sm:gap-2")}><div className="min-w-0"><p className="text-sm font-medium text-ink-800">{title}</p><p className="mt-0.5 text-xs leading-5 text-ink-500">{description}</p></div>{trailing}</div>;
}
