"use client";

import { batchKeys, listBatchProducts } from "@/api/batches";
import { useQuery } from "@/hooks/queries/use-query";

export const useBatchProducts = (batchId: string) => useQuery({ queryKey: batchKeys.products(batchId), queryFn: () => listBatchProducts(batchId), enabled: Boolean(batchId) });
