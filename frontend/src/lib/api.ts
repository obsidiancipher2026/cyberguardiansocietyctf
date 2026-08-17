import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuth } from "@/store/auth";
import { API_BASE_URL } from "./apiUrl";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Send the httpOnly refresh cookie so expired access tokens can be rotated.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function refreshUserSession(): Promise<boolean> {
  try {
    // Raw axios (not the interceptor-wrapped instance) to avoid recursion.
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 15000 }
    );
    const { accessToken, user } = res.data ?? {};
    if (accessToken) {
      localStorage.setItem("token", accessToken);
      if (user) localStorage.setItem("cgs_user", JSON.stringify(user));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("cgs_user");
}

/**
 * Session died (refresh failed or an authenticated request came back 401
 * with no usable token): clear storage, flip the auth store so every
 * consumer (navbar, footer) updates instantly, and notify subscribers
 * (ProtectedRoute) so they redirect to the login screen.
 */
function expireSession() {
  clearSession();
  useAuth.getState().setLoggedIn(false);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cgs:session-expired"));
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const url = original?.url ?? "";
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/refresh") &&
      typeof window !== "undefined"
    ) {
      original._retried = true;
      // No stored token means a genuinely anonymous 401 — do not attempt refresh.
      if (!localStorage.getItem("token")) {
        expireSession();
        return Promise.reject(error);
      }
      if (!refreshing) {
        refreshing = refreshUserSession().finally(() => {
          refreshing = null;
        });
      }
      const ok = await refreshing;
      if (ok) {
        original.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
        return api(original);
      }
      expireSession();
    }
    return Promise.reject(error);
  }
);
