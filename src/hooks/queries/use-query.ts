"use client";

import { useEffect, useRef } from "react";

import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import { useQuery as useBaseQuery } from "@tanstack/react-query";

type NotifyPayload = {
  message?: string;
  duration?: number;
};

type UseQueryProps<TQueryFnData, TError, TData> = {
  queryKey: QueryKey;
  queryFn: () => Promise<TQueryFnData>;
  notifySuccess?: NotifyPayload;
  notifyError?: NotifyPayload;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
  suppressErrorToast?: boolean;
} & Omit<UseQueryOptions<TQueryFnData, TError, TData>, "queryKey" | "queryFn">;

export const useQuery = <TQueryFnData, TError = unknown, TData = TQueryFnData>({
  queryKey,
  queryFn,
  notifySuccess,
  notifyError,
  onSuccess: handleSuccess,
  onError: handleError,
  suppressErrorToast = false,
  ...options
}: UseQueryProps<TQueryFnData, TError, TData>) => {
  const notifySuccessRef = useRef(notifySuccess);
  const notifyErrorRef = useRef(notifyError);
  const onSuccessRef = useRef(handleSuccess);
  const onErrorRef = useRef(handleError);
  const suppressErrorToastRef = useRef(suppressErrorToast);

  useEffect(() => {
    notifySuccessRef.current = notifySuccess;
    notifyErrorRef.current = notifyError;
    onSuccessRef.current = handleSuccess;
    onErrorRef.current = handleError;
    suppressErrorToastRef.current = suppressErrorToast;
  });

  const queryInfo = useBaseQuery<TQueryFnData, TError, TData>({
    retry: 0,
    ...options,
    queryKey,
    queryFn,
  });

  useEffect(() => {
    if (queryInfo.isSuccess) {
      if (notifySuccessRef.current) {
        const { message, duration } = notifySuccessRef.current;
        showToast("success", message ?? "", duration ? { duration } : undefined);
      }
      onSuccessRef.current?.(queryInfo.data);
    }

    if (queryInfo.isError) {
      if (!suppressErrorToastRef.current) {
        const { message, duration } = notifyErrorRef.current ?? {};
        showToast(
          "error",
          message ?? getErrorMessage(queryInfo.error),
          duration ? { duration } : undefined
        );
      }
      onErrorRef.current?.(queryInfo.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInfo.status]);

  return queryInfo;
};
