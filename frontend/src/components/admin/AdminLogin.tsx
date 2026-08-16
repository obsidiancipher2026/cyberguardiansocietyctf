"use client";

import React, { useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Shield } from "lucide-react";
import { adminErrorMessage } from "@/lib/adminApi";
import { useAdminAuth } from "@/store/adminAuth";
import AuthShell from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";

/* ──────────────────────────────────────────────
   AdminLogin
   The administrator sign-in. Uses the exact same
   design, layout, colouring and theme as the
   standard operator login (AuthShell + AuthField),
   but authenticates against the secured
   /admin/auth/login endpoint. Accepts the admin's
   username OR email, and commits the session via
   the auth store so the vault swaps in immediately.
   ────────────────────────────────────────────── */

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const identifierError =
    fieldErrors.identifier ??
    (identifierTouched && identifier.length === 0 ? "Username or email is required" : null);
  const passwordError =
    fieldErrors.password ?? (passwordTouched && password.length === 0 ? "Passphrase is required" : null);
  const identifierValid = identifier.length > 0;
  const passwordValid = password.length > 0;
  const canSubmit = !loading && identifierValid && passwordValid;

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    setIdentifierTouched(true);
    setFieldErrors((f) => ({ ...f, identifier: undefined }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordTouched(true);
    setFieldErrors((f) => ({ ...f, password: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIdentifierTouched(true);
    setPasswordTouched(true);

    const iErr = identifier.length === 0 ? "Username or email is required" : null;
    const pErr = password.length === 0 ? "Passphrase is required" : null;
    if (iErr || pErr) {
      setFieldErrors({ identifier: iErr ?? undefined, password: pErr ?? undefined });
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      // generic, enumeration-safe message
      setServerError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell variant="login" align="up" showcase="minimal">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-violet/10 to-secondary/15 mb-2 shadow-[0_0_18px_rgba(255,23,68,0.12)]">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="font-display font-black text-2xl text-white">
          ADMIN <span className="text-gradient-cgs">COMMAND CENTER</span>
        </h1>
        <p className="font-body text-xs text-muted">
          Restricted access — authorized administrators only.
        </p>
        <div
          aria-hidden
          className="mx-auto w-16 h-[2px] rounded-full bg-gradient-to-r from-primary via-violet to-secondary mt-3"
        />
      </div>

      {serverError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="font-body text-xs text-danger font-medium">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-body text-xs">
        <AuthField
          id="admin-identifier"
          label="Username or Email"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={handleIdentifierChange}
          placeholder="Master · operator@cyberguardiansociety.org"
          disabled={loading}
          accent="secondary"
          error={identifierError}
          valid={identifierValid}
        />

        <AuthField
          id="admin-password"
          label="Passphrase"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="••••••••••••"
          disabled={loading}
          accent="secondary"
          error={passwordError}
          valid={passwordValid}
          showToggle
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary via-violet to-secondary text-white font-body text-xs font-bold shadow-glow-red hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AUTHENTICATING…</span>
            </>
          ) : (
            <>
              <span>AUTHENTICATE SESSION</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2 font-body text-xs text-secondary/80">
        Authorized personnel only · all access events are audited
      </div>
    </AuthShell>
  );
}