"use client";

import { create } from "zustand";
import { adminApi } from "@/lib/adminApi";
import { clearAdminToken, getAdminToken, setAdminToken } from "@/lib/adminConfig";

export interface AdminUserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  lastLoginAt?: string | null;
}

type AuthStatus = "unknown" | "unauthenticated" | "authenticated";

interface AdminAuthState {
  status: AuthStatus;
  admin: AdminUserInfo | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAdmin: (admin: AdminUserInfo) => void;
}

function extractAdmin(data: { admin?: AdminUserInfo }): AdminUserInfo {
  return data.admin!;
}

// Single-flight bootstrap: multiple mounts (React StrictMode, panel reloads,
// login handoff) share one /me request instead of hammering the API.
let bootstrapping: Promise<void> | null = null;

export const useAdminAuth = create<AdminAuthState>((set) => ({
  status: "unknown",
  admin: null,

  bootstrap: async () => {
    if (!getAdminToken()) {
      set({ status: "unauthenticated", admin: null });
      return;
    }
    if (!bootstrapping) {
      bootstrapping = (async () => {
        try {
          const res = await adminApi.get<{ admin: AdminUserInfo }>("/admin/auth/me");
          set({ status: "authenticated", admin: extractAdmin(res.data) });
        } catch {
          clearAdminToken();
          set({ status: "unauthenticated", admin: null });
        }
      })().finally(() => {
        bootstrapping = null;
      });
    }
    return bootstrapping;
  },

  login: async (identifier, password) => {
    const res = await adminApi.post<{ accessToken: string; admin: AdminUserInfo }>(
      "/admin/auth/login",
      { identifier, password }
    );
    if (res.data.accessToken) setAdminToken(res.data.accessToken);
    // The access token was issued by the server microseconds ago — commit the
    // session immediately so the vault renders without a second /me round-trip.
    set({ status: "authenticated", admin: res.data.admin ?? null });
  },

  logout: async () => {
    try {
      await adminApi.post("/admin/auth/logout");
    } catch {
      // session may already be dead — clear locally regardless
    }
    clearAdminToken();
    set({ status: "unauthenticated", admin: null });
  },

  setAdmin: (admin) => set({ status: "authenticated", admin }),
}));
