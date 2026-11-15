"use client";

import { useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { disconnectPinterest, getPinterestBoards, getPinterestConnection, type PinterestConnectionOutcome } from "@/api/social";
import { PINTEREST_OUTCOME_MESSAGES, usePinterestConnect } from "@/components/social/pinterest-connection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { PANEL_SELECT_CONTENT_CLASS } from "@/constants/workflow-panel";
import { getErrorMessage } from "@/helpers/error-message";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Radix Select rejects an empty item value, so "post by hand" travels as this marker.
const BY_HAND = "__by_hand__";

const str = (value: unknown) => (typeof value === "string" && value ? value : null);

/**
 * Push to media, Pinterest: the connected account and the board the image pins are posted to when the step runs.
 * Without a board the pins are only prepared, to post by hand from the run.
 */
export function SocialPublishSettings({ node, disabled }: { node: WorkflowNode; disabled: boolean }) {
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const queryClient = useQueryClient();
  const config = node.data.config;
  const pinterestOn = config.pinterest !== false;
  const boardId = str(config.boardId);
  const boardName = str(config.boardName);

  const patch = (next: WorkflowNodeConfig) => {
    // Read the latest config so two quick changes do not overwrite each other.
    const current = useWorkflowStore.getState().nodes.find((item) => item.id === node.id)?.data.config ?? config;
    updateNodeConfig(node.id, { ...current, ...next });
  };

  const connection = useQuery({ queryKey: ["pinterest-connection"], queryFn: getPinterestConnection, enabled: pinterestOn, staleTime: 60_000 });
  const connected = connection.data?.status === "connected";
  const boards = useQuery({ queryKey: ["pinterest-boards"], queryFn: getPinterestBoards, enabled: pinterestOn && connected, staleTime: 60_000, retry: false });

  const onOutcome = useCallback((outcome: PinterestConnectionOutcome) => {
    const message = PINTEREST_OUTCOME_MESSAGES[outcome];
    if (message.failed) toast.error(message.text);
    else toast.success(message.text);
    void queryClient.invalidateQueries({ queryKey: ["pinterest-connection"] });
    void queryClient.invalidateQueries({ queryKey: ["pinterest-boards"] });
  }, [queryClient]);
  const pinterestConnect = usePinterestConnect(onOutcome);
  const connecting = pinterestConnect.starting || pinterestConnect.waiting;
  const connect = () => {
    pinterestConnect.connect().catch((error: unknown) => toast.error(getErrorMessage(error, "Could not start the Pinterest connection. Try again.")));
  };

  const disconnect = useMutation({
    mutationFn: disconnectPinterest,
    onSuccess: () => {
      patch({ boardId: null, boardName: null });
      void queryClient.invalidateQueries({ queryKey: ["pinterest-connection"] });
      queryClient.removeQueries({ queryKey: ["pinterest-boards"] });
    },
    onError: () => toast.error("Could not disconnect Pinterest. Try again."),
  });

  if (!pinterestOn) return null;

  const boardOptions = boards.data ?? [];
  // A board chosen earlier that the account no longer lists still shows, so the choice is not silently lost.
  const missingBoard = boardId && boards.data && !boardOptions.some((board) => board.id === boardId);

  return (
    <PanelSection
      title="Pinterest"
      description="Choose a board and the step posts one pin per approved mock-up to it, linked to the Etsy listing. The video pin and TikTok stay ready to post by hand."
    >
      {connection.isLoading && <p className="text-muted-foreground flex items-center gap-2 text-xs"><Loader2 className="size-3.5 animate-spin" />Checking Pinterest…</p>}
      {connection.isError && <PanelNotice tone="error">Could not read the Pinterest connection. Reload the page to try again.</PanelNotice>}
      {connection.data && !connection.data.configured && (
        <PanelNotice tone="warning">Pinterest is not set up on this server yet, so the pins are only prepared to post by hand.</PanelNotice>
      )}
      {connection.data?.configured && !connected && (
        <PanelNotice
          tone={connection.data.status === "reconnect_required" ? "warning" : "info"}
          action={<Button type="button" size="sm" variant="outline" disabled={disabled || connecting} onClick={connect}>
            {connecting && <Loader2 className="size-3.5 animate-spin" />}{connection.data.status === "reconnect_required" ? "Connect again" : "Connect Pinterest"}
          </Button>}
        >
          {connection.data.status === "reconnect_required"
            ? "Pinterest no longer accepts this connection. Connect again to keep posting pins."
            : "Connect your Pinterest account to post the pins automatically. Without it they are ready to post by hand."}
        </PanelNotice>
      )}
      {connected && (
        <fieldset disabled={disabled} className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-ink-600">Connected as <span className="text-ink-900 font-medium">@{connection.data?.username}</span></span>
            <button type="button" className="text-blue-600 hover:underline disabled:opacity-50" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
              Disconnect
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${node.id}-board`}>Board</Label>
              <button type="button" className="text-ink-500 hover:text-ink-800 inline-flex items-center gap-1 text-xs" onClick={() => void boards.refetch()} disabled={boards.isFetching}>
                <RefreshCw className={cn("size-3", boards.isFetching && "animate-spin")} />Refresh
              </button>
            </div>
            <Select
              value={boardId ?? BY_HAND}
              disabled={disabled || boards.isLoading}
              onValueChange={(next) => {
                if (next === BY_HAND) patch({ boardId: null, boardName: null });
                else patch({ boardId: next, boardName: boardOptions.find((board) => board.id === next)?.name ?? null });
              }}
            >
              <SelectTrigger id={`${node.id}-board`} className="bg-card w-full min-w-0">
                <SelectValue placeholder={boards.isLoading ? "Loading boards…" : "Choose a board"} />
              </SelectTrigger>
              <SelectContent position="popper" className={cn(PANEL_SELECT_CONTENT_CLASS, "w-(--radix-select-trigger-width)")}>
                <SelectItem value={BY_HAND}>Don&apos;t post, prepare only</SelectItem>
                {missingBoard && <SelectItem value={boardId}>{boardName ?? boardId} (not found)</SelectItem>}
                {boardOptions.map((board) => (
                  <SelectItem key={board.id} value={board.id}>{board.name}{board.privacy === "SECRET" ? " · secret" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {boards.isError && <p className="text-xs text-rose-700 dark:text-rose-300">{getErrorMessage(boards.error, "Could not read your Pinterest boards.")}</p>}
            {boards.data && boardOptions.length === 0 && <p className="text-muted-foreground text-xs">This account has no board yet: create one on Pinterest, then refresh.</p>}
            {missingBoard && <p className="text-xs text-amber-800 dark:text-amber-300">This board is no longer on the account; choose another.</p>}
          </div>
        </fieldset>
      )}
    </PanelSection>
  );
}
