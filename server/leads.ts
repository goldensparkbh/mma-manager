import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";

export async function createLead(data: {
  clubName?: string;
  contactName: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
}) {
  const result = await query(
    `INSERT INTO demo_leads (club_name, contact_name, email, phone, message, source)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.clubName || null, data.contactName, data.email, data.phone || null, data.message || null, data.source || "landing"],
  );
  return toCamelCase(result.rows[0]);
}

export async function getLeads(status?: string) {
  const clauses = status ? "WHERE status = $1" : "";
  const values = status ? [status] : [];
  const result = await query(
    `SELECT * FROM demo_leads ${clauses} ORDER BY created_at DESC LIMIT 500`,
    values,
  );
  return rowsToCamel(result.rows);
}

export async function updateLead(id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    status: "status", notes: "notes", convertedTenantId: "converted_tenant_id",
  };
  const fields = ["updated_at = NOW()"];
  const values: unknown[] = [id];
  let idx = 2;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  const result = await query(
    `UPDATE demo_leads SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}
