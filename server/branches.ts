import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";

export async function getBranches(tenantId: string) {
  const result = await query(
    "SELECT * FROM branches WHERE tenant_id = $1 ORDER BY is_default DESC, name",
    [tenantId],
  );
  return rowsToCamel(result.rows);
}

export async function ensureDefaultBranch(tenantId: string) {
  const existing = await query("SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1", [tenantId]);
  if (existing.rows[0]) return existing.rows[0].id as string;
  const settings = await query("SELECT name FROM tenant_settings WHERE tenant_id = $1", [tenantId]);
  const name = (settings.rows[0]?.name as string) || "Main branch";
  const result = await query(
    `INSERT INTO branches (tenant_id, name, is_default, is_active) VALUES ($1,$2,true,true) RETURNING id`,
    [tenantId, name],
  );
  return result.rows[0].id as string;
}

export async function createBranch(tenantId: string, data: Record<string, unknown>) {
  if (data.isDefault) {
    await query("UPDATE branches SET is_default = false WHERE tenant_id = $1", [tenantId]);
  }
  const result = await query(
    `INSERT INTO branches (tenant_id, name, address, phone, is_default, is_active)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [tenantId, data.name, data.address || null, data.phone || null, data.isDefault ?? false, data.isActive ?? true],
  );
  return toCamelCase(result.rows[0]);
}

export async function updateBranch(tenantId: string, id: string, updates: Record<string, unknown>) {
  if (updates.isDefault) {
    await query("UPDATE branches SET is_default = false WHERE tenant_id = $1", [tenantId]);
  }
  const map: Record<string, string> = {
    name: "name", address: "address", phone: "phone", isDefault: "is_default", isActive: "is_active",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (!fields.length) return null;
  const result = await query(
    `UPDATE branches SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    values,
  );
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function deleteBranch(tenantId: string, id: string) {
  const def = await query("SELECT id FROM branches WHERE tenant_id = $1 AND is_default = true", [tenantId]);
  if (def.rows[0]?.id === id) throw new Error("Cannot delete the default branch");
  await query("UPDATE members SET branch_id = NULL WHERE tenant_id = $1 AND branch_id = $2", [tenantId, id]);
  await query("UPDATE class_sessions SET branch_id = NULL WHERE tenant_id = $1 AND branch_id = $2", [tenantId, id]);
  await query("DELETE FROM branches WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}
