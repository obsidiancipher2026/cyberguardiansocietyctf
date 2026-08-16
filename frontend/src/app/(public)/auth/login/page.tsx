"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { validateEmail } from "@/lib/validation";
import { useAuth } from "@/store/auth";
import AuthShell from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";

export default function LoginPage() {
  const router = useRouter();
  const setLoggedIn = useAuth((s) => s.setLoggedIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const emailError = fieldErrors.email ?? (emailTouched ? validateEmail(email) : null);
  const passwordError =
    fieldErrors.password ?? (passwordTouched && password.length === 0 ? "Passphrase is required" : null);
  const emailValid = email.length > 0 && !validateEmail(email);
  const passwordValid = password.length > 0;
  const canSubmit = !loading && emailValid && passwordValid;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailTouched(true);
    setFieldErrors((f) => ({ ...f, email: undefined }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordTouched(true);
    setFieldErrors((f) => ({ ...f, password: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    const eErr = validateEmail(email);
    const pErr = password.length === 0 ? "Passphrase is required" : null;
    if (eErr || pErr) {
      setFieldErrors({ email: eErr ?? undefined, password: pErr ?? undefined });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        identifier: email.trim(),
        password,
      });

      const { accessToken, user } = res.data;
      if (accessToken) {
        localStorage.setItem("token", accessToken);
        if (user) localStorage.setItem("cgs_user", JSON.stringify(user));
        setLoggedIn(true);
        router.push("/");
        router.refresh();
      } else {
        setServerError("Invalid response from authentication server.");
      }
    } catch (err: any) {
      const data = err?.response?.data?.error;
      const code = data?.code;
      const msg =
        data?.message ?? "Authentication failed. Please check your credentials.";
      if (code === "FORBIDDEN" && /pending|approval/i.test(msg)) {
        setFieldErrors((f) => ({ ...f, email: msg }));
      } else if (code === "FORBIDDEN" && /not verified|verify/i.test(msg)) {
        setFieldErrors((f) => ({ ...f, email: msg }));
      } else {
        setServerError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell variant="login">
      <div className="text-center space-y-2">
        <div className="inline-flex p-2 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
          <img
            src="/cgs-logo.png"
            alt="Cyber Guardian Society"
            draggable={false}
            className="w-8 h-8 object-contain"
          />
        </div>
        <h1 className="font-display font-black text-2xl text-white">OPERATOR AUTHENTICATION</h1>
        <p className="font-body text-xs text-muted">
          Enter credentials to establish encrypted session.
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="font-body text-xs text-danger font-medium">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-body text-xs">
        <AuthField
          id="login-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="operative@cyberguardiansociety.org"
          disabled={loading}
          accent="primary"
          error={emailError}
          valid={emailValid}
        />

        <AuthField
          id="login-password"
          label="Passphrase"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="••••••••••••"
          disabled={loading}
          accent="primary"
          error={passwordError}
          valid={passwordValid}
          showToggle
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-deep text-white font-body text-xs font-bold shadow-glow-red hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <div className="text-center pt-2 font-body text-xs text-muted">
        No Account?{" "}
        <Link href="/auth/register" className="text-primary hover:underline font-semibold">
          Register
        </Link>
      </div>
    </AuthShell>
  );
}
