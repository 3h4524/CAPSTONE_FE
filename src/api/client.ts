import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/stores/auth";

const UNAUTHORIZED_STATUS = 401;
// Both tokens live only in HttpOnly cookies the backend sets on login/refresh (never in the
// response body, never in a header client JS can read), so the browser attaches and renews
// them automatically via withCredentials — this client never touches a token directly.
const REFRESH_ENDPOINT = "/api/auth/refresh";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  // Required so the browser attaches/accepts the HttpOnly token cookies cross-origin.
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

const requestNewAccessToken = async (): Promise<void> => {
  // Uses the bare axios client (not `api`) so a failed refresh never re-enters `api`'s own
  // 401-retry interceptor below and deadlocks waiting on itself. The response carries no
  // token (it arrives as a Set-Cookie header instead) — success alone means the cookie renewed.
  await axios.post(REFRESH_ENDPOINT, undefined, {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    withCredentials: true,
  });
};

// Exported so the app-mount silent refresh (see AuthProvider) can reuse the same in-flight
// dedup as the 401-retry path below, instead of racing it with a second /refresh call.
export const refreshAccessTokenOnce = (): Promise<void> => {
  refreshPromise ??= requestNewAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status !== UNAUTHORIZED_STATUS ||
      !originalConfig ||
      originalConfig._retried
    ) {
      return Promise.reject(error);
    }

    originalConfig._retried = true;

    try {
      await refreshAccessTokenOnce();
      // The renewed access-token cookie is attached by the browser automatically.
      return api(originalConfig);
    } catch {
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }
  }
);
