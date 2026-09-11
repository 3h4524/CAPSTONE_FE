"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { AvatarCard } from "@/components/profile/avatar-card";
import { PersonalForm } from "@/components/profile/personal-form";
import { PreferencesForm } from "@/components/profile/preferences-form";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DEFAULT_LANGUAGE, DEFAULT_THEME, DEFAULT_TIMEZONE } from "@/constants/profile";
import { toFormValues } from "@/helpers/profile-form";
import { getResponseStatus } from "@/helpers/response-status";
import { useUpdateProfile } from "@/hooks/mutations/use-update-profile";
import { useProfile } from "@/hooks/queries/use-profile";
import { type ProfileFormValues, profileSchema } from "@/schemas/profile";
import { zodResolver } from "@hookform/resolvers/zod";

export const Profile = () => {
  const router = useRouter();
  const { data, isError, error: profileError } = useProfile();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      shopName: "",
      shopDescription: "",
      timezone: DEFAULT_TIMEZONE,
      language: DEFAULT_LANGUAGE,
      themePreference: DEFAULT_THEME,
      notificationEmailEnabled: false,
      newsletterSubscribed: false,
      twoFactorEnabled: false,
    },
  });

  useEffect(() => {
    if (data) {
      reset(toFormValues(data));
    }
  }, [data, reset]);

  useEffect(() => {
    if (isError && getResponseStatus(profileError) === 401) {
      router.push("/login");
    }
  }, [isError, profileError, router]);

  if (isError && !data) {
    if (getResponseStatus(profileError) !== 401) {
      throw profileError;
    }
    return null;
  }

  const fullName = watch("fullName");
  const avatarUrl = data?.avatarUrl ?? null;
  const email = data?.email ?? "";

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile(values);
  };

  const handleDiscard = () => {
    if (data) {
      reset(toFormValues(data));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div className="space-y-0.5">
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Manage your personal and workspace details.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDiscard}
              disabled={!isDirty || isUpdating}
            >
              Discard
            </Button>
            <Button type="submit" disabled={!isDirty || isUpdating}>
              Save changes
            </Button>
          </div>
        </div>
        <div className="grid md:grid-cols-[15rem_1fr]">
          <AvatarCard
            avatarUrl={avatarUrl}
            fullName={fullName || data?.fullName || ""}
            email={email}
          />
          <div className="grid content-start gap-x-6 gap-y-5 px-6 py-5 xl:grid-cols-2">
            <PersonalForm register={register} errors={errors} />
            <PreferencesForm control={control} errors={errors} />
          </div>
        </div>
      </Card>
    </form>
  );
};
