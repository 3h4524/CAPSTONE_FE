import type { RagEvaluationResponse } from "@/api/rag";
import {
  ragEvaluationContentTypeSchema,
  ragEvaluationRunSchema,
  type RagEvaluationWorkspace,
} from "@/schemas/rag-evaluation";

export const createRagEvaluationRun = (
  response: RagEvaluationResponse,
  submittedCases: RagEvaluationWorkspace["datasetCases"],
  number: number
) => {
  const casesById = new Map(submittedCases.map((item) => [item.id, item]));

  return ragEvaluationRunSchema.parse({
    id: response.runId,
    number,
    createdAt: response.completedAt,
    cases: response.caseCount,
    retrieval: response.retrievalScore,
    evidenceCoverage: response.contextCoverageScore,
    latency: response.averageLatencyMs / 1000,
    typeMetrics: response.typeMetrics ?? [],
    casesData: response.cases.map((item) => {
      const original = casesById.get(item.id);
      const contentType = ragEvaluationContentTypeSchema.safeParse(item.contentType);

      return {
        id: item.id,
        question: item.query,
        contentType: contentType.success ? contentType.data : original?.contentType ?? "listing",
        expectedText: original?.expectedText ?? "",
        retrieval: item.retrievalScore,
        evidenceCoverage: item.contextCoverageScore,
        verdict: item.verdict,
        failure: item.failure,
        retrievedResults: item.results,
        diagnostics: item.diagnostics && {
          ...item.diagnostics,
          results: item.diagnostics.results?.map(() => null),
        },
      };
    }),
  });
};
