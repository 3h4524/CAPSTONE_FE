import { api } from "@/api/client";

export type RagIngestRequest = {
  title: string;
  sourceType: string;
  sourceUrl?: string;
  version?: string;
  language: string;
  content: string;
  metadata?: Record<string, unknown>;
  contentType: "listing" | "image" | "video" | "policy" | "keyword";
  sourceId?: string;
};

export type RagIngestResponse = {
  documentId: string;
};

export const ingestRagDocument = async (payload: RagIngestRequest) => {
  const { data } = await api.post<RagIngestResponse>("/api/rag/ingest", payload);
  return data;
};

export type RagDocumentStatus = "queued" | "processing" | "ready" | "superseded" | "failed";

export type RagAdminDocument = {
  id: string;
  sourceId: string;
  title: string;
  sourceType: string;
  contentType: string;
  sourceUrl: string | null;
  version: string | null;
  language: string;
  status: RagDocumentStatus;
  ingestionError: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RagAdminChunk = {
  id: string;
  chunkIndex: number;
  tokenCount: number;
  content: string;
  metadata: Record<string, unknown>;
};

export type RagAdminDocumentDetail = {
  document: RagAdminDocument;
  chunks: RagAdminChunk[];
};

export type RagSearchRequest = {
  query: string;
  topK?: number;
  sourceType?: string;
  language?: string;
  contentType?: string;
  platform?: string;
  niche?: string;
  minimumViralScore?: number;
};

export type RagSearchResult = {
  chunkId: string;
  documentId: string;
  title: string;
  contentType: string;
  content: string;
  sourceUrl: string | null;
  similarity: number;
  metadata: Record<string, unknown>;
  version: string | null;
  status: string;
  sourceId: string | null;
};

export type RagSearchDiagnosticResult = {
  result: RagSearchResult;
  semanticScore: number;
  lexicalScore: number;
  viralScore: number;
  freshnessScore: number;
  finalScore: number;
};

export type RagSearchDiagnostics = {
  query: string;
  requestedTopK: number;
  candidateLimit: number;
  vectorCandidateCount: number;
  lexicalCandidateCount: number;
  metadataMatchedCandidateCount: number;
  rerankedCandidateCount: number;
  durationMs: number;
  results: RagSearchDiagnosticResult[];
  candidatesBeforeMetadataFilter: number;
  metadataFilteredCandidateCount: number;
  thresholdRejectedCandidateCount: number;
  bestSemanticScore: number;
  bestLexicalScore: number;
  bestFinalScore: number;
  status: string;
  confidence: string;
  appliedFilters: string[];
  warnings: string[];
};

export type RagEvaluationCaseRequest = {
  id: string;
  search: RagSearchRequest;
  expectedSourceId?: string;
  expectedDocumentId?: string;
  expectedText?: string;
  category?: string;
  contentType?: "listing" | "image" | "video" | "policy" | "keyword";
};

export type RagEvaluationRequest = {
  cases: RagEvaluationCaseRequest[];
  topK?: number;
};

export type RagEvaluationCaseResult = {
  id: string;
  category: string;
  contentType: string;
  query: string;
  verdict: "pass" | "review" | "fail";
  expectedMatch: boolean;
  retrievalScore: number;
  citationScore: number;
  contextCoverageScore: number;
  latencyMs: number;
  failure: string | null;
  results: RagSearchDiagnosticResult[];
  diagnostics?: RagSearchDiagnostics;
};

export type RagEvaluationTypeMetrics = {
  contentType: string;
  caseCount: number;
  retrievalScore: number;
  citationScore: number;
  contextCoverageScore: number;
  abstentionScore: number;
  averageLatencyMs: number;
};

export type RagEvaluationResponse = {
  runId: string;
  completedAt: string;
  caseCount: number;
  retrievalScore: number;
  citationScore: number;
  contextCoverageScore: number;
  abstentionScore: number;
  averageLatencyMs: number;
  cases: RagEvaluationCaseResult[];
  typeMetrics: RagEvaluationTypeMetrics[];
};

export type RagCorpusHealthTypeMetrics = {
  contentType: string;
  documentCount: number;
  readyDocuments: number;
  queuedDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  supersededDocuments: number;
  chunkCount: number;
  embeddingCount: number;
  currentModelEmbeddings: number;
  missingEmbeddingChunkCount: number;
  missingMetadataDocumentCount: number;
  missingNicheDocumentCount: number;
  missingPlatformDocumentCount: number;
  staleReadyDocumentCount: number;
};

export type RagCorpusHealthIssue = {
  code: string;
  severity: "error" | "warning" | "info";
  count: number;
  description: string;
};

export type RagCorpusHealthResponse = {
  generatedAt: string;
  contentType: string | null;
  staleDays: number;
  totalDocuments: number;
  readyDocuments: number;
  queuedDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  supersededDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  currentModelEmbeddings: number;
  missingEmbeddingChunkCount: number;
  missingMetadataDocumentCount: number;
  missingNicheDocumentCount: number;
  missingPlatformDocumentCount: number;
  duplicateContentHashGroupCount: number;
  staleReadyDocumentCount: number;
  embeddingModels: string[];
  byContentType: RagCorpusHealthTypeMetrics[];
  issues: RagCorpusHealthIssue[];
};

export type RagReingestRequest = {
  documentIds?: string[];
  contentType?: string;
  failedOnly?: boolean;
  staleOnly?: boolean;
  missingEmbeddingOnly?: boolean;
  staleDays?: number;
  maxDocuments?: number;
};

export type RagReingestResponse = {
  selectedCount: number;
  queuedCount: number;
  skippedCount: number;
  documentIds: string[];
};

export type ListingRetrievalEvaluationResponse = {
  productId: string;
  productName: string;
  productType: string;
  niche: string | null;
  targetAudience: string | null;
  description: string;
  keywords: string[];
  notes: string | null;
  productionQuery: string;
  durationMs: number;
  policyContext: RagSearchDiagnostics;
  listingContext: RagSearchDiagnostics;
};

export const searchRagWithDiagnostics = async (payload: RagSearchRequest) => {
  const { data } = await api.post<RagSearchDiagnostics>("/api/rag/admin/search", payload);
  return data;
};

export const evaluateRag = async (payload: RagEvaluationRequest) => {
  const { data } = await api.post<RagEvaluationResponse>("/api/rag/admin/evaluation", payload);
  return data;
};

export const getRagCorpusHealth = async (params: { contentType?: string; staleDays?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.contentType) search.set("contentType", params.contentType);
  if (params.staleDays) search.set("staleDays", String(params.staleDays));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const { data } = await api.get<RagCorpusHealthResponse>(`/api/rag/admin/health${suffix}`);
  return data;
};

export const reingestRagDocuments = async (payload: RagReingestRequest = {}) => {
  const { data } = await api.post<RagReingestResponse>("/api/rag/admin/reingest", payload);
  return data;
};

export const evaluateListingRetrieval = async (productId: string) => {
  const { data } = await api.post<ListingRetrievalEvaluationResponse>(
    "/api/rag/admin/listing-evaluation/retrieval",
    { productId }
  );
  return data;
};

export const ragAdminDocumentsKey = (status?: string, sourceId?: string) =>
  ["admin", "rag", "documents", { status, sourceId }] as const;

export const getAdminRagDocuments = async (params: { status?: string; sourceId?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.sourceId) search.set("sourceId", params.sourceId);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const { data } = await api.get<RagAdminDocument[]>(`/api/rag/admin/documents${suffix}`);
  return data;
};

export const getAdminRagDocument = async (documentId: string) => {
  const { data } = await api.get<RagAdminDocumentDetail>(`/api/rag/admin/documents/${documentId}`);
  return data;
};

export const activateAdminRagDocument = async (documentId: string) => {
  await api.post(`/api/rag/admin/documents/${documentId}/activate`);
};
