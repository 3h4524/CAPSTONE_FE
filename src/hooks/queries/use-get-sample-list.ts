"use client";

import { useQuery } from "@/hooks/queries/use-query";

export type SampleItem = {
  id: number;
  title: string;
};

export const SAMPLE_LIST_QUERY_KEY = ["samples"] as const;

const WAIT_MS = 400;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSampleItems = async (): Promise<SampleItem[]> => {
  await wait(WAIT_MS);
  return [
    { id: 1, title: "First sample" },
    { id: 2, title: "Second sample" },
  ];
};

export const useGetSampleList = () =>
  useQuery({
    queryKey: SAMPLE_LIST_QUERY_KEY,
    queryFn: fetchSampleItems,
    suppressErrorToast: true,
  });
