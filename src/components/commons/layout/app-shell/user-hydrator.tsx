"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getResponseStatus } from "@/helpers/response-status";
import { useProfile } from "@/hooks/queries/use-profile";
import { useAuthStore } from "@/stores/auth";

export const UserHydrator = () => {
  const router = useRouter();
  const { data, isError, error } = useProfile();
  const setAvatarUrl = useAuthStore((state) => state.setAvatarUrl);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (data) {
      setAvatarUrl(data.avatarUrl);
    }
  }, [data, setAvatarUrl]);

  useEffect(() => {
    if (isError && getResponseStatus(error) === 401) {
      clearSession();
      router.replace("/login");
    }
  }, [isError, error, clearSession, router]);

  return null;
};
