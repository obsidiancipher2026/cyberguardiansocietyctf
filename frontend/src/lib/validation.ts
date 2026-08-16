export const USERNAME_REGEX = /^[a-z0-9]+$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const FULLNAME_REGEX = /^[A-Za-z\u00C0-\u024F]+(?: [A-Za-z\u00C0-\u024F]+)*$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const PASSWORD_RULES: Array<{
  label: string;
  action: string;
  test: (value: string) => boolean;
}> = [
  {
    label: "At least 8 characters",
    action: "Use at least 8 characters",
    test: (v) => v.length >= PASSWORD_MIN,
  },
  {
    label: "One uppercase letter",
    action: "Add an uppercase letter",
    test: (v) => /[A-Z]/.test(v),
  },
  {
    label: "One lowercase letter",
    action: "Add a lowercase letter",
    test: (v) => /[a-z]/.test(v),
  },
  {
    label: "One number",
    action: "Add a number",
    test: (v) => /\d/.test(v),
  },
  {
    label: "One special character",
    action: "Add a special character (!@#$%^&*)",
    test: (v) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(v),
  },
];

export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordCheck {
  met: string[];
  missing: string[];
  missingActions: string[];
  score: number;
  strength: PasswordStrength;
}

export function checkPassword(value: string): PasswordCheck {
  const met: string[] = [];
  const missing: string[] = [];
  const missingActions: string[] = [];
  for (const rule of PASSWORD_RULES) {
    if (rule.test(value)) {
      met.push(rule.label);
    } else {
      missing.push(rule.label);
      missingActions.push(rule.action);
    }
  }
  const score = met.length;
  const strength: PasswordStrength = score <= 2 ? "weak" : score <= 3 ? "medium" : "strong";
  return { met, missing, missingActions, score, strength };
}

/** Auto-lowercase username input as the user types (uppercase silently converted). */
export function sanitizeUsername(value: string): string {
  return value.toLowerCase();
}

export function validateUsername(value: string): string | null {
  if (value.length === 0) return "Username is required";
  if (!USERNAME_REGEX.test(value)) return "Only lowercase letters and numbers allowed";
  if (value.length < 3) return "Username must be at least 3 characters";
  if (value.length > 20) return "Username must be 20 characters or fewer";
  return null;
}

export function validateEmail(value: string): string | null {
  if (value.length === 0) return "Email address is required";
  if (!EMAIL_REGEX.test(value)) return "Enter a valid email address";
  return null;
}

export function validateFullName(value: string): string | null {
  if (value.length === 0) return "Full name is required";
  if (!FULLNAME_REGEX.test(value)) return "Full name can only contain letters and spaces";
  if (value.length < 2) return "Full name must be at least 2 characters";
  if (value.length > 100) return "Full name must be 100 characters or fewer";
  return null;
}

export function validateUniversity(value: string): string | null {
  if (value.trim().length === 0) return "University / affiliation is required";
  if (value.length < 2) return "Must be at least 2 characters";
  if (value.length > 100) return "Must be 100 characters or fewer";
  return null;
}

export function validateCountry(value: string): string | null {
  if (value.length === 0) return "Select your country";
  if (value.length < 2) return "Must be at least 2 characters";
  if (value.length > 80) return "Must be 80 characters or fewer";
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length === 0) return "Passphrase is required";
  if (/\s/.test(value)) return "Passphrase cannot contain spaces";
  if (value.length > PASSWORD_MAX) return `Passphrase must be ${PASSWORD_MAX} characters or fewer`;
  const { missingActions } = checkPassword(value);
  return missingActions[0] ?? null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (confirm.length === 0) return "Please confirm your passphrase";
  if (password !== confirm) return "Passwords do not match";
  return null;
}
