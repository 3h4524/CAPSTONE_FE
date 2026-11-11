"use client";

import { useEffect, useRef, useState } from "react";

import { importGeneratedMockups } from "@/api/generated-mockups";
import { runGroupKeys } from "@/api/run-groups";
import { videoWorkflowKeys } from "@/api/video-workflow";
import { showWorkflowActionToast } from "@/helpers/toast";
import { useAppQueryClient } from "@/hooks/use-query-client";

/** One import stores at most this many mock-ups (the server's limit), so a full answer means more may be waiting. */
const IMPORT_PAGE = 24;
/** A bound on the follow-up imports for one product, in case the server keeps answering with a full page. */
const MAXIMUM_PAGES = 5;

const importAll = async (productId: string) => {
  let imported = 0;
  let failed = 0;
  let mockups = null;
  for (let page = 0; page < MAXIMUM_PAGES; page++) {
    const result = await importGeneratedMockups(productId);
    imported += result.importedCount;
    failed += result.failedCount;
    mockups = result.mockups;
    if (result.importedCount < IMPORT_PAGE) break;
  }
  return { imported, failed, mockups };
};

/**
 * Brings the mock-ups that Apply mock-up made after the run group started (a template edited, then "Apply &
 * regenerate") in as video sources when Mockup Approval opens. Without it the panel kept showing the older ones: a
 * composite is only reviewable once it is stored. The server lists a newer composite instead of the one it replaces,
 * so the group is read again whenever anything was added.
 *
 * Runs once per group and set of products; the import is idempotent, so a repeated mount costs one quiet request.
 */
export const useSyncGeneratedMockups = (groupId: string, productIds: string[]) => {
  const client = useAppQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const key = [...new Set(productIds)].sort().join(",");
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!key || synced.current === `${groupId}|${key}`) return;
    synced.current = `${groupId}|${key}`;
    setIsSyncing(true);
    void Promise.allSettled(
      key.split(",").map(async (productId) => {
        const result = await importAll(productId);
        if (result.mockups) client.setQueryData(videoWorkflowKeys.assets(productId), result.mockups);
        return result;
      })
    )
      .then((results) => {
        const done = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
        if (done.some((result) => result.imported > 0))
          void client.invalidateQueries({ queryKey: runGroupKeys.detail(groupId) });
        const failed = done.reduce((sum, result) => sum + result.failed, 0) + (results.length - done.length);
        if (failed > 0)
          showWorkflowActionToast(
            "warning",
            `${failed} new mock-up${failed === 1 ? "" : "s"} could not be added for review. Open Mockup Approval again to retry.`
          );
      })
      .finally(() => setIsSyncing(false));
  }, [client, groupId, key]);

  return isSyncing;
};
