import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const AUTH_HEADER = "Authorization";
const BEARER_PREFIX = "Bearer ";
const UNAUTHORIZED_STATUS = 401;
const REFRESH_ENDPOINT = "/auth/refresh";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

type RefreshResponse = {
  accessToken: string;
};

export const tokenStorage = {
  getAccessToken: (): string | null =>
    typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY),

  getRefreshToken: (): string | null =>
    typeof window === "undefined" ? null : window.localStorage.getItem(REFRESH_TOKEN_KEY),

  setTokens: (accessToken: string, refreshToken: string): void => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: (): void => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
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
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await axios.post<RefreshResponse>(REFRESH_ENDPOINT, { refreshToken });
  const accessToken = response.data.accessToken;

  tokenStorage.setTokens(accessToken, refreshToken);
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
