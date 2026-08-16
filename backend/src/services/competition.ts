import { Competition } from "../models";
import type { CompetitionState } from "@cgs-ctf/shared";

export async function getCompetitionState(): Promise<CompetitionState> {
  const comp = await Competition.findOne({ order: [["id", "DESC"]] });
  if (!comp) {
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
      name: "CGS CTF",
      now: new Date().toISOString(),
    };
  }

  let status = comp.status;
  const now = Date.now();
  const start = comp.startTime ? comp.startTime.getTime() : null;
  const end = comp.endTime ? comp.endTime.getTime() : null;
  const freezeAt = end != null ? end - comp.freezeOffsetMinutes * 60_000 : null;

  if (status === "live" || status === "frozen") {
    if (end != null && now > end) status = "ended";
    else if (freezeAt != null && now > freezeAt) status = "frozen";
  }
  if (status === "upcoming" && start != null && now > start && (end == null || now < end)) status = "live";

  return {
    status,
    startTime: comp.startTime ? comp.startTime.toISOString() : null,
    endTime: comp.endTime ? comp.endTime.toISOString() : null,
    freezeOffsetMinutes: comp.freezeOffsetMinutes,
    maintenanceMode: comp.maintenanceMode,
    maintenanceMessage: comp.maintenanceMessage,
    submissionsKilled: comp.submissionsKilled,
    scoreboardFrozen: comp.scoreboardFrozen,
    scoreboardFrozenAt: comp.scoreboardFrozenAt ? comp.scoreboardFrozenAt.toISOString() : null,
    name: comp.name,
    now: new Date().toISOString(),
  };
}

export function submissionsAllowed(state: CompetitionState): boolean {
  return state.status === "live" || state.status === "frozen";
}
