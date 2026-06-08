import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";
import { hashPassword } from "./auth.js";

export async function getFamilies(tenantId: string) {
  const result = await query(
    `SELECT f.*, COUNT(fm.member_id)::int AS member_count
     FROM families f
     LEFT JOIN family_members fm ON fm.family_id = f.id
     WHERE f.tenant_id = $1
     GROUP BY f.id ORDER BY f.name`,
    [tenantId],
  );
  return rowsToCamel(result.rows);
}

export async function getFamily(tenantId: string, familyId: string) {
  const fam = await query("SELECT * FROM families WHERE tenant_id = $1 AND id = $2", [tenantId, familyId]);
  if (!fam.rows[0]) return null;
  const members = await query(
    `SELECT m.id, m.name, m.phone, fm.relationship
     FROM family_members fm JOIN members m ON m.id = fm.member_id
     WHERE fm.family_id = $1`,
    [familyId],
  );
  return { ...toCamelCase(fam.rows[0]), members: rowsToCamel(members.rows) };
}

export async function createFamily(tenantId: string, data: { name: string; memberIds?: string[]; primaryMemberId?: string }) {
  const result = await query(
    `INSERT INTO families (tenant_id, name, primary_member_id) VALUES ($1,$2,$3) RETURNING *`,
    [tenantId, data.name, data.primaryMemberId || data.memberIds?.[0] || null],
  );
  const family = result.rows[0];
  for (const memberId of data.memberIds || []) {
    await query(
      `INSERT INTO family_members (family_id, member_id, relationship)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [family.id, memberId, memberId === data.primaryMemberId ? "primary" : "member"],
    );
  }
  return toCamelCase(family);
}

export async function addFamilyMember(tenantId: string, familyId: string, memberId: string, relationship = "member") {
  const fam = await query("SELECT id FROM families WHERE tenant_id = $1 AND id = $2", [tenantId, familyId]);
  if (!fam.rows[0]) throw new Error("Family not found");
  await query(
    `INSERT INTO family_members (family_id, member_id, relationship) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [familyId, memberId, relationship],
  );
}

export async function enableFamilyPortalAccess(
  tenantId: string,
  familyId: string,
  phone: string,
  password: string,
) {
  const family = await getFamily(tenantId, familyId);
  if (!family) throw new Error("Family not found");
  const members = (family as { members: { id: string }[] }).members;
  if (!members.length) throw new Error("Family has no members");

  const primaryId = (family as { primaryMemberId?: string }).primaryMemberId || members[0].id;
  const hash = await hashPassword(password);
  const normalized = phone.replace(/\s+/g, "");

  const existing = await query(
    "SELECT id FROM member_accounts WHERE tenant_id = $1 AND REPLACE(phone,' ','') = $2",
    [tenantId, normalized],
  );

  let accountId: string;
  if (existing.rows[0]) {
    accountId = existing.rows[0].id as string;
    await query("UPDATE member_accounts SET password_hash = $2, is_active = true WHERE id = $1", [accountId, hash]);
  } else {
    const member = await query("SELECT name, email FROM members WHERE id = $1", [primaryId]);
    const ins = await query(
      `INSERT INTO member_accounts (tenant_id, member_id, phone, email, password_hash, is_active)
       VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
      [tenantId, primaryId, normalized, member.rows[0]?.email || null, hash],
    );
    accountId = ins.rows[0].id as string;
  }

  for (const m of members) {
    await query(
      `UPDATE member_accounts SET member_id = $2 WHERE id = $1 AND tenant_id = $3`,
      [accountId, primaryId, tenantId],
    );
    break;
  }

  return { accountId, familyId, memberIds: members.map((m) => m.id) };
}

export async function getFamilyMembersForAccount(tenantId: string, memberId: string) {
  const result = await query(
    `SELECT m.id, m.name, m.phone, fm.family_id, fm.relationship
     FROM family_members fm
     JOIN members m ON m.id = fm.member_id
     WHERE fm.family_id IN (
       SELECT family_id FROM family_members WHERE member_id = $1
     ) AND m.tenant_id = $2`,
    [memberId, tenantId],
  );
  return rowsToCamel(result.rows);
}
