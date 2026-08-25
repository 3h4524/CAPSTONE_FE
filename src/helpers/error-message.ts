export const DEFAULT_ERROR_MESSAGE = "Something went wrong";

type ErrorWithResponse = {
  response?: {
    data?: {
      message?: unknown;
      error?: unknown;
    };
  };
};

const extractRawMessage = (error: unknown): string | undefined => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const withResponse = error as ErrorWithResponse;
    const payloadMessage = withResponse.response?.data?.message ?? withResponse.response?.data?.error;
    if (typeof payloadMessage === "string" && payloadMessage.trim()) {
      return payloadMessage;
    }

    if ("message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
  }

  return undefined;
};

export const getErrorMessage = (error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string => {
  return extractRawMessage(error) ?? fallback;
};
