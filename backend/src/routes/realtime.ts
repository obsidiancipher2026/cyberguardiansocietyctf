import { Router } from "express";
import { hub } from "../services/realtime";
import { strictLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/events", strictLimiter(10, 60_000), (req, res) => {
  if (!hub.connect(res)) {
    res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Realtime event stream connection limit reached." } });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`event: hello\ndata: {"connected":true}\n\n`);

  const ping = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25_000);

  req.on("close", () => clearInterval(ping));
});

export default router;
