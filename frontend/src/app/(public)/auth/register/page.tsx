"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import toast from "react-hot-toast";
import {
  sanitizeUsername,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
  validateUniversity,
  validateUsername,
} from "@/lib/validation";
import AuthShell from "@/components/auth/AuthShell";
import { AuthField, AuthSelect } from "@/components/auth/AuthField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

type FieldKey =
  | "fullName"
  | "email"
  | "username"
  | "password"
  | "confirmPassword"
  | "university"
  | "country";

type FieldErrors = Partial<Record<FieldKey, string>>;

const STEP_LABELS = ["IDENTITY", "AFFILIATION", "SECURITY"];
const STEP_DESCRIPTIONS = [
  "Declare your affiliation to complete your dossier.",
  "Secure your access with a strong passphrase.",
];

function mapServerError(err: any): { field?: FieldKey; message: string } | null {
  const data = err?.response?.data?.error;
  if (!data) return null;

  if (data.code === "CONFLICT") {
    return { message: "That username or email is already registered. Try a different one, or sign in instead." };
  }

  if (Array.isArray(data.details)) {
    for (const d of data.details) {
      const t = String(d);
      if (/full name/i.test(t)) return { field: "fullName", message: t };
      if (/username/i.test(t)) return { field: "username", message: t };
      if (/email/i.test(t)) return { field: "email", message: t };
      if (/passwords do not match/i.test(t)) return { field: "confirmPassword", message: t };
      if (/passphrase|password/i.test(t)) return { field: "password", message: t };
      if (/university/i.test(t)) return { field: "university", message: t };
      if (/country/i.test(t)) return { field: "country", message: t };
    }
    return { message: data.details.join(". ") };
  }

  return { message: data.message ?? "Registration failed. Please verify your details." };
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [university, setUniversity] = useState("");
  const [country, setCountry] = useState("");

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    fullName: false,
    email: false,
    username: false,
    password: false,
    confirmPassword: false,
    university: false,
    country: false,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showApproval, setShowApproval] = useState(false);

  useEffect(() => {
    if (!showApproval) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowApproval(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showApproval]);

  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));
  const clearFieldError = (key: FieldKey) =>
    setFieldErrors((f) => ({ ...f, [key]: undefined }));

  const fullNameError =
    fieldErrors.fullName ?? (touched.fullName ? validateFullName(fullName) : null);
  const emailError =
    fieldErrors.email ?? (touched.email ? validateEmail(email) : null);
  const usernameError =
    fieldErrors.username ?? (touched.username ? validateUsername(username) : null);
  const passwordError =
    fieldErrors.password ?? (touched.password ? validatePassword(password) : null);
  const confirmError =
    fieldErrors.confirmPassword ??
    (touched.confirmPassword ? validateConfirmPassword(password, confirmPassword) : null);
  const universityError =
    fieldErrors.university ?? (touched.university ? validateUniversity(university) : null);
  const countryError =
    fieldErrors.country ??
    (touched.country ? (country === "" ? "Select your country" : null) : null);

  const fullNameValid = fullName.length > 0 && !fullNameError;
  const emailValid = email.length > 0 && !emailError;
  const usernameValid = username.length > 0 && !usernameError;
  const passwordValid = password.length > 0 && !passwordError;
  const confirmValid = confirmPassword.length > 0 && !confirmError;
  const universityValid = university.trim().length > 0 && !universityError;
  const countryValid = country !== "" && !countryError;

  const step1Valid = fullNameValid && emailValid && usernameValid;
  const step2Valid = universityValid && countryValid;
  const step3Valid = passwordValid && confirmValid;

  const validateStep = (s: number): boolean => {
    const errors: FieldErrors = {};
    if (s === 1) {
      errors.fullName = validateFullName(fullName) ?? undefined;
      errors.email = validateEmail(email) ?? undefined;
      errors.username = validateUsername(username) ?? undefined;
    } else if (s === 2) {
      errors.university = validateUniversity(university) ?? undefined;
      errors.country = country === "" ? "Select your country" : undefined;
    } else {
      errors.password = validatePassword(password) ?? undefined;
      errors.confirmPassword = validateConfirmPassword(password, confirmPassword) ?? undefined;
    }
    setTouched((t) => ({ ...t, ...(Object.fromEntries(Object.keys(errors).map((k) => [k, true])) as Record<FieldKey, boolean>) }));
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setServerError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        confirmPassword,
        university: university.trim(),
        country,
      });
      // Show confirmation popup instead of toast
      setSuccessMsg(
        res.data?.message ||
          "Registration submitted. Please wait for an administrator to approve your account before signing in."
      );
      setShowApproval(true);
      setLoading(false);
    } catch (err: any) {
      const mapped = mapServerError(err);
      if (mapped?.field) {
        setFieldErrors((f) => ({ ...f, [mapped.field as FieldKey]: mapped.message }));
      }
      setServerError(mapped?.message ?? "Registration failed. Please verify your details.");
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      if (validateStep(step)) {
        setStep(step + 1);
        setServerError(null);
      }
      return;
    }
    handleSubmit();
  };

  return (
    <AuthShell variant="register">
      <div className="text-center space-y-2">
        <div className="inline-flex p-2 rounded-2xl bg-secondary/10 border border-secondary/20 mb-2">
          <img
            src="/cgs-logo.png"
            alt="Cyber Guardian Society"
            draggable={false}
            className="w-8 h-8 object-contain"
          />
        </div>
        <h1 className="font-display font-black text-2xl text-white">REGISTRATION FORM</h1>
        <p className="font-body text-xs text-muted">
          Three-step identity registration — free, solo, no teams required.
        </p>
      </div>

      {/* Step progress */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              {s > 1 && (
                <span
                  aria-hidden
                  className={`h-px flex-1 transition-colors duration-300 ${
                    s <= step ? "bg-secondary" : "bg-white/10"
                  }`}
                />
              )}
              <span
                className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold transition-all duration-300 ${
                  s < step
                    ? "border-secondary bg-secondary/20 text-secondary"
                    : s === step
                    ? "border-secondary bg-secondary text-void shadow-glow-blue"
                    : "border-white/15 bg-white/[0.03] text-muted"
                }`}
              >
                {s < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.22em]">
            STEP {String(step).padStart(2, "0")} / 03 — {STEP_LABELS[step - 1]}
          </p>
        </div>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="font-body text-xs text-danger font-medium">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4 font-body text-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {step === 1 && (
              <>
                <AuthField
                  id="reg-full-name"
                  label="Full Name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    touch("fullName");
                    clearFieldError("fullName");
                  }}
                  placeholder="e.g. Ada Lovelace"
                  disabled={loading}
                  accent="secondary"
                  error={fullNameError}
                  valid={fullNameValid}
                />

                <AuthField
                  id="reg-username"
                  label="Username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(sanitizeUsername(e.target.value));
                    touch("username");
                    clearFieldError("username");
                  }}
                  placeholder="e.g. zeroday"
                  disabled={loading}
                  accent="secondary"
                  error={usernameError}
                  valid={usernameValid}
                />

                <AuthField
                  id="reg-email"
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    touch("email");
                    clearFieldError("email");
                  }}
                  placeholder="operative@cyberguardiansociety.org"
                  disabled={loading}
                  accent="secondary"
                  error={emailError}
                  valid={emailValid}
                />
              </>
            )}

            {step === 2 && (
              <>
                <p className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.2em]">
                  {STEP_DESCRIPTIONS[0]}
                </p>

                <AuthField
                  id="reg-university"
                  label="University / Affiliation"
                  type="text"
                  autoComplete="organization"
                  value={university}
                  onChange={(e) => {
                    setUniversity(e.target.value);
                    touch("university");
                    clearFieldError("university");
                  }}
                  placeholder="e.g. Cyber Guardian University"
                  disabled={loading}
                  accent="secondary"
                  error={universityError}
                  valid={universityValid}
                />

                <AuthSelect
                  id="reg-country"
                  label="Country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    touch("country");
                    clearFieldError("country");
                  }}
                  options={COUNTRIES}
                  placeholder="Select your country"
                  disabled={loading}
                  accent="secondary"
                  error={countryError}
                  valid={countryValid}
                />
              </>
            )}

            {step === 3 && (
              <>
                <p className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.2em]">
                  {STEP_DESCRIPTIONS[1]}
                </p>

                <div>
                  <AuthField
                    id="reg-password"
                    label="Passphrase"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      touch("password");
                      clearFieldError("password");
                    }}
                    placeholder="••••••••••••"
                    disabled={loading}
                    accent="secondary"
                    error={passwordError}
                    valid={passwordValid}
                    showToggle
                  />
                  <PasswordStrength
                    value={password}
                    visible={touched.password && password.length > 0}
                  />
                </div>

                <AuthField
                  id="reg-confirm-password"
                  label="Confirm Passphrase"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    touch("confirmPassword");
                    clearFieldError("confirmPassword");
                  }}
                  placeholder="••••••••••••"
                  disabled={loading}
                  accent="secondary"
                  error={confirmError}
                  valid={confirmValid}
                  showToggle
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setStep(step - 1);
                setServerError(null);
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-white/15 bg-white/[0.03] text-muted hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK</span>
            </button>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (step === 1 ? !step1Valid : step === 2 ? !step2Valid : !step3Valid)
            }
            className={`flex-1 py-3.5 rounded-xl text-white font-body text-xs font-bold shadow-glow-blue hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-secondary to-secondary-deep`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ENLISTING OPERATIVE…</span>
              </>
            ) : step < 3 ? (
              <>
                <span>CONTINUE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>REGISTER OPERATIVE IDENTITY</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {!loading &&
          (step === 1 ? !step1Valid : step === 2 ? !step2Valid : !step3Valid) && (
            <p className="text-center font-body text-[10px] text-muted-2">
              Complete the current step to continue.
            </p>
          )}
      </form>

      <div className="text-center pt-2 font-body text-xs text-muted">
        Already Enlisted?{" "}
        <Link href="/auth/login" className="text-secondary hover:underline font-semibold">
          Login Here
        </Link>
      </div>

      <AnimatePresence>
        {showApproval && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="absolute inset-0 bg-void/80 backdrop-blur-sm"
              onClick={() => setShowApproval(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="relative w-full max-w-md rounded-2xl border border-secondary/20 bg-[#0B0E15]/95 p-8 text-center shadow-glow-blue"
            >
              <div className="relative mx-auto mb-5 w-16 h-16">
                <motion.svg
                  viewBox="0 0 52 52"
                  className="w-16 h-16"
                  fill="none"
                  initial={{ rotate: -90, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <motion.circle
                    cx="26"
                    cy="26"
                    r="23"
                    stroke="url(#cgs-check-grad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                  />
                  <motion.path
                    d="M14 27 L23 36 L39 18"
                    stroke="url(#cgs-check-grad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.55 }}
                  />
                  <defs>
                    <linearGradient id="cgs-check-grad" x1="0" y1="0" x2="52" y2="52">
                      <stop stopColor="#00B4FF" />
                      <stop offset="1" stopColor="#7A5CFF" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </div>
              <h1 className="font-display font-black text-xl text-white tracking-wide">
                IDENTITY REGISTERED
              </h1>
              <div className="mt-4 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3">
                <p className="font-body text-[11px] text-warning font-semibold uppercase tracking-[0.18em]">
                  Please wait for admin approval
                </p>
                <p className="font-body text-[11px] text-muted mt-1 leading-relaxed">
                  Your registration has been submitted. An administrator must approve your account
                  before you can sign in — you will not be able to log in until then.
                </p>
              </div>
              <p className="mt-3 font-body text-[11px] text-muted-2 leading-relaxed">
                {successMsg}
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-gradient-to-r from-secondary to-secondary-deep text-white font-body text-xs font-bold shadow-glow-blue hover:brightness-110 transition-all gap-2"
              >
                BACK TO LOGIN
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
