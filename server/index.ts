import "./load-env.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { router } from "./routes.js";
import { runMigrations, seedDefaults, pool } from "./db/index.js";
import { createUploadsMiddleware, logUploadStorageMode } from "./uploadsServe.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await runMigrations();
  await seedDefaults();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  const distPath = path.resolve(__dirname, "..", "dist");
  const clubTypesPath = path.resolve(__dirname, "..", "client", "public", "club-types");

  // Serve static assets and SPA before API router (router auth would block GET /)
  // Serve uploads (local disk and/or Spaces redirect)
  app.use("/uploads", ...createUploadsMiddleware());
  logUploadStorageMode();
  app.use("/club-types", express.static(clubTypesPath));
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

  const { generateClassSessionsForAllTenants } = await import("./scheduling.js");
  generateClassSessionsForAllTenants(28).catch((err) => console.error("Class session generator:", err));
  setInterval(() => {
    generateClassSessionsForAllTenants(28).catch((err) => console.error("Class session generator:", err));
  }, 24 * 60 * 60 * 1000);

  const runNotificationJobs = async () => {
    const { processNotificationQueue, processClassReminders, processSubscriptionExpiryReminders } =
      await import("./notifications.js");
    const { processRecurringBilling } = await import("./memberPayments.js");
    await processNotificationQueue().catch((err) => console.error("Notification queue:", err));
    await processClassReminders().catch((err) => console.error("Class reminders:", err));
    await processSubscriptionExpiryReminders().catch((err) => console.error("Expiry reminders:", err));
    await processRecurringBilling().catch((err) => console.error("Recurring billing:", err));
  };
  runNotificationJobs();
  setInterval(runNotificationJobs, 15 * 60 * 1000);

  const runOwnerDigest = async () => {
    const { processOwnerDigest } = await import("./notifications.js");
    await processOwnerDigest().catch((err) => console.error("Owner digest:", err));
  };
  runOwnerDigest();
  setInterval(runOwnerDigest, 24 * 60 * 60 * 1000);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGTERM", () => pool.end());
