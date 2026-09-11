"use client";

import { api } from "@/api/client";
import { getResponseStatus } from "@/helpers/response-status";
import { showToast } from "@/helpers/toast";
import { useQuery } from "@/hooks/queries/use-query";
import type { Profile } from "@/types/profile";

export const PROFILE_QUERY_KEY = ["profile"] as const;

export const getProfileRequest = async (): Promise<Profile> => {
  const { data } = await api.get<Profile>("/api/profile");
  return data;
};
export const useProfile = () =>
  useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfileRequest,
    suppressErrorToast: true,
    onError: (error) => {
      if (getResponseStatus(error) !== 401) {
        showToast("error", "Could not load your profile.");
      }
    },
  });
