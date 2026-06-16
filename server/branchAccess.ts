import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";

export type BranchAccessScope = "home_branch" | "same_country" | "all_branches";

export type BranchRow = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  country?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
};

export async function getBranchAccessScope(tenantId: string): Promise<BranchAccessScope> {
  const result = await query(
    "SELECT branch_access_scope FROM tenant_settings WHERE tenant_id = $1",
    [tenantId],
  );
  const scope = result.rows[0]?.branch_access_scope as string;
  if (scope === "same_country" || scope === "all_branches") return scope;
  return "home_branch";
}

async function getTenantCountry(tenantId: string): Promise<string | null> {
  const result = await query("SELECT country FROM tenant_settings WHERE tenant_id = $1", [tenantId]);
  const country = result.rows[0]?.country as string | undefined;
  return country?.trim().toUpperCase() || null;
}

function branchCountry(branch: BranchRow, fallback: string | null): string | null {
  const c = (branch.country as string | undefined)?.trim().toUpperCase();
  return c || fallback;
}

export async function getActiveBranches(tenantId: string): Promise<BranchRow[]> {
  const result = await query(
    "SELECT * FROM branches WHERE tenant_id = $1 AND is_active = true ORDER BY is_default DESC, name",
    [tenantId],
  );
  return rowsToCamel(result.rows) as BranchRow[];
}

export async function getMemberHomeBranch(tenantId: string, memberId: string): Promise<BranchRow | null> {
  const result = await query(
    `SELECT b.* FROM members m
     LEFT JOIN branches b ON b.id = m.branch_id AND b.tenant_id = m.tenant_id
     WHERE m.tenant_id = $1 AND m.id = $2`,
    [tenantId, memberId],
  );
  if (result.rows[0]?.id) return toCamelCase(result.rows[0]) as BranchRow;

  const def = await query(
    "SELECT * FROM branches WHERE tenant_id = $1 AND is_default = true AND is_active = true LIMIT 1",
    [tenantId],
  );
  return def.rows[0] ? (toCamelCase(def.rows[0]) as BranchRow) : null;
}

export async function resolveRegistrationBranchId(
  tenantId: string,
  branchId?: string | null,
): Promise<string | null> {
  const { ensureDefaultBranch } = await import("./branches.js");
  if (branchId) {
    const check = await query(
      "SELECT id FROM branches WHERE tenant_id = $1 AND id = $2 AND is_active = true",
      [tenantId, branchId],
    );
    if (check.rows[0]) return branchId;
  }
  return ensureDefaultBranch(tenantId);
}

export async function getMemberBranchAccess(tenantId: string, memberId: string) {
  const scope = await getBranchAccessScope(tenantId);
  const tenantCountry = await getTenantCountry(tenantId);
  const allBranches = await getActiveBranches(tenantId);
  const homeBranch = await getMemberHomeBranch(tenantId, memberId);

  let accessibleBranches: BranchRow[];
  if (scope === "all_branches") {
    accessibleBranches = allBranches;
  } else if (scope === "same_country") {
    const homeCountry = homeBranch ? branchCountry(homeBranch, tenantCountry) : tenantCountry;
    accessibleBranches = allBranches.filter((b) => {
      const bc = branchCountry(b, tenantCountry);
      return homeCountry && bc && bc === homeCountry;
    });
    if (!accessibleBranches.length && homeBranch) accessibleBranches = [homeBranch];
  } else {
    accessibleBranches = homeBranch ? [homeBranch] : allBranches.slice(0, 1);
  }

  return {
    scope,
    homeBranch,
    accessibleBranches,
  };
}

export async function memberCanAccessBranch(
  tenantId: string,
  memberId: string,
  branchId: string,
): Promise<boolean> {
  const access = await getMemberBranchAccess(tenantId, memberId);
  return access.accessibleBranches.some((b) => b.id === branchId);
}
