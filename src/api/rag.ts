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

export type RagDocumentStatus = "processing" | "ready" | "superseded" | "failed";

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
