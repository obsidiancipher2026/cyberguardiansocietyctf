// Shared admin vault configuration (client-safe values only).
export const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_PANEL_SLUG || "cgs-ctrl-a7f8e2d1b9c4k6m3";

export const ADMIN_TOKEN_KEY = "cgs_admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}
