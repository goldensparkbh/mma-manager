/**
 * Geocode tenants that have a location address but no latitude/longitude.
 * Run: npm run db:geocode:clubs
 */
import "../server/load-env.js";
import { pool, query } from "../server/db/index.js";
import * as data from "../server/data.js";
import { geocodeAddress, sleep } from "../server/googlePlaces.js";

async function main() {
  const r = await query(
    `SELECT ts.tenant_id, ts.location, ts.country, t.name
     FROM tenant_settings ts
     INNER JOIN tenants t ON t.id = ts.tenant_id
     WHERE ts.location IS NOT NULL AND TRIM(ts.location) <> ''
       AND (ts.latitude IS NULL OR ts.longitude IS NULL)
     ORDER BY t.name`,
  );

  console.log(`Found ${r.rows.length} clubs to geocode`);
  let updated = 0;

  for (const row of r.rows) {
    const tenantId = row.tenant_id as string;
    const location = row.location as string;
    const country = (row.country as string) || undefined;
    const name = row.name as string;

    try {
      const geo = await geocodeAddress(location, country);
      if (!geo) {
        console.log(`  no result: ${name}`);
        continue;
      }
      await data.updateSettings(tenantId, {
        latitude: geo.latitude,
        longitude: geo.longitude,
        city: geo.city,
        country: geo.country || country,
        location: geo.formattedAddress || location,
      });
      updated++;
      console.log(`  geocoded: ${name} → ${geo.latitude}, ${geo.longitude}`);
      await sleep(150);
    } catch (err) {
      console.error(`  error: ${name}`, (err as Error).message);
    }
  }

  console.log(`Done. Updated ${updated}/${r.rows.length}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
