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
};

export type RagIngestResponse = {
  documentId: string;
};

export const ingestRagDocument = async (payload: RagIngestRequest) => {
  const { data } = await api.post<RagIngestResponse>("/api/rag/ingest", payload);
  return data;
};
