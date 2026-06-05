import "../load-env.js";
import pg from "pg";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawDatabaseUrl = process.env.DATABASE_URL || "";
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  rawDatabaseUrl.includes("sslmode=") ||
  rawDatabaseUrl.includes("ondigitalocean.com");

// Strip sslmode from URL so pg uses our ssl config (avoids cert chain errors on DO)
const databaseUrl = rawDatabaseUrl.replace(/[?&]sslmode=[^&]+/, "").replace(/\?$/, "");

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params);
}

export async function runMigrations() {
  const schema = await readFile(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
}

export async function seedDefaults() {
  const plans = await query("SELECT id FROM subscription_plans LIMIT 1");
  if (plans.rows.length === 0) {
    await query(`
      INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_members, max_users, features, sort_order)
      VALUES
        ('Starter', 'starter', 'Perfect for small clubs', 29.00, 290.00, 100, 3, '["members","attendance","subscriptions"]', 1),
        ('Professional', 'professional', 'For growing clubs', 59.00, 590.00, 500, 10, '["members","attendance","subscriptions","store","finance","belts"]', 2),
        ('Enterprise', 'enterprise', 'Unlimited features', 99.00, 990.00, 9999, 50, '["*"]', 3)
    `);
  }

  const admins = await query("SELECT id FROM platform_admins LIMIT 1");
  if (admins.rows.length === 0 && process.env.PLATFORM_ADMIN_EMAIL && process.env.PLATFORM_ADMIN_PASSWORD) {
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash(process.env.PLATFORM_ADMIN_PASSWORD, 12);
    await query(
      "INSERT INTO platform_admins (email, password_hash, display_name) VALUES ($1, $2, $3)",
      [process.env.PLATFORM_ADMIN_EMAIL, hash, "Platform Admin"],
    );
  }
}
