"use client";
"use no memo";

import { type Control, Controller, type FieldErrors } from "react-hook-form";

import { FormErrorText } from "@/components/commons/forms/form-error-text";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, THEMES, TIMEZONES } from "@/constants/profile";
import type { ProfileFormValues } from "@/schemas/profile";

type PreferencesFormProps = {
  control: Control<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
};

export const PreferencesForm = ({ control, errors }: PreferencesFormProps) => {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Preferences</h2>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormErrorText id="timezone-error" message={errors.timezone?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="language">Interface language</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormErrorText id="language-error" message={errors.language?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="themePreference">Theme</Label>
          <Controller
            control={control}
            name="themePreference"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="themePreference" className="w-full">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormErrorText id="themePreference-error" message={errors.themePreference?.message} />
        </div>

        <Controller
          control={control}
          name="newsletterSubscribed"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="newsletterSubscribed">Newsletter</Label>
              <Switch
                id="newsletterSubscribed"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />

        <Controller
          control={control}
          name="notificationEmailEnabled"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="notificationEmailEnabled">Account emails</Label>
              <Switch
                id="notificationEmailEnabled"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />

        <Controller
          control={control}
          name="twoFactorEnabled"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="twoFactorEnabled">Two-factor authentication</Label>
                <Badge variant="outline">Read-only</Badge>
              </div>
              <Switch id="twoFactorEnabled" checked={field.value} disabled />
            </div>
          )}
        />
    </section>
  );
};
