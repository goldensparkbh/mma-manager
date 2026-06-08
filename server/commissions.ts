import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";

export async function getCommissionRules(tenantId: string) {
  const result = await query("SELECT * FROM coach_commission_rules WHERE tenant_id = $1", [tenantId]);
  if (!result.rows[0]) {
    return { tenantId, commissionType: "percent", rate: 10, applyTo: "sessions" };
  }
  return toCamelCase(result.rows[0]);
}

export async function updateCommissionRules(tenantId: string, updates: Record<string, unknown>) {
  await query(
    `INSERT INTO coach_commission_rules (tenant_id, commission_type, rate, apply_to, updated_at)
     VALUES ($1,$2,$3,$4,NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       commission_type = EXCLUDED.commission_type,
       rate = EXCLUDED.rate,
       apply_to = EXCLUDED.apply_to,
       updated_at = NOW()`,
    [
      tenantId,
      updates.commissionType || "percent",
      updates.rate ?? 10,
      updates.applyTo || "sessions",
    ],
  );
  return getCommissionRules(tenantId);
}

export async function calculateCommissions(tenantId: string, month: string) {
  const rules = await getCommissionRules(tenantId);
  const rate = Number((rules as { rate: number }).rate);
  const type = (rules as { commissionType: string }).commissionType;

  const coaches = await query(
    `SELECT c.id, c.name, COUNT(cs.id)::int AS session_count
     FROM coaches c
     LEFT JOIN class_sessions cs ON cs.coach_id = c.id AND cs.tenant_id = $1
       AND cs.starts_at >= $2::date AND cs.starts_at < ($2::date + INTERVAL '1 month')
       AND cs.status IN ('scheduled','completed')
     WHERE c.tenant_id = $1 AND c.is_active = true
     GROUP BY c.id, c.name`,
    [tenantId, month],
  );

  const entries = [];
  for (const row of coaches.rows) {
    const sessions = row.session_count as number;
    if (!sessions) continue;
    const amount = type === "flat" ? rate * sessions : (rate / 100) * sessions * 50;
    await query(
      "DELETE FROM coach_commission_entries WHERE tenant_id = $1 AND coach_id = $2 AND period_month = $3::date",
      [tenantId, row.id, month],
    );
    await query(
      `INSERT INTO coach_commission_entries (tenant_id, coach_id, amount, source_type, description, period_month)
       VALUES ($1,$2,$3,'sessions',$4,$5::date)`,
      [tenantId, row.id, amount, `${sessions} sessions`, month],
    );
    entries.push({ coachId: row.id, coachName: row.name, sessions, amount });
  }

  return { month, rules, entries };
}

export async function getCommissionReport(tenantId: string, from: string, to: string) {
  const result = await query(
    `SELECT e.*, c.name AS coach_name FROM coach_commission_entries e
     JOIN coaches c ON c.id = e.coach_id
     WHERE e.tenant_id = $1 AND e.period_month >= $2::date AND e.period_month <= $3::date
     ORDER BY e.period_month DESC, c.name`,
    [tenantId, from, to],
  );
  return rowsToCamel(result.rows);
}
