"use client";

import { batchKeys, listBatches } from "@/api/batches";
import { useQuery } from "@/hooks/queries/use-query";

export const useBatches = () => useQuery({ queryKey: batchKeys.all, queryFn: listBatches });
