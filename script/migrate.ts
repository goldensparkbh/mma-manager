import "../server/load-env.js";
import { runMigrations, seedDefaults, pool } from "../server/db/index.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local");
  process.exit(1);
}

runMigrations()
  .then(() => {
    console.log("Migrations complete.");
    return seedDefaults();
  })
  .then(() => {
    console.log("Default data seeded.");
  })
  .catch((err) => {
    console.error("Migration failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
