"use client";

import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

type CreateSamplePayload = {
  title: string;
};

type CreatedSample = {
  id: number;
  title: string;
};

const WAIT_MS = 400;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createSampleItem = async (payload: CreateSamplePayload): Promise<CreatedSample> => {
  await wait(WAIT_MS);
  return { id: Date.now(), title: payload.title };
};

export const useCreateSample = () =>
  useMutation({
    mutationFn: createSampleItem,
    onSuccess: (created) => {
      showToast("success", `Created sample ${created.id}`);
    },
  });
