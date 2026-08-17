import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { ADMIN_SLUG, clearAdminToken, getAdminToken, setAdminToken } from "./adminConfig";
import { API_BASE_URL } from "./apiUrl";

/**
 * Admin vault API client. Every request carries the secret vault header
 * (required by the backend requireVault gate) plus the admin bearer token.
 * On 401 it attempts a single-flight refresh via the httpOnly admin cookie.
 */
export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-cgs-vault": ADMIN_SLUG,
  },
  withCredentials: true,
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAdminSession(): Promise<string | null> {
  try {
    // Raw axios (not the interceptor-wrapped instance) so a 401 on the
    // refresh itself can never recurse back into this handler — otherwise
    // the interceptor awaits the very promise it is running inside and the
    // whole session check hangs forever on "Verifying session".
    const res = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/admin/auth/refresh`,
      {},
      {
        withCredentials: true,
        timeout: 15000,
        headers: { "x-cgs-vault": ADMIN_SLUG },
      }
    );
    setAdminToken(res.data.accessToken);
    return res.data.accessToken;
  } catch {
    clearAdminToken();
    return null;
  }
}

adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes("/admin/auth/login") &&
      !original.url?.includes("/admin/auth/refresh")
    ) {
      original._retried = true;
      if (!refreshing) {
        refreshing = refreshAdminSession().finally(() => {
          refreshing = null;
        });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return adminApi(original);
      }
    }
    return Promise.reject(error);
  }
);

export function adminErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? error.message ?? "Request failed";
  }
  return error instanceof Error ? error.message : "Request failed";
}
