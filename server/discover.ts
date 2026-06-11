import { query } from "./db/index.js";
import { resolvePublicAssetUrl } from "./publicUrl.js";
import { toCamelCase } from "./utils.js";
import * as bookings from "./bookings.js";
import * as data from "./data.js";

export type DiscoverClub = {
  id: string;
  name: string;
  slug: string;
  portalSlug: string;
  clubType: string;
  location?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  welcomeMessage?: string | null;
  upcomingClassCount: number;
  nextClassAt?: string | null;
};

export async function listDiscoverableClubs(params: {
  q?: string;
  clubType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ clubs: DiscoverClub[]; total: number }> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);
  const conditions = [
    "bs.portal_enabled = true",
    "COALESCE(bs.app_directory_enabled, true) = true",
    "t.status IN ('active', 'trial')",
  ];
  const values: unknown[] = [];
  let idx = 1;

  if (params.q?.trim()) {
    conditions.push(
      `(t.name ILIKE $${idx} OR COALESCE(ts.location, '') ILIKE $${idx} OR COALESCE(bs.public_slug, t.slug) ILIKE $${idx})`,
    );
    values.push(`%${params.q.trim()}%`);
    idx++;
  }
  if (params.clubType?.trim()) {
    conditions.push(`COALESCE(ts.club_type, 'hybrid') = $${idx}`);
    values.push(params.clubType.trim());
    idx++;
  }

  const where = conditions.join(" AND ");
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM tenants t
     INNER JOIN tenant_booking_settings bs ON bs.tenant_id = t.id
     LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
     WHERE ${where}`,
    values,
  );
  const total = (countResult.rows[0]?.total as number) ?? 0;

  values.push(limit, offset);
  const result = await query(
    `SELECT
       t.id,
       t.name,
       t.slug,
       COALESCE(bs.public_slug, t.slug) AS portal_slug,
       COALESCE(ts.club_type, 'hybrid') AS club_type,
       ts.location,
       ts.phone,
       ts.logo_url_light,
       ts.logo_url_dark,
       bs.portal_primary_color,
       bs.portal_welcome_message,
       (
         SELECT COUNT(*)::int FROM class_sessions cs
         WHERE cs.tenant_id = t.id AND cs.starts_at > NOW() AND cs.status = 'scheduled'
       ) AS upcoming_class_count,
       (
         SELECT MIN(cs.starts_at) FROM class_sessions cs
         WHERE cs.tenant_id = t.id AND cs.starts_at > NOW() AND cs.status = 'scheduled'
       ) AS next_class_at
     FROM tenants t
     INNER JOIN tenant_booking_settings bs ON bs.tenant_id = t.id
     LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
     WHERE ${where}
     ORDER BY upcoming_class_count DESC, t.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values,
  );

  const clubs = result.rows.map((row) => {
    const c = toCamelCase(row) as Record<string, unknown>;
    return {
      id: c.id as string,
      name: c.name as string,
      slug: c.slug as string,
      portalSlug: c.portalSlug as string,
      clubType: (c.clubType as string) || "hybrid",
      location: c.location as string | null,
      phone: c.phone as string | null,
      logoUrl: resolvePublicAssetUrl(
        (c.logoUrlLight as string) || (c.logoUrlDark as string) || null,
        c.clubType as string,
      ),
      primaryColor: (c.portalPrimaryColor as string) || "#3b82f6",
      welcomeMessage: c.portalWelcomeMessage as string | null,
      upcomingClassCount: (c.upcomingClassCount as number) ?? 0,
      nextClassAt: c.nextClassAt as string | null,
    } satisfies DiscoverClub;
  });

  return { clubs, total };
}

export async function getDiscoverClubProfile(slug: string) {
  const tenant = await bookings.getTenantByPortalSlug(slug);
  if (!tenant) return null;
  const tenantId = tenant.id as string;
  const bookingSettings = await bookings.getBookingSettings(tenantId);
  if (!bookingSettings.portalEnabled) return null;
  const settings = (await data.getSettings(tenantId)) as Record<string, unknown> | null;
  const portalSlug =
    (bookingSettings.publicSlug as string) || (tenant.slug as string);

  const stats = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM class_sessions cs
        WHERE cs.tenant_id = $1 AND cs.starts_at > NOW() AND cs.status = 'scheduled') AS upcoming_class_count,
       (SELECT COUNT(*)::int FROM members m WHERE m.tenant_id = $1 AND m.status = 'active') AS member_count`,
    [tenantId],
  );
  const row = stats.rows[0] || {};

  return {
    id: tenantId,
    name: tenant.name as string,
    slug: tenant.slug as string,
    portalSlug,
    clubType: (settings?.clubType as string) || "hybrid",
    location: (settings?.location as string | undefined) || null,
    phone: (settings?.phone as string | undefined) || null,
    logoUrl: resolvePublicAssetUrl(
      (settings?.logoUrlLight as string | undefined) || (settings?.logoUrlDark as string | undefined) || null,
      (settings?.clubType as string) || "hybrid",
    ),
    primaryColor: bookingSettings.portalPrimaryColor || "#3b82f6",
    welcomeMessage: bookingSettings.portalWelcomeMessage || null,
    portalEnabled: bookingSettings.portalEnabled,
    upcomingClassCount: (row.upcoming_class_count as number) ?? 0,
    memberCount: (row.member_count as number) ?? 0,
    socials: (settings?.socials as Record<string, string> | undefined) || {},
  };
}

export type DiscoverClassSession = {
  id: string;
  name: string;
  startsAt: string;
  endsAt?: string;
  capacity: number;
  bookedCount?: number;
  coachName?: string | null;
  location?: string | null;
  clubName: string;
  clubSlug: string;
  clubType: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

export async function getDiscoverSchedule(params: {
  q?: string;
  clubType?: string;
  clubSlug?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<DiscoverClassSession[]> {
  const from = params.from || new Date().toISOString();
  const to = params.to || new Date(Date.now() + 14 * 86400000).toISOString();
  const limit = Math.min(Math.max(params.limit ?? 80, 1), 200);
  const conditions = [
    "bs.portal_enabled = true",
    "COALESCE(bs.app_directory_enabled, true) = true",
    "t.status IN ('active', 'trial')",
    "cs.status = 'scheduled'",
    "cs.starts_at >= $1",
    "cs.starts_at <= $2",
  ];
  const values: unknown[] = [from, to];
  let idx = 3;

  if (params.clubSlug?.trim()) {
    conditions.push(`(t.slug = $${idx} OR bs.public_slug = $${idx})`);
    values.push(params.clubSlug.trim());
    idx++;
  }
  if (params.clubType?.trim()) {
    conditions.push(`COALESCE(ts.club_type, 'hybrid') = $${idx}`);
    values.push(params.clubType.trim());
    idx++;
  }
  if (params.q?.trim()) {
    conditions.push(
      `(cs.name ILIKE $${idx} OR COALESCE(cs.coach_name, '') ILIKE $${idx} OR t.name ILIKE $${idx})`,
    );
    values.push(`%${params.q.trim()}%`);
    idx++;
  }

  values.push(limit);
  const result = await query(
    `SELECT
       cs.id, cs.name, cs.starts_at, cs.ends_at, cs.capacity, cs.booked_count,
       cs.coach_name, cs.location,
       t.name AS club_name,
       COALESCE(bs.public_slug, t.slug) AS club_slug,
       COALESCE(ts.club_type, 'hybrid') AS club_type,
       ts.logo_url_light,
       bs.portal_primary_color
     FROM class_sessions cs
     INNER JOIN tenants t ON t.id = cs.tenant_id
     INNER JOIN tenant_booking_settings bs ON bs.tenant_id = t.id
     LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY cs.starts_at ASC
     LIMIT $${idx}`,
    values,
  );

  return result.rows.map((row) => {
    const c = toCamelCase(row) as Record<string, unknown>;
    return {
      id: c.id as string,
      name: c.name as string,
      startsAt: c.startsAt as string,
      endsAt: c.endsAt as string | undefined,
      capacity: (c.capacity as number) ?? 0,
      bookedCount: c.bookedCount as number | undefined,
      coachName: c.coachName as string | null,
      location: c.location as string | null,
      clubName: c.clubName as string,
      clubSlug: c.clubSlug as string,
      clubType: (c.clubType as string) || "hybrid",
      logoUrl: resolvePublicAssetUrl(c.logoUrlLight as string | null, c.clubType as string),
      primaryColor: (c.portalPrimaryColor as string) || "#3b82f6",
    };
  });
}
