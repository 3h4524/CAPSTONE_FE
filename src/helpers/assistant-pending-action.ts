import { ASSISTANT_ACTION_EXPIRED_ERROR_CODE } from "@/constants/assistant";
import { getResponseStatus } from "@/helpers/response-status";
import type { AssistantPendingActionStatus } from "@/types/assistant";

const CONFLICT_STATUS = 409;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

type ErrorWithCode = { response?: { data?: { code?: unknown } } };

const getErrorCode = (error: unknown): unknown =>
  typeof error === "object" && error !== null ? (error as ErrorWithCode).response?.data?.code : undefined;

export const getConflictedActionStatus = (error: unknown): Extract<AssistantPendingActionStatus, "expired" | "failed"> | null => {
  if (getResponseStatus(error) !== CONFLICT_STATUS) return null;
  return getErrorCode(error) === ASSISTANT_ACTION_EXPIRED_ERROR_CODE ? "expired" : "failed";
};

export const formatActionTimeLeft = (remainingMs: number) => {
  const totalSeconds = Math.ceil(remainingMs / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(2, "0")} left`;
};
