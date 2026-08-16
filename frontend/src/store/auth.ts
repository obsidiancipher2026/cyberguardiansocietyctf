"use client";

import { create } from "zustand";

interface AuthState {
  isLoggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  bootstrap: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  isLoggedIn: false,

  setLoggedIn: (v) => set({ isLoggedIn: v }),

  bootstrap: () => {
    if (typeof window === "undefined") return;
    set({ isLoggedIn: !!localStorage.getItem("token") });
  },
}));
