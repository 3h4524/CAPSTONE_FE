"use client";

import { useEffect } from "react";

import { useAdminShellStore } from "@/stores/admin-shell";

type UseAdminShellOptionsParams = {
  hidesPhoneTabs?: boolean;
  title?: string;
};

export const useAdminShellOptions = ({ hidesPhoneTabs = false, title }: UseAdminShellOptionsParams) => {
  const setOptions = useAdminShellStore((state) => state.setOptions);
  const resetOptions = useAdminShellStore((state) => state.resetOptions);

  useEffect(() => {
    setOptions({ hidesPhoneTabs, titleOverride: title ?? null });
    return resetOptions;
  }, [hidesPhoneTabs, title, setOptions, resetOptions]);
};
