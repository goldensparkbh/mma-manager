import "./load-env.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { router } from "./routes.js";
import { runMigrations, seedDefaults, pool } from "./db/index.js";
import { getUploadDir } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await runMigrations();
  await seedDefaults();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  const distPath = path.resolve(__dirname, "..", "dist");

  // Serve static assets and SPA before API router (router auth would block GET /)
  app.use("/uploads", express.static(getUploadDir()));
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next();
    });
  });

  app.use(router);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  const { processAllTrialReminders } = await import("./data.js");
  processAllTrialReminders().catch((err) => console.error("Trial reminder job:", err));
  setInterval(() => {
    processAllTrialReminders().catch((err) => console.error("Trial reminder job:", err));
  }, 6 * 60 * 60 * 1000);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGTERM", () => pool.end());
