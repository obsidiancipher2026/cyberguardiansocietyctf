const { createApp } = require("../backend/dist/app");
const { connectDb } = require("../backend/dist/db");
const { ensureAdminUser, ensureCompetitionRow } = require("../backend/dist/services/adminBootstrap");
const { validateConfig } = require("../backend/dist/config");

let initialized = false;
let initPromise = null;

async function init() {
  if (!initialized) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          // In production, validate that environment variables are set
          try {
            validateConfig();
          } catch (configErr) {
            console.warn("Config validation warning:", configErr.message);
          }
          await connectDb();
          await ensureAdminUser();
          await ensureCompetitionRow();
          initialized = true;
        } catch (err) {
          console.error("Initialization error in backend serverless handler:", err);
          initPromise = null;
          throw err;
        }
      })();
    }
    await initPromise;
  }
}

const expressApp = createApp();

module.exports = async (req, res) => {
  try {
    await init();
  } catch (err) {
    console.error("Cold start initialization failure:", err);
  }

  // Ensure request URL starts with /api for Express route dispatching
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }

  return expressApp(req, res);
};
