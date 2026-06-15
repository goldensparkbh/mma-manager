/**
 * Seeds GCC directory clubs (map listings) into Nawady.
 * Run: npm run db:seed:directory
 * Reset: SEED_DIRECTORY_RESET=true npm run db:seed:directory
 */
import "../server/load-env.js";
import { pool, query } from "../server/db/index.js";
import * as data from "../server/data.js";
import * as bookings from "../server/bookings.js";
import { DEFAULT_OPERATING_HOURS, DIRECTORY_CLUBS, type DirectoryClubDef } from "./data/directory-clubs.js";

const DIRECTORY_PASSWORD = "Directory123!";
const EMAIL_DOMAIN = "@directory.nawady.app";

function logoUrl(clubType: string) {
  return `/club-types/${clubType}.png`;
}

async function directoryTenantExists(key: string): Promise<string | null> {
  const email = `dir+${key}${EMAIL_DOMAIN}`;
  const r = await query(
    `SELECT t.id FROM tenants t
     INNER JOIN users u ON u.tenant_id = t.id AND u.email = $1`,
    [email],
  );
  return (r.rows[0]?.id as string) ?? null;
}

async function deleteDirectoryTenants(): Promise<void> {
  const tenants = await query(
    `SELECT DISTINCT t.id, t.name FROM tenants t
     INNER JOIN users u ON u.tenant_id = t.id
     WHERE u.email LIKE $1`,
    [`%${EMAIL_DOMAIN}`],
  );
  for (const row of tenants.rows) {
    console.log(`  Removing directory tenant: ${row.name}`);
    await query("DELETE FROM tenants WHERE id = $1", [row.id]);
  }
}

async function seedDirectoryClub(def: DirectoryClubDef): Promise<void> {
  const email = `dir+${def.key}${EMAIL_DOMAIN}`;
  const existingId = await directoryTenantExists(def.key);
  if (existingId) {
    console.log(`  Skip ${def.clubName} (exists)`);
    return;
  }

  console.log(`  Seeding ${def.clubName} (${def.country})...`);

  const { tenant } = await data.provisionTenant({
    clubName: def.clubName,
    email,
    password: DIRECTORY_PASSWORD,
    adminName: `${def.clubName} Admin`,
    phone: def.phone,
    clubType: def.clubType,
    planSlug: "free",
  });
  const tenantId = tenant.id as string;

  const extraSports = def.sportTypes.filter((s) => s !== def.clubType);

  await data.updateSettings(tenantId, {
    name: def.clubName,
    phone: def.phone,
    location: def.location,
    city: def.city,
    country: def.country,
    latitude: def.latitude,
    longitude: def.longitude,
    clubType: def.clubType,
    sportTypeIds: extraSports,
    logoUrlLight: logoUrl(def.clubType),
    logoUrlDark: logoUrl(def.clubType),
    managerEmail: email,
    socials: {
      facebook: def.socials?.facebook || "",
      instagram: def.socials?.instagram || "",
      twitter: def.socials?.twitter || "",
      website: def.socials?.website || "",
    },
    operatingHours: DEFAULT_OPERATING_HOURS,
  });

  await bookings.updateBookingSettings(tenantId, {
    portalEnabled: true,
    appDirectoryEnabled: true,
    portalPrimaryColor: def.primaryColor,
    portalWelcomeMessage: def.welcomeMessage,
    publicSlug: tenant.slug as string,
  });
}

async function main() {
  console.log(`Directory seed: ${DIRECTORY_CLUBS.length} clubs defined`);

  if (process.env.SEED_DIRECTORY_RESET === "true") {
    console.log("Resetting directory tenants...");
    await deleteDirectoryTenants();
  }

  let seeded = 0;
  for (const def of DIRECTORY_CLUBS) {
    await seedDirectoryClub(def);
    seeded++;
  }

  console.log(`Done. Processed ${seeded} clubs.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
