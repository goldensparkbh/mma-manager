/**
 * Import sports clubs from Google Places across GCC countries.
 *
 * Requires: GOOGLE_PLACES_API_KEY in .env (Places API + Geocoding enabled)
 *
 * Run: npm run db:import:places
 * Options:
 *   PLACES_MAX_PAGES=3        — pages per search query (default 3)
 *   PLACES_COUNTRY=BH         — limit to one country code
 *   PLACES_SKIP_DETAILS=1     — skip place details calls (faster, less data)
 */
import "../server/load-env.js";
import { pool, query } from "../server/db/index.js";
import * as data from "../server/data.js";
import * as bookings from "../server/bookings.js";
import {
  GCC_IMPORT_REGIONS,
  PLACE_SEARCH_QUERIES,
  CLUB_TYPE_COLORS,
  getPlaceDetails,
  inferClubTypes,
  sleep,
  textSearchPlaces,
} from "../server/googlePlaces.js";

const EMAIL_DOMAIN = "@places.nawady.app";
const PASSWORD = "PlacesImport123!";
const maxPages = Math.min(parseInt(process.env.PLACES_MAX_PAGES || "3", 10), 3);
const skipDetails = process.env.PLACES_SKIP_DETAILS === "1";
const countryFilter = process.env.PLACES_COUNTRY?.toUpperCase();

function slugKey(name: string, placeId: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return `${base}-${placeId.slice(-8)}`;
}

function logoUrl(clubType: string) {
  return `/club-types/${clubType}.png`;
}

async function placeExists(placeId: string): Promise<boolean> {
  const r = await query("SELECT 1 FROM tenant_settings WHERE google_place_id = $1 LIMIT 1", [placeId]);
  return r.rows.length > 0;
}

async function importPlace(
  place: Awaited<ReturnType<typeof getPlaceDetails>>,
  searchClubType: string,
): Promise<"imported" | "skipped"> {
  if (!place) return "skipped";
  if (await placeExists(place.placeId)) {
    console.log(`  skip (exists): ${place.name}`);
    return "skipped";
  }

  const sportTypes = inferClubTypes(place.name, place.types, searchClubType);
  const clubType = sportTypes[0] || searchClubType || "hybrid";
  const key = slugKey(place.name, place.placeId);
  const email = `places+${key}${EMAIL_DOMAIN}`;
  const color = CLUB_TYPE_COLORS[clubType] || "#3b82f6";

  const { tenant } = await data.provisionTenant({
    clubName: place.name,
    email,
    password: PASSWORD,
    adminName: `${place.name} Admin`,
    phone: place.phone,
    clubType,
    planSlug: "free",
  });
  const tenantId = tenant.id as string;

  await data.updateSettings(tenantId, {
    name: place.name,
    phone: place.phone || null,
    location: place.address,
    city: place.city || null,
    country: place.country || null,
    latitude: place.latitude,
    longitude: place.longitude,
    clubType,
    sportTypeIds: sportTypes.filter((s) => s !== clubType),
    googlePlaceId: place.placeId,
    logoUrlLight: logoUrl(clubType),
    logoUrlDark: logoUrl(clubType),
    managerEmail: email,
    socials: {
      facebook: "",
      instagram: "",
      twitter: "",
      website: place.website || "",
    },
    operatingHours: place.openingHours || undefined,
  });

  await bookings.updateBookingSettings(tenantId, {
    portalEnabled: true,
    appDirectoryEnabled: true,
    portalPrimaryColor: color,
    portalWelcomeMessage: `Welcome to ${place.name}`,
    publicSlug: tenant.slug as string,
  });

  console.log(`  imported: ${place.name} (${place.country || "?"})`);
  return "imported";
}

async function main() {
  console.log("Google Places import starting...");
  const regions = GCC_IMPORT_REGIONS.filter((r) => !countryFilter || r.country === countryFilter);
  const seenPlaceIds = new Set<string>();
  let imported = 0;
  let skipped = 0;

  for (const region of regions) {
    for (const city of region.cities) {
      for (const { clubType, query: sportQuery } of PLACE_SEARCH_QUERIES) {
        const searchText = `${sportQuery} in ${city}, ${region.countryName}`;
        console.log(`\nSearch: ${searchText}`);

        let pageToken: string | undefined;
        for (let page = 0; page < maxPages; page++) {
          if (page > 0 && pageToken) await sleep(2200);
          const { results, nextPageToken } = await textSearchPlaces(searchText, {
            pagetoken: pageToken,
            region: region.country,
          });
          pageToken = nextPageToken;

          for (const hit of results) {
            if (seenPlaceIds.has(hit.placeId)) continue;
            seenPlaceIds.add(hit.placeId);

            let detail = hit;
            if (!skipDetails) {
              await sleep(120);
              const full = await getPlaceDetails(hit.placeId);
              if (full) detail = full;
            }

            const result = await importPlace(
              {
                ...detail,
                city: "city" in detail ? (detail as { city?: string }).city : city,
                country: region.country,
              },
              clubType,
            );
            if (result === "imported") imported++;
            else skipped++;
          }

          if (!nextPageToken) break;
        }
        await sleep(300);
      }
    }
  }

  console.log(`\nDone. Imported ${imported}, skipped ${skipped}, unique places ${seenPlaceIds.size}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
