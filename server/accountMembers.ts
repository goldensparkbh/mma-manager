import { query } from "./db/index.js";
import * as data from "./data.js";
import { addFamilyMember, createFamily } from "./families.js";
import { assertMemberFullName } from "../shared/memberNameValidation.js";

export type PortalAccountMember = {
  id: string;
  name: string;
  age: number | null;
  memberUntil: string | null;
  hasActiveSubscription: boolean;
  planName: string | null;
  packageType: string | null;
  sessionsRemaining: number | null;
  checkInUrl: string | null;
};

function pickActiveSubscription(subs: Record<string, unknown>[]) {
  const today = new Date().toISOString().split("T")[0];
  return (
    subs.find((s) => {
      return (
        s.status !== "cancelled" &&
        s.status !== "expired" &&
        String(s.startDate) <= today &&
        String(s.endDate) >= today &&
        (s.packageType !== "sessions" || (Number(s.sessionsRemaining) || 0) > 0)
      );
    }) || null
  );
}

export async function ensureMemberFamily(tenantId: string, memberId: string): Promise<string> {
  const existing = await query(`SELECT family_id FROM family_members WHERE member_id = $1 LIMIT 1`, [memberId]);
  if (existing.rows[0]?.family_id) return existing.rows[0].family_id as string;

  const member = await data.getMember(tenantId, memberId);
  const name = ((member as { name?: string } | null)?.name || "Family").trim();
  const family = await createFamily(tenantId, {
    name: `${name} family`,
    memberIds: [memberId],
    primaryMemberId: memberId,
  });
  return (family as { id: string }).id;
}

export async function getAccountMemberIds(tenantId: string, memberId: string, accountPhone?: string): Promise<string[]> {
  await ensureMemberFamily(tenantId, memberId);

  const familyResult = await query(
    `SELECT m.id
     FROM family_members fm
     JOIN members m ON m.id = fm.member_id
     WHERE fm.family_id IN (SELECT family_id FROM family_members WHERE member_id = $1)
       AND m.tenant_id = $2`,
    [memberId, tenantId],
  );

  const ids = new Set<string>([memberId]);
  for (const row of familyResult.rows) ids.add(row.id as string);

  const normalized = accountPhone?.replace(/\s+/g, "");
  if (normalized) {
    const phoneResult = await query(
      `SELECT id FROM members WHERE tenant_id = $1 AND REPLACE(COALESCE(phone, ''), ' ', '') = $2`,
      [tenantId, normalized],
    );
    for (const row of phoneResult.rows) ids.add(row.id as string);
  }

  return Array.from(ids);
}

export async function assertAccountMemberAccess(
  tenantId: string,
  accountMemberId: string,
  accountPhone: string | undefined,
  targetMemberId: string,
): Promise<void> {
  const allowed = await getAccountMemberIds(tenantId, accountMemberId, accountPhone);
  if (!allowed.includes(targetMemberId)) throw new Error("Member not in your account");
}

export async function getPortalAccountMembers(
  tenantId: string,
  memberId: string,
  accountPhone: string | undefined,
  slug: string,
): Promise<PortalAccountMember[]> {
  const ids = await getAccountMemberIds(tenantId, memberId, accountPhone);
  if (!ids.length) return [];

  const { ensureMemberQrToken } = await import("./checkin.js");
  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  const members: PortalAccountMember[] = [];

  for (const id of ids) {
    const member = await data.getMember(tenantId, id);
    if (!member) continue;
    const m = member as Record<string, unknown>;
    const subs = await data.getSubscriptionsByMember(tenantId, id);
    const active = pickActiveSubscription(subs);
    const memberUntil =
      (active?.endDate as string | undefined) ||
      (m.subscriptionEnd as string | undefined) ||
      null;
    const hasActive = !!active;
    let checkInUrl: string | null = null;
    if (hasActive) {
      const token = await ensureMemberQrToken(tenantId, id);
      checkInUrl = `${baseUrl}/checkin/${slug}?t=${token}`;
    }

    members.push({
      id: id,
      name: String(m.name || ""),
      age: m.age != null ? Number(m.age) : null,
      memberUntil,
      hasActiveSubscription: hasActive,
      planName: (active?.planName as string) || null,
      packageType: (active?.packageType as string) || null,
      sessionsRemaining: active?.sessionsRemaining != null ? Number(active.sessionsRemaining) : null,
      checkInUrl,
    });
  }

  members.sort((a, b) => {
    if (a.hasActiveSubscription !== b.hasActiveSubscription) return a.hasActiveSubscription ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return members;
}

export async function addPortalAccountMember(
  tenantId: string,
  accountMemberId: string,
  accountPhone: string | undefined,
  input: { name: string; age?: number | null },
): Promise<{ id: string; name: string }> {
  const name = input.name?.trim();
  if (!name) throw new Error("Name is required");
  assertMemberFullName(name);

  const familyId = await ensureMemberFamily(tenantId, accountMemberId);
  const phone = accountPhone?.replace(/\s+/g, "") || "";

  const accountMember = await data.getMember(tenantId, accountMemberId);
  const homeBranchId = (accountMember as { branchId?: string | null } | null)?.branchId || null;

  const member = await data.createMember(tenantId, {
    name,
    phone: phone || `family-${Date.now()}`,
    age: input.age ?? null,
    status: "inactive",
    branchId: homeBranchId,
  });

  await addFamilyMember(tenantId, familyId, member.id as string, "member");

  return { id: member.id as string, name };
}

export async function resolveCheckoutMemberId(
  tenantId: string,
  accountMemberId: string,
  accountPhone: string | undefined,
  opts: { memberId?: string; newMember?: { name: string; age?: number | null } },
): Promise<string> {
  if (opts.newMember?.name?.trim()) {
    const created = await addPortalAccountMember(tenantId, accountMemberId, accountPhone, opts.newMember);
    return created.id;
  }
  const targetId = opts.memberId || accountMemberId;
  await assertAccountMemberAccess(tenantId, accountMemberId, accountPhone, targetId);
  return targetId;
}

export async function getAccountPhoneForMember(tenantId: string, accountId: string): Promise<string | undefined> {
  const result = await query(
    `SELECT phone FROM member_accounts WHERE tenant_id = $1 AND id = $2`,
    [tenantId, accountId],
  );
  const phone = result.rows[0]?.phone as string | undefined;
  return phone?.replace(/\s+/g, "");
}
