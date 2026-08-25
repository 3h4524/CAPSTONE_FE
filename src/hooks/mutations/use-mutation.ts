"use client";

import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation as useBaseMutation } from "@tanstack/react-query";

type UseMutationProps<TData, TVariables, TContext> = {
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
  onError?: (error: unknown, variables: TVariables, context: TContext | undefined) => void;
  suppressErrorToast?: boolean;
} & Omit<UseMutationOptions<TData, Error, TVariables, TContext>, "onSuccess" | "onError">;

export const useMutation = <TData, TVariables, TContext = unknown>({
  onSuccess: handleSuccess,
  onError: handleError,
  suppressErrorToast = false,
  ...options
}: UseMutationProps<TData, TVariables, TContext>) => {
  const mutationInfo = useBaseMutation<TData, Error, TVariables, TContext>({
    retry: 0,
    ...options,
    onSuccess: (data, variables, context) => {
      handleSuccess?.(data, variables, context);
    },
  });

  const showDefaultError = (error: unknown) => {
    if (suppressErrorToast) {
      return;
    }
    showToast("error", getErrorMessage(error));
  };

  const originalMutate = mutationInfo.mutate;

  const wrappedMutate = ((
    variables: TVariables,
    mutateOptions?: Parameters<typeof originalMutate>[1]
  ) => {
    return originalMutate(variables, {
      ...mutateOptions,
      onError: (error, vars, context, mutationContext) => {
        if (mutateOptions?.onError) {
          mutateOptions.onError(error, vars, context, mutationContext);
        } else if (handleError) {
          handleError(error, vars, context);
        } else {
          showDefaultError(error);
        }
      },
    });
  }) as typeof mutationInfo.mutate;

  const originalMutateAsync = mutationInfo.mutateAsync;

  const wrappedMutateAsync = ((
    variables: TVariables,
    mutateOptions?: Parameters<typeof originalMutateAsync>[1]
  ) => {
    return originalMutateAsync(variables, {
      ...mutateOptions,
      onError: (error, vars, context, mutationContext) => {
        if (mutateOptions?.onError) {
          mutateOptions.onError(error, vars, context, mutationContext);
        } else if (handleError) {
          handleError(error, vars, context);
        } else {
          showDefaultError(error);
        }
      },
    });
  }) as typeof mutationInfo.mutateAsync;

  return {
    ...mutationInfo,
    mutate: wrappedMutate,
    mutateAsync: wrappedMutateAsync,
  };
};
