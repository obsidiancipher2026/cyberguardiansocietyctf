import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../backend/src/app";
import { connectDb } from "../backend/src/db";
import { ensureAdminUser, ensureCompetitionRow } from "../backend/src/services/adminBootstrap";

let initialized = false;
const app = createApp();

async function init() {
  if (!initialized) {
    await connectDb();
    await ensureAdminUser();
    await ensureCompetitionRow();
    initialized = true;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await init();
  return app(req, res);
}
