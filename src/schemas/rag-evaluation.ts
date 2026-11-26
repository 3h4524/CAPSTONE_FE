import { z } from "zod";

export const ragEvaluationContentTypeSchema = z.enum(["listing", "image", "video", "policy", "keyword"]);

const draftCaseSchema = z.object({
  question: z.string(),
  contentType: ragEvaluationContentTypeSchema,
  expectedText: z.string(),
});

const datasetCaseSchema = draftCaseSchema.extend({ id: z.string().min(1) });

const retrievedChunkSchema = z.object({
  result: z.object({
    chunkId: z.string(),
    title: z.string(),
    contentType: z.string(),
    content: z.string(),
    sourceId: z.string().nullish(),
  }),
  semanticScore: z.number(),
  lexicalScore: z.number(),
  viralScore: z.number(),
  freshnessScore: z.number(),
  finalScore: z.number(),
});

const retrievalInsightSchema = z.object({
  results: z.array(z.unknown()).optional(),
  vectorCandidateCount: z.number(),
  lexicalCandidateCount: z.number(),
  candidatesBeforeMetadataFilter: z.number().optional(),
  metadataMatchedCandidateCount: z.number().optional(),
  metadataFilteredCandidateCount: z.number().optional(),
  thresholdRejectedCandidateCount: z.number().optional(),
  status: z.string().optional(),
  confidence: z.string().optional(),
  appliedFilters: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  bestSemanticScore: z.number().optional(),
  bestLexicalScore: z.number().optional(),
  bestFinalScore: z.number().optional(),
});

const evaluationCaseSchema = datasetCaseSchema.extend({
  verdict: z.enum(["pass", "review", "fail"]),
  retrieval: z.number(),
  evidenceCoverage: z.number(),
  failure: z.string().nullish(),
  retrievedResults: z.array(retrievedChunkSchema),
  diagnostics: retrievalInsightSchema.optional(),
});

export const ragEvaluationRunSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  createdAt: z.string(),
  cases: z.number(),
  retrieval: z.number(),
  evidenceCoverage: z.number(),
  latency: z.number(),
  casesData: z.array(evaluationCaseSchema),
  typeMetrics: z.array(z.object({
    contentType: z.string(),
    caseCount: z.number(),
    retrievalScore: z.number(),
    contextCoverageScore: z.number(),
    averageLatencyMs: z.number(),
  })),
});

export const ragEvaluationWorkspaceSchema = z.object({
  draft: draftCaseSchema,
  datasetCases: z.array(datasetCaseSchema),
  runs: z.array(ragEvaluationRunSchema),
});

export type EvaluationContentType = z.infer<typeof ragEvaluationContentTypeSchema>;
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type EvaluationRun = z.infer<typeof ragEvaluationRunSchema>;
export type RetrievedChunk = z.infer<typeof retrievedChunkSchema>;
export type RetrievalInsightData = z.infer<typeof retrievalInsightSchema>;
export type RagEvaluationWorkspace = z.infer<typeof ragEvaluationWorkspaceSchema>;
