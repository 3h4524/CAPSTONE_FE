"use client";

import { useTranslation } from "react-i18next";

import { api } from "@/api/client";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { PROFILE_QUERY_KEY } from "@/hooks/queries/use-profile";
import { useAuthStore } from "@/stores/auth";
import type { Profile, UpdateProfilePayload } from "@/types/profile";
import { useQueryClient } from "@tanstack/react-query";

const updateProfileRequest = async (payload: UpdateProfilePayload): Promise<Profile> => {
  const { data } = await api.patch<Profile>("/api/profile", payload);
  return data;
};
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");

  return useMutation<Profile, UpdateProfilePayload>({
    mutationFn: updateProfileRequest,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      // Shells that read the signed-in user from the auth store (the admin sidebar) show the new name at once.
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.setState({ user: { ...user, fullName: profile.fullName, email: profile.email } });
      showToast("success", t("profile.updated"));
    },
  });
};
