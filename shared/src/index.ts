export type UserRole = "user" | "admin";

export type ChallengeCategory =
  | "web"
  | "pwn"
  | "crypto"
  | "forensics"
  | "reversing"
  | "osint"
  | "misc";

export type ChallengeDifficulty = "easy" | "medium" | "hard" | "insane";

export type ChallengeVisibility = "draft" | "hidden" | "live";

export type CompetitionStatus = "upcoming" | "live" | "frozen" | "ended";

export type SubmissionResult = "correct" | "incorrect" | "already_solved" | "max_attempts" | "killed" | "locked";

export const CHALLENGE_CATEGORIES: ChallengeCategory[] = [
  "web",
  "pwn",
  "crypto",
  "forensics",
  "reversing",
  "osint",
  "misc",
];

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  web: "Web",
  pwn: "Pwn",
  crypto: "Crypto",
  forensics: "Forensics",
  reversing: "Reversing",
  osint: "OSINT",
  misc: "Misc",
};

export const DIFFICULTY_ORDER: Record<ChallengeDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  insane: 4,
};

export const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  insane: "Insane",
};

export const COMPETITION_STATUS_LABELS: Record<CompetitionStatus, string> = {
  upcoming: "Upcoming",
  live: "Live",
  frozen: "Frozen",
  ended: "Ended",
};

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  teamId: number | null;
  isVerified: boolean;
  isApproved: boolean;
  isBanned: boolean;
  twoFAEnabled: boolean;
  createdAt: string;
}

export interface PublicChallenge {
  id: number;
  title: string;
  category: ChallengeCategory;
  description: string;
  longDescription: string;
  points: number;
  bloodPoints: number;
  difficulty: ChallengeDifficulty;
  solves: number;
  solved: boolean;
  maxAttempts: number | null;
  attemptsUsed: number;
  attachments: { name: string; url: string }[];
  hints: { id: number; cost: number; revealed: boolean; text: string | null }[];
  tags: string[];
  author: string;
  released: string;
}

export interface ScoreboardEntry {
  rank: number;
  name: string;
  teamId: number | null;
  points: number;
  solves: number;
  lastSolveAt: string | null;
}

export interface AnnouncementPublic {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  author: string;
  publishedAt: string;
}

export interface CompetitionState {
  status: CompetitionStatus;
  startTime: string | null;
  endTime: string | null;
  freezeOffsetMinutes: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  submissionsKilled: boolean;
  scoreboardFrozen: boolean;
  scoreboardFrozenAt: string | null;
  name: string;
  now: string;
}

export interface AuthTokens {
  accessToken: string;
}

export const API_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT: "CONFLICT",
  INTERNAL: "INTERNAL",
  BANNED: "BANNED",
  UNVERIFIED: "UNVERIFIED",
  MAINTENANCE: "MAINTENANCE",
  TWO_FA_REQUIRED: "TWO_FA_REQUIRED",
  TWO_FA_INVALID: "TWO_FA_INVALID",
  COMPETITION_LOCKED: "COMPETITION_LOCKED",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorShape {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export function defaultCompetitionState(name = "CGS CTF"): CompetitionState {
  return {
    status: "upcoming",
    startTime: null,
    endTime: null,
    freezeOffsetMinutes: 30,
    maintenanceMode: false,
    maintenanceMessage: null,
    submissionsKilled: false,
    scoreboardFrozen: false,
    scoreboardFrozenAt: null,
    name,
    now: new Date().toISOString(),
  };
}
