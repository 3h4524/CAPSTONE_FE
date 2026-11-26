"use client";

import { useEffect, useState } from "react";

import { Log } from "@/helpers/log";
import { type RagEvaluationWorkspace, ragEvaluationWorkspaceSchema } from "@/schemas/rag-evaluation";

export const EMPTY_EVALUATION_DRAFT: RagEvaluationWorkspace["draft"] = {
  question: "",
  contentType: "listing",
  expectedText: "",
};

const EMPTY_WORKSPACE: RagEvaluationWorkspace = {
  draft: EMPTY_EVALUATION_DRAFT,
  datasetCases: [],
  runs: [],
};

export const RAG_EVALUATION_HISTORY_LIMIT = 10;

export const useRagEvaluationWorkspace = (userId: string) => {
  const storageKey = `apcs-rag-evaluation:v1:${userId}`;
  const [workspace, setWorkspace] = useState<RagEvaluationWorkspace | null>(null);
  const [hasStorageError, setHasStorageError] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setWorkspace(EMPTY_WORKSPACE);
        return;
      }
      const parsed = ragEvaluationWorkspaceSchema.safeParse(JSON.parse(stored));
      if (!parsed.success) {
        Log.warn({ prefix: "rag-evaluation", message: "The saved benchmark workspace was invalid." });
      }
      setWorkspace(parsed.success ? parsed.data : EMPTY_WORKSPACE);
    } catch {
      Log.warn({ prefix: "rag-evaluation", message: "Could not read the saved benchmark workspace." });
      setWorkspace(EMPTY_WORKSPACE);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!workspace) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(workspace));
      setHasStorageError(false);
    } catch {
      Log.warn({ prefix: "rag-evaluation", message: "Could not save the benchmark workspace." });
      setHasStorageError(true);
    }
  }, [storageKey, workspace]);

  return {
    workspace: workspace ?? EMPTY_WORKSPACE,
    isWorkspaceReady: workspace !== null,
    hasStorageError,
    updateWorkspace: (update: (current: RagEvaluationWorkspace) => RagEvaluationWorkspace) =>
      setWorkspace((current) => current ? update(current) : current),
  };
};
