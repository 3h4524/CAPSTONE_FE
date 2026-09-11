"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getResponseStatus } from "@/helpers/response-status";
import { useProfile } from "@/hooks/queries/use-profile";
import { useUserStore } from "@/stores/user";

export const UserHydrator = () => {
  const router = useRouter();
  const { data, isError, error } = useProfile();
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    if (data) {
      setUser({ email: data.email, fullName: data.fullName, avatarUrl: data.avatarUrl });
    }
  }, [data, setUser]);

  useEffect(() => {
    if (isError && getResponseStatus(error) === 401) {
      clearUser();
      router.replace("/login");
    }
  }, [isError, error, clearUser, router]);

  return null;
};
