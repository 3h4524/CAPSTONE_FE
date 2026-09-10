import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const ACCESS_TOKEN_KEY = "access_token";
const AUTH_HEADER = "Authorization";
const BEARER_PREFIX = "Bearer ";
const UNAUTHORIZED_STATUS = 401;
// The refresh token itself lives only in the HttpOnly cookie the backend sets on login/refresh
// (never in the response body), so the browser sends it automatically via withCredentials.
const REFRESH_ENDPOINT = "/api/auth/refresh";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

type RefreshResponse = {
  accessToken: string;
};

export const tokenStorage = {
  getAccessToken: (): string | null =>
    typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY),

  setAccessToken: (accessToken: string): void => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  clearTokens: (): void => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  // Required so the browser attaches/accepts the HttpOnly refresh-token cookie cross-origin.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) {
    config.headers.set(AUTH_HEADER, `${BEARER_PREFIX}${accessToken}`);
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

const requestNewAccessToken = async (): Promise<string> => {
  // Uses the bare axios client (not `api`) so a failed refresh never re-enters `api`'s own
  // 401-retry interceptor below and deadlocks waiting on itself.
  const response = await axios.post<RefreshResponse>(REFRESH_ENDPOINT, undefined, {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    withCredentials: true,
  });
  const accessToken = response.data.accessToken;

  tokenStorage.setAccessToken(accessToken);
  return accessToken;
};

const refreshAccessTokenOnce = (): Promise<string> => {
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
      const accessToken = await refreshAccessTokenOnce();
      originalConfig.headers.set(AUTH_HEADER, `${BEARER_PREFIX}${accessToken}`);
      return api(originalConfig);
    } catch {
      tokenStorage.clearTokens();
      return Promise.reject(error);
    }
  }
);
