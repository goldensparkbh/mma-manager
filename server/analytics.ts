import { query } from "./db/index.js";

export async function getAnalytics(tenantId: string, from: string, to: string, branchId?: string) {
  const branchClause = branchId ? " AND cs.branch_id = $4" : "";
  const branchParams = branchId ? [tenantId, from, to, branchId] : [tenantId, from, to];

  const utilization = await query(
    `SELECT cs.name, cs.starts_at::date AS day,
            cs.capacity,
            COUNT(b.id) FILTER (WHERE b.status IN ('confirmed','attended'))::int AS booked,
            ROUND(100.0 * COUNT(b.id) FILTER (WHERE b.status IN ('confirmed','attended')) / NULLIF(cs.capacity,0), 1) AS fill_rate
     FROM class_sessions cs
     LEFT JOIN bookings b ON b.session_id = cs.id
     WHERE cs.tenant_id = $1 AND cs.starts_at >= $2 AND cs.starts_at <= $3
       AND cs.status = 'scheduled'${branchClause}
     GROUP BY cs.id, cs.name, cs.starts_at, cs.capacity
     ORDER BY cs.starts_at DESC LIMIT 50`,
    branchParams,
  );

  const coachRevenue = await query(
    `SELECT c.name AS coach_name, c.id AS coach_id,
            COUNT(DISTINCT cs.id)::int AS sessions,
            COALESCE(SUM(mp.amount) FILTER (WHERE mp.status = 'captured'), 0)::numeric AS revenue
     FROM coaches c
     LEFT JOIN class_sessions cs ON cs.coach_id = c.id AND cs.tenant_id = $1 AND cs.starts_at >= $2 AND cs.starts_at <= $3
     LEFT JOIN bookings b ON b.session_id = cs.id AND b.status IN ('confirmed','attended')
     LEFT JOIN member_payments mp ON mp.tenant_id = $1 AND mp.status = 'captured' AND mp.paid_at >= $2::timestamptz AND mp.paid_at <= $3::timestamptz
     WHERE c.tenant_id = $1 AND c.is_active = true
     GROUP BY c.id, c.name ORDER BY revenue DESC`,
    [tenantId, from, to],
  );

  const today = new Date().toISOString().split("T")[0];
  const churn = await query(
    `SELECT COUNT(*)::int AS expired_last_30,
            COUNT(*) FILTER (WHERE status = 'active')::int AS active_now
     FROM subscriptions
     WHERE tenant_id = $1 AND end_date >= ($2::date - INTERVAL '30 days') AND end_date <= $3::date`,
    [tenantId, today, today],
  );

  const packageBreakdown = await query(
    `SELECT plan_name, COUNT(*)::int AS count, SUM(amount)::numeric AS revenue
     FROM subscriptions
     WHERE tenant_id = $1 AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
     GROUP BY plan_name ORDER BY revenue DESC`,
    [tenantId, from, to],
  );

  const avgFill = utilization.rows.length
    ? utilization.rows.reduce((s, r) => s + Number(r.fill_rate || 0), 0) / utilization.rows.length
    : 0;

  return {
    classUtilization: utilization.rows,
    coachRevenue: coachRevenue.rows,
    churn: churn.rows[0] || { expired_last_30: 0, active_now: 0 },
    packageBreakdown: packageBreakdown.rows,
    summary: {
      avgFillRate: Math.round(avgFill * 10) / 10,
      totalSessions: utilization.rows.length,
    },
  };
}
