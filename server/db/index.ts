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
  await syncSubscriptionPlans();
  await syncPlatformAdminFromEnv();
  const { syncPlatformClubTypes } = await import("../platformClubTypes.js");
  await syncPlatformClubTypes();
}

/** Ensure platform plans exist / stay up to date (incl. free tier for staff app). */
export async function syncSubscriptionPlans() {
  const plans = [
    {
      name: "Free",
      slug: "free",
      description: "Manage members, classes, packages & check-ins via the staff app — always free",
      price_monthly: 0,
      price_yearly: 0,
      max_members: 50,
      max_users: 3,
      features: '["members","attendance","subscriptions","schedule","registrations","settings","users"]',
      sort_order: 0,
    },
    {
      name: "Starter",
      slug: "starter",
      description: "Growing clubs — higher limits, same core tools",
      price_monthly: 29,
      price_yearly: 290,
      max_members: 100,
      max_users: 5,
      features: '["members","attendance","subscriptions","schedule","registrations","settings","users"]',
      sort_order: 1,
    },
    {
      name: "Professional",
      slug: "professional",
      description: "Full business suite — store, finance, analytics & progression",
      price_monthly: 59,
      price_yearly: 590,
      max_members: 500,
      max_users: 10,
      features: '["members","attendance","subscriptions","schedule","registrations","settings","users","store","sales","finance","analytics","belts","camps"]',
      sort_order: 2,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "Unlimited features for large organizations",
      price_monthly: 99,
      price_yearly: 990,
      max_members: 9999,
      max_users: 50,
      features: '["*"]',
      sort_order: 3,
    },
  ];

  for (const p of plans) {
    await query(
      `INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_members, max_users, features, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,true)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price_monthly = EXCLUDED.price_monthly,
         price_yearly = EXCLUDED.price_yearly,
         max_members = EXCLUDED.max_members,
         max_users = EXCLUDED.max_users,
         features = EXCLUDED.features,
         sort_order = EXCLUDED.sort_order,
         is_active = true`,
      [p.name, p.slug, p.description, p.price_monthly, p.price_yearly, p.max_members, p.max_users, p.features, p.sort_order],
    );
  }
}

/** Create or refresh platform admin from env (DigitalOcean / .env.local). */
export async function syncPlatformAdminFromEnv() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) return;

  const bcrypt = (await import("bcryptjs")).default;
  const hash = await bcrypt.hash(password, 12);

  const existing = await query<{ id: string }>(
    "SELECT id FROM platform_admins WHERE LOWER(email) = $1",
    [email],
  );
  if (existing.rows[0]) {
    await query(
      "UPDATE platform_admins SET password_hash = $1, is_active = true WHERE id = $2",
      [hash, existing.rows[0].id],
    );
    console.log(`Platform admin password synced for ${email}`);
    return;
  }

  const anyAdmin = await query("SELECT id, email FROM platform_admins LIMIT 1");
  if (anyAdmin.rows.length === 0) {
    await query(
      "INSERT INTO platform_admins (email, password_hash, display_name) VALUES ($1, $2, $3)",
      [email, hash, "Platform Admin"],
    );
    console.log(`Platform admin created for ${email}`);
    return;
  }

  // One admin exists but different email — optional takeover via env flag
  if (process.env.PLATFORM_ADMIN_FORCE_SYNC === "true") {
    await query(
      "UPDATE platform_admins SET email = $1, password_hash = $2, is_active = true WHERE id = $3",
      [email, hash, anyAdmin.rows[0].id],
    );
    console.log(`Platform admin email/password force-synced to ${email}`);
  } else {
    console.warn(
      `PLATFORM_ADMIN_EMAIL (${email}) does not match existing platform admin (${anyAdmin.rows[0].email}). ` +
        "Set PLATFORM_ADMIN_FORCE_SYNC=true to update the existing account, or log in with the existing email.",
    );
  }
}
