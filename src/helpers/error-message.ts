export const DEFAULT_ERROR_MESSAGE = "Something went wrong";

type ErrorWithResponse = {
  response?: {
    data?: {
      code?: unknown;
      message?: unknown;
      error?: unknown;
      // ASP.NET Core ProblemDetails shape (RFC 7807) used by the backend for every error response.
      detail?: unknown;
      title?: unknown;
    };
  };
};

const ERROR_MESSAGES: Record<string, string> = {
  "auth.admin_2fa_invalid": "Mã OTP không đúng. Vui lòng kiểm tra email và thử lại.",
  "auth.admin_2fa_expired": "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.",
};

const extractRawMessage = (error: unknown): string | undefined => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const withResponse = error as ErrorWithResponse;
    const errorCode = withResponse.response?.data?.code;
    if (typeof errorCode === "string" && ERROR_MESSAGES[errorCode]) {
      return ERROR_MESSAGES[errorCode];
    }

    const payloadMessage =
      withResponse.response?.data?.detail ??
      withResponse.response?.data?.message ??
      withResponse.response?.data?.error ??
      withResponse.response?.data?.title;
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

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return undefined;
};

export const getErrorMessage = (
  error: unknown,
  fallback: string = DEFAULT_ERROR_MESSAGE
): string => {
  return extractRawMessage(error) ?? fallback;
};
