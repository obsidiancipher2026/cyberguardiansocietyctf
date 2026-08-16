const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

process.env.DB_STORAGE = path.join(os.tmpdir(), "cgs-test3.sqlite");
process.env.PORT = "4112";
process.env.NODE_ENV = "development";
process.env.LOG_DIR = path.join(os.tmpdir(), "cgs-test-logs");

const { createApp } = require("../backend/dist/app");
const { connectDb } = require("../backend/dist/db");

let cookie = "";
function req(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      {
        host: "localhost",
        port: 4112,
        path: url,
        method,
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          ...(cookie ? { cookie } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(data ? { "content-length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          let json = null;
          try {
            json = chunks ? JSON.parse(chunks) : null;
          } catch {}
          if (res.headers["set-cookie"]) cookie = res.headers["set-cookie"][0].split(";")[0];
          resolve({ status: res.statusCode, json });
        });
      }
    );
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

let failed = 0;
function check(name, cond, extra = "") {
  if (!cond) {
    failed++;
    console.log(`FAIL [${name}] ${extra}`);
  } else {
    console.log(`ok   [${name}]`);
  }
}

async function main() {
  fs.rmSync(process.env.DB_STORAGE, { force: true });
  fs.rmSync(process.env.LOG_DIR, { recursive: true, force: true });
  await connectDb();
  const app = createApp();
  await new Promise((resolve) => app.listen(4112, resolve));
  console.log("SERVER UP");

  const { User, Team, Competition, Challenge, Hint, Announcement } = require("../backend/dist/models");
  const { hashFlag } = require("../backend/dist/utils/crypto");

  await Competition.create({ name: "CGS CTF" });

  const r1 = await req("POST", "/api/auth/register", {
    fullName: "Hacker One",
    username: "hacker1",
    email: "h@x.io",
    password: "Passw0rd!x",
    confirmPassword: "Passw0rd!x",
    university: "Cyber University",
    country: "PK",
  });
  check("register", r1.status === 201, JSON.stringify(r1.json));

  const r1b = await req("POST", "/api/auth/register", {
    fullName: "Hacker Two",
    username: "hacker1",
    email: "other@x.io",
    password: "Passw0rd!x",
    confirmPassword: "Passw0rd!x",
    university: "Cyber University",
    country: "PK",
  });
  check("register-duplicate-username", r1b.status === 409);

  // Registrations require administrator approval before sign-in.
  await User.update({ isApproved: true, isVerified: true }, { where: { username: "hacker1" } });

  const r2 = await req("POST", "/api/auth/login", { identifier: "hacker1", password: "Passw0rd!x" });
  check("login", r2.status === 200 && r2.json.accessToken && r2.json.user.isVerified, JSON.stringify(r2.json));
  const userToken = r2.json.accessToken;

  const r2b = await req("GET", "/api/auth/me", null, userToken);
  check("me", r2b.status === 200 && r2b.json.user.username === "hacker1");

  const r2c = await req("POST", "/api/auth/refresh");
  check("refresh-rotates-token", r2c.status === 200 && r2c.json.accessToken);

  const r2d = await req("GET", "/api/profile/me", null, userToken);
  check("profile", r2d.status === 200 && r2d.json.stats.points === 0);

  const user = await User.findOne({ where: { username: "hacker1" } });
  const team = await Team.create({ name: "TeamNull", ownerId: user.id });
  await user.update({ teamId: team.id });

  const challenge = await Challenge.create({
    title: "First Flag",
    category: "web",
    description: "Find the flag in the source.",
    basePoints: 200,
    isDynamic: false,
    minPoints: 50,
    decayFactor: 0.95,
    flagHash: hashFlag("CGS{hello_world}"),
    difficulty: "easy",
    visibility: "live",
    maxAttempts: 5,
    tags: ["intro"],
    createdBy: user.id,
  });
  await Hint.create({ challengeId: challenge.id, content: "Check view-source.", cost: 0, order: 0 });
  await Announcement.create({
    title: "Welcome",
    content: "# Hello\nWelcome to the competition.",
    isPinned: true,
    audience: "all",
    pushEnabled: true,
    publishedAt: new Date(),
    createdBy: user.id,
  });

  const r3 = await req("GET", "/api/challenges", null, userToken);
  check("public-challenges", r3.status === 200 && r3.json.challenges.length === 1 && r3.json.challenges[0].points === 200);

  const r3b = await req("POST", "/api/challenges/1/submit", { flag: "WRONG" }, userToken);
  check("submit-blocked-before-live", r3b.status === 403, JSON.stringify(r3b.json));

  await Competition.update({ status: "live" }, { where: {} });

  const r4 = await req("POST", `/api/challenges/${challenge.id}/submit`, { flag: "WRONG" }, userToken);
  check("submit-wrong-flag", r4.status === 200 && r4.json.result === "incorrect");

  const r4b = await req("POST", `/api/challenges/${challenge.id}/submit`, { flag: "CGS{hello_world}" }, userToken);
  check("submit-correct-flag", r4b.status === 200 && r4b.json.result === "correct" && r4b.json.firstBlood === true, JSON.stringify(r4b.json));

  const r4c = await req("POST", `/api/challenges/${challenge.id}/submit`, { flag: "CGS{hello_world}" }, userToken);
  check("submit-again-already-solved", r4c.status === 200 && r4c.json.result === "already_solved");

  const r5 = await req("GET", "/api/scoreboard", null, userToken);
  check("scoreboard-points", r5.status === 200 && r5.json.entries[0] && r5.json.entries[0].points === 200, JSON.stringify(r5.json));

  const r5b = await req("POST", `/api/challenges/${challenge.id}/hint/1`, {}, userToken);
  check("hint-revealed", r5b.status === 200 && r5b.json.hint.content.includes("view-source"), JSON.stringify(r5b.json));

  const r6 = await req("GET", "/api/profile/me", null, userToken);
  check("profile-after-solve", r6.status === 200 && r6.json.stats.solves === 1 && r6.json.stats.points === 200, JSON.stringify(r6.json));

  const r7 = await req("GET", "/api/announcements", null, userToken);
  check("public-announcements", r7.status === 200 && r7.json.announcements.length === 1 && r7.json.announcements[0].isPinned);

  await Competition.update({ submissionsKilled: true }, { where: {} });
  const r8 = await req("POST", `/api/challenges/${challenge.id}/submit`, { flag: "X" }, userToken);
  check("submit-blocked-when-killed", r8.status === 403);
  await Competition.update({ submissionsKilled: false }, { where: {} });

  await Competition.update({ maintenanceMode: true, maintenanceMessage: "Maintenance window" }, { where: {} });
  const r9 = await req("GET", "/api/challenges");
  check("maintenance-blocks-public", r9.status === 503);
  const r9b = await req("GET", "/api/healthz");
  check("healthz-open", r9b.status === 200);
  await Competition.update({ maintenanceMode: false, maintenanceMessage: null }, { where: {} });

  const r10 = await req("GET", "/api/challenges", null, userToken);
  check("challenges-after-maintenance", r10.status === 200);

  // --- Security section: submission rate limiting (real, automated) ---
  // A challenge with no attempt cap so the rate guard (6/window) triggers.
  const spamChallenge = await Challenge.create({
    title: "Spam Test",
    category: "web",
    description: "Rate limit test.",
    basePoints: 100,
    isDynamic: false,
    minPoints: 10,
    decayFactor: 0.95,
    flagHash: hashFlag("CGS{spam}"),
    difficulty: "easy",
    visibility: "live",
    maxAttempts: null,
    tags: [],
    createdBy: user.id,
  });
  for (let i = 0; i < 8; i++) {
    await req("POST", `/api/challenges/${spamChallenge.id}/submit`, { flag: `wrong_${i}` }, userToken);
  }
  const rRate = await req("POST", `/api/challenges/${spamChallenge.id}/submit`, { flag: "wrong_again" }, userToken);
  check("rate-limit-blocks-automated-guessing", rRate.status === 429 && rRate.json.result === "rate_limited", JSON.stringify(rRate.json));

  // Plagiarism: same wrong flag from TWO different teams must be flagged
  async function makePlagTeam(username, teamName, email) {
    const rr = await req("POST", "/api/auth/register", {
      fullName: "Plagiarist", username, email,
      password: "Passw0rd!x", confirmPassword: "Passw0rd!x", university: "Uni", country: "PK",
    });
    await User.update({ isApproved: true, isVerified: true }, { where: { username } });
    const login = await req("POST", "/api/auth/login", { identifier: username, password: "Passw0rd!x" });
    const u = await User.findOne({ where: { username } });
    const t = await Team.create({ name: teamName, ownerId: u.id });
    await u.update({ teamId: t.id });
    return login.json.accessToken;
  }
  const t1 = await makePlagTeam("plag1", "TeamOne", "plag1@x.io");
  const t2 = await makePlagTeam("plag2", "TeamTwo", "plag2@x.io");
  await req("POST", `/api/challenges/${challenge.id}/submit`, { flag: "shared_wrong_flag" }, t1);
  await req("POST", `/api/challenges/${challenge.id}/submit`, { flag: "shared_wrong_flag" }, t2);

  const { scanPlagiarism } = require("../backend/dist/services/plagiarism");
  const cases = await scanPlagiarism({ sinceHours: 24, minTeams: 2 });
  check("plagiarism-detected-cross-team", cases.length >= 1, JSON.stringify(cases.map((c) => c.teams)));

  // Audit trail: registration/approval/admin actions must be absent (public
  // API has no audit), but security alerts from rate limiting must exist.
  await new Promise((r) => setTimeout(r, 300)); // allow async alert write
  const { SecurityAlert } = require("../backend/dist/models");
  const alertCount = await SecurityAlert.count({ where: { category: "rate_limit" } });
  check("rate-limit-raised-alert", alertCount >= 1, `alerts=${alertCount}`);

  // Traffic monitor records real requests
  const { trafficMonitor } = require("../backend/dist/services/trafficMonitor");
  const traffic = trafficMonitor.snapshot();
  check("traffic-monitor-samples-requests", traffic.total > 0, `total=${traffic.total}`);

  const r11 = await req("POST", "/api/admin/challenges", {}, null);
  check("admin-routes-gone", r11.status === 404);

  console.log(failed === 0 ? "ALL SMOKE TESTS PASSED" : `${failed} SMOKE TESTS FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("SMOKE TEST ERROR", e);
  process.exit(1);
});
