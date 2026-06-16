/**
 * Local fingerprint reader bridge for club front-desk PCs.
 * Connects USB fingerprint scanners (via vendor SDK) to the web platform.
 *
 * Run: npx tsx tools/fingerprint-bridge/server.ts
 * Default: http://127.0.0.1:9780
 *
 * Endpoints:
 *   GET  /health
 *   POST /capture        -> { template: base64 }
 *   POST /verify-pair    -> { match: boolean }
 *   POST /match          -> { memberId?, score? }
 *
 * Without hardware, simulates capture for development (press twice with same "finger slot").
 */
import express from "express";
import crypto from "crypto";

const PORT = Number(process.env.FINGERPRINT_BRIDGE_PORT || 9780);
const app = express();
app.use(express.json({ limit: "2mb" }));

/** Dev-only: last capture hash simulates "same finger" when repeated quickly. */
const devSessions = new Map<string, string>();

function devTemplate(sessionKey: string): string {
  const prev = devSessions.get(sessionKey);
  const seed = prev || crypto.randomBytes(16).toString("hex");
  devSessions.set(sessionKey, seed);
  return Buffer.from(`dev-fp:${seed}`).toString("base64");
}

function similarity(a: string, b: string): number {
  try {
    const ba = Buffer.from(a, "base64");
    const bb = Buffer.from(b, "base64");
    const len = Math.min(ba.length, bb.length);
    if (!len) return 0;
    let same = 0;
    for (let i = 0; i < len; i++) if (ba[i] === bb[i]) same++;
    return same / len;
  } catch {
    return a === b ? 1 : 0;
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: process.env.FINGERPRINT_HARDWARE === "true" ? "hardware" : "simulated" });
});

app.post("/capture", (req, res) => {
  const sessionKey = (req.headers["x-session-id"] as string) || "default";
  if (process.env.FINGERPRINT_HARDWARE === "true") {
    return res.status(501).json({
      error: "Hardware mode: integrate your reader SDK here (ZKTeco, DigitalPersona, etc.)",
    });
  }
  res.json({ template: devTemplate(sessionKey) });
});

app.post("/verify-pair", (req, res) => {
  const { template1, template2 } = req.body as { template1?: string; template2?: string };
  if (!template1 || !template2) return res.status(400).json({ error: "template1 and template2 required" });
  res.json({ match: similarity(template1, template2) >= 0.85 });
});

app.post("/match", (req, res) => {
  const { probe, candidates } = req.body as {
    probe?: string;
    candidates?: { id: string; template?: string; templateAlt?: string }[];
  };
  if (!probe || !Array.isArray(candidates)) {
    return res.status(400).json({ error: "probe and candidates required" });
  }
  let best: { memberId: string; score: number } | null = null;
  for (const c of candidates) {
    const s1 = c.template ? similarity(probe, c.template) : 0;
    const s2 = c.templateAlt ? similarity(probe, c.templateAlt) : 0;
    const score = Math.max(s1, s2);
    if (score >= 0.88 && (!best || score > best.score)) {
      best = { memberId: c.id, score };
    }
  }
  if (!best) return res.json({});
  res.json({ memberId: best.memberId, score: best.score });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[fingerprint-bridge] http://127.0.0.1:${PORT} (${process.env.FINGERPRINT_HARDWARE === "true" ? "hardware" : "simulated"})`);
});
