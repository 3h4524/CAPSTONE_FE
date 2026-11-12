"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { AvatarCard } from "@/components/profile/avatar-card";
import { PersonalForm } from "@/components/profile/personal-form";
import { Button } from "@/components/ui/button";
import { toFormValues, toProfilePayload } from "@/helpers/profile-form";
import { getResponseStatus } from "@/helpers/response-status";
import { useUpdateProfile } from "@/hooks/mutations/use-update-profile";
import { useProfile } from "@/hooks/queries/use-profile";
import type { ProfileFormValues } from "@/schemas/profile";
import { profileSchema } from "@/schemas/profile";
import { useAuthStore } from "@/stores/auth";
import type { AccountVariant } from "@/types/profile";
import { zodResolver } from "@hookform/resolvers/zod";

type ProfileProps = {
  /** "admin" drops the shop controls an admin account does not have. */
  variant?: AccountVariant;
};

export const Profile = ({ variant = "seller" }: ProfileProps) => {
  const router = useRouter();
  const { data, isError, error: profileError } = useProfile();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const clearSession = useAuthStore((state) => state.clearSession);

  const {
    register,
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
    },
  });

  const fullName = watch("fullName");

  useEffect(() => {
    if (data) {
      reset(toFormValues(data));
    }
  }, [data, reset]);

  useEffect(() => {
    if (isError && getResponseStatus(profileError) === 401) {
      clearSession();
      router.replace("/login");
    }
  }, [isError, profileError, clearSession, router]);

  if (isError && !data) {
    if (getResponseStatus(profileError) !== 401) {
      throw profileError instanceof Error
        ? profileError
        : new Error("Could not load your profile.", { cause: profileError });
    }
    return null;
  }

  const avatarUrl = data?.avatarUrl ?? null;
  const email = data?.email ?? "";

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile(toProfilePayload(values, variant));
  };

  const handleDiscard = () => {
    if (data) {
      reset(toFormValues(data));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div className="space-y-0.5">
            <h1 className="text-base leading-none font-semibold">Profile</h1>
            <p className="text-muted-foreground text-sm">
              {variant === "admin"
                ? "Manage your administrator name and sign-in email."
                : "Manage your personal and workspace details."}
            </p>
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
          <div className="grid content-start px-6 py-5">
            <PersonalForm register={register} errors={errors} variant={variant} />
          </div>
        </div>
      </div>
    </form>
  );
};
