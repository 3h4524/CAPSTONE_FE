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
