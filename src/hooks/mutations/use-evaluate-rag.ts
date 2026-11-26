"use client";

import { evaluateRag } from "@/api/rag";
import { createRagEvaluationRun } from "@/helpers/rag-evaluation";
import { useMutation } from "@/hooks/mutations/use-mutation";
import type { RagEvaluationWorkspace } from "@/schemas/rag-evaluation";

const EVALUATION_TOP_K = 5;

type RunEvaluationInput = {
  cases: RagEvaluationWorkspace["datasetCases"];
  number: number;
};

export const useEvaluateRag = () =>
  useMutation({
    mutationFn: async ({ cases, number }: RunEvaluationInput) => {
      const response = await evaluateRag({
        topK: EVALUATION_TOP_K,
        cases: cases.map((item) => ({
          id: item.id,
          category: "retrieval",
          contentType: item.contentType,
          search: { query: item.question, contentType: item.contentType },
          expectedText: item.expectedText,
        })),
      });
      return createRagEvaluationRun(response, cases, number);
    },
    suppressErrorToast: true,
  });
