import axios from "axios";

import { streamAssistantMessage } from "@/api/assistant";
import { ASSISTANT_REATTACH_DELAYS_MS, ASSISTANT_STREAM_INTERRUPTED_ERROR } from "@/constants/assistant";
import { flushQueuedClientActionStates } from "@/helpers/assistant-client-action-queue";
import { getErrorMessage } from "@/helpers/error-message";
import { isNotFoundResponse } from "@/helpers/response-status";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantStreamEntry } from "@/types/assistant";

export type AssistantStreamOpener = (onEvent: (event: AssistantStreamEntry) => void, signal: AbortSignal) => Promise<void>;

export type AssistantStreamOutcome = { status: "settled" } | { status: "gone"; conversationId: string | null };

type AttemptResult =
  | { kind: "finished" }
  | { kind: "aborted" }
  | { kind: "dropped" }
  | { kind: "not_found"; error: unknown }
  | { kind: "failed"; error: unknown };

type PipeAssistantStreamInput = {
  exchangeId: string;
  signal: AbortSignal;
  open: AssistantStreamOpener;
  isResume: boolean;
  replaysFromStart: boolean;
};

const isExchangeStreaming = (exchangeId: string) => useAssistantStore.getState().streamingMessageId === exchangeId;

const runAttempt = async (
  exchangeId: string,
  signal: AbortSignal,
  open: AssistantStreamOpener,
  replaysFromStart: boolean
): Promise<AttemptResult> => {
  const { applyStreamEvent, clearStreamingReply } = useAssistantStore.getState();
  let isReplayStarted = !replaysFromStart;
  const applyEvent = (event: AssistantStreamEntry) => {
    if (!isReplayStarted) {
      clearStreamingReply(exchangeId);
      isReplayStarted = true;
    }
    applyStreamEvent(exchangeId, event);
  };
  try {
    await open(applyEvent, signal);
  } catch (error) {
    if (axios.isCancel(error) || signal.aborted) return { kind: "aborted" };
    if (isNotFoundResponse(error)) return { kind: "not_found", error };
    return { kind: "failed", error };
  }
  return isExchangeStreaming(exchangeId) ? { kind: "dropped" } : { kind: "finished" };
};

const knownAssistantMessageId = (exchangeId: string) => {
  const { streamingMessageId, activeStream } = useAssistantStore.getState();
  return streamingMessageId === exchangeId ? (activeStream?.assistantMessageId ?? null) : null;
};

const isRecoverable = (result: AttemptResult, isResume: boolean, exchangeId: string) => {
  if (result.kind === "dropped") return knownAssistantMessageId(exchangeId) !== null;
  if (result.kind === "failed") return isResume || knownAssistantMessageId(exchangeId) !== null;
  return false;
};

const waitBeforeReattach = (delayMs: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, delayMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

const reattach = (exchangeId: string, signal: AbortSignal, assistantMessageId: string) => {
  const lastEventId = useAssistantStore.getState().activeStream?.lastEventId ?? null;
  return runAttempt(
    exchangeId,
    signal,
    (onEvent, attemptSignal) => streamAssistantMessage(assistantMessageId, lastEventId, onEvent, attemptSignal),
    lastEventId === null
  );
};

const settle = (exchangeId: string, result: AttemptResult, isResume: boolean): AssistantStreamOutcome => {
  const { stopStreaming, failStreaming, abandonStream, conversationId } = useAssistantStore.getState();
  switch (result.kind) {
    case "finished":
      return { status: "settled" };
    case "aborted":
      stopStreaming(exchangeId);
      return { status: "settled" };
    case "dropped":
      if (knownAssistantMessageId(exchangeId) === null) {
        failStreaming(exchangeId, ASSISTANT_STREAM_INTERRUPTED_ERROR);
        return { status: "settled" };
      }
      abandonStream(exchangeId, ASSISTANT_STREAM_INTERRUPTED_ERROR);
      return { status: "gone", conversationId };
    case "not_found":
      if (isResume) {
        abandonStream(exchangeId, null);
        return { status: "gone", conversationId };
      }
      failStreaming(exchangeId, { code: "request_failed", message: getErrorMessage(result.error) });
      return { status: "settled" };
    case "failed":
      failStreaming(exchangeId, { code: "request_failed", message: getErrorMessage(result.error) });
      return { status: "settled" };
  }
};

export const pipeAssistantStream = async ({
  exchangeId,
  signal,
  open,
  isResume,
  replaysFromStart,
}: PipeAssistantStreamInput): Promise<AssistantStreamOutcome> => {
  let result = await runAttempt(exchangeId, signal, open, replaysFromStart);
  let isResumeAttempt = isResume;
  for (const delayMs of ASSISTANT_REATTACH_DELAYS_MS) {
    const assistantMessageId = knownAssistantMessageId(exchangeId);
    if (!isRecoverable(result, isResumeAttempt, exchangeId) || assistantMessageId === null) break;
    await waitBeforeReattach(delayMs, signal);
    if (signal.aborted) {
      result = { kind: "aborted" };
      break;
    }
    isResumeAttempt = true;
    result = await reattach(exchangeId, signal, assistantMessageId);
  }
  const isExhausted = isRecoverable(result, isResumeAttempt, exchangeId);
  const outcome = settle(exchangeId, isExhausted ? { kind: "dropped" } : result, isResumeAttempt);
  flushQueuedClientActionStates();
  return outcome;
};
