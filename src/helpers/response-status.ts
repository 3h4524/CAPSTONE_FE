const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

type ErrorWithStatus = {
  response?: {
    status?: unknown;
  };
};

export const getResponseStatus = (error: unknown): number | undefined => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as ErrorWithStatus).response;
    return typeof response?.status === "number" ? response.status : undefined;
  }
  return undefined;
};

export const isNotFoundResponse = (error: unknown) => getResponseStatus(error) === NOT_FOUND_STATUS;

export const isConflictResponse = (error: unknown) => getResponseStatus(error) === CONFLICT_STATUS;
