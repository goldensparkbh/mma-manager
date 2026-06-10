import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase, formatDate, formatTimestamp, uniqueSlug } from "./utils.js";
import { hashPassword, comparePassword } from "./auth.js";
import { createTapCharge, getAppBaseUrl, isTapChargeSuccessful, isTapConfigured, retrieveTapCharge } from "./tap.js";
import { sendPaymentInvoiceEmail, sendTrialExpiredEmail, sendTrialReminderEmail } from "./email.js";
import { PLATFORM_ROLE_PRESETS } from "../shared/platformPermissions.js";
import {
  getClubTypeTemplate,
  parseProgressionConfig,
  parseModuleConfig,
  parseMemberFieldConfig,
} from "../shared/clubTypes.js";

async function logActivity(
  tenantId: string,
  entry: { action: string; entityType: string; entityId?: string; description?: string; metadata?: string },
) {
  await query(
    `INSERT INTO activity_logs (tenant_id, action, entity_type, entity_id, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, entry.action, entry.entityType, entry.entityId || null, entry.description || null, entry.metadata || null],
  );
}

export async function getNextMemberId(tenantId: string): Promise<string> {
  const result = await query(
    `INSERT INTO tenant_counters (tenant_id, member_count)
     VALUES ($1, 1001)
     ON CONFLICT (tenant_id) DO UPDATE SET member_count = tenant_counters.member_count + 1
     RETURNING member_count`,
    [tenantId],
  );
  return String(result.rows[0].member_count);
}

// ─── Members ───────────────────────────────────────────────────────────────

export async function getMembers(tenantId: string) {
  const result = await query("SELECT * FROM members WHERE tenant_id = $1 ORDER BY created_at DESC", [tenantId]);
  return rowsToCamel(result.rows);
}

export async function getMember(tenantId: string, id: string) {
  const result = await query("SELECT * FROM members WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function createMember(tenantId: string, data: Record<string, unknown>) {
  const memberId = await getNextMemberId(tenantId);
  const result = await query(
    `INSERT INTO members (tenant_id, member_id, name, first_name, father_name, last_name, cpr, phone, email,
      dob, gender, age, height, weight, blood_type, belt_size, suit_size, health_notes,
      subscription_start, subscription_end, status, balance, image_url, documents, custom_fields, branch_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     RETURNING *`,
    [
      tenantId, memberId, data.name, data.firstName || null, data.fatherName || null, data.lastName || null,
      data.cpr || null, data.phone, data.email || null, data.dob || null, data.gender || null,
      data.age || null, data.height || null, data.weight || null, data.bloodType || null,
      data.beltSize || null, data.suitSize || null, data.healthNotes || null,
      data.subscriptionStart || null, data.subscriptionEnd || null,
      data.status || "inactive", data.balance ?? 0, data.imageUrl || null,
      JSON.stringify(data.documents || []),
      JSON.stringify(data.customFields || {}),
      data.branchId || null,
    ],
  );
  const member = toCamelCase(result.rows[0]);
  await logActivity(tenantId, { action: "member.create", entityType: "member", entityId: member.id as string, description: `Member created: ${data.name}` });
  return member;
}

export async function updateMember(tenantId: string, id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  const map: Record<string, string> = {
    name: "name", firstName: "first_name", fatherName: "father_name", lastName: "last_name",
    cpr: "cpr", phone: "phone", email: "email", dob: "dob", gender: "gender", age: "age",
    height: "height", weight: "weight", bloodType: "blood_type", beltSize: "belt_size",
    suitSize: "suit_size", healthNotes: "health_notes", subscriptionStart: "subscription_start",
    subscriptionEnd: "subscription_end", status: "status", balance: "balance", imageUrl: "image_url",
    documents: "documents",
    customFields: "custom_fields",
    branchId: "branch_id",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx++}`);
      values.push(key === "documents" || key === "customFields" ? JSON.stringify(updates[key]) : updates[key]);
    }
  }
  if (fields.length === 0) return;
  await query(`UPDATE members SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
  await logActivity(tenantId, { action: "member.update", entityType: "member", entityId: id, description: "Member updated" });
}

export async function deleteMember(tenantId: string, id: string) {
  await query("DELETE FROM members WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
  await logActivity(tenantId, { action: "member.delete", entityType: "member", entityId: id, description: "Member deleted" });
}

// ─── Attendance ────────────────────────────────────────────────────────────

export async function getAttendanceByDate(tenantId: string, date: string) {
  const result = await query(
    "SELECT * FROM attendance WHERE tenant_id = $1 AND date = $2 ORDER BY check_in DESC",
    [tenantId, date],
  );
  return rowsToCamel(result.rows);
}

export async function getAllAttendance(tenantId: string) {
  const result = await query("SELECT * FROM attendance WHERE tenant_id = $1 ORDER BY date DESC", [tenantId]);
  return rowsToCamel(result.rows);
}

export async function getAttendanceByMember(tenantId: string, memberIds: string[]) {
  if (memberIds.length === 0) return [];
  const result = await query(
    "SELECT * FROM attendance WHERE tenant_id = $1 AND member_id = ANY($2) ORDER BY date DESC",
    [tenantId, memberIds],
  );
  return rowsToCamel(result.rows);
}

export async function createAttendance(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO attendance (tenant_id, member_id, member_name, date, check_in, check_out, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [tenantId, data.memberId, data.memberName, data.date, data.checkIn || null, data.checkOut || null, data.notes || null],
  );
  await decrementSessionOnAttendance(tenantId, data.memberId as string);
  const { markBookingAttended } = await import("./bookings.js");
  await markBookingAttended(tenantId, data.memberId as string, data.date as string);
  return toCamelCase(result.rows[0]);
}

async function decrementSessionOnAttendance(tenantId: string, memberId: string) {
  const today = new Date().toISOString().split("T")[0];
  const subs = await query(
    `SELECT id, sessions_remaining FROM subscriptions
     WHERE tenant_id = $1 AND member_id = $2 AND package_type = 'sessions'
       AND status != 'cancelled' AND start_date <= $3 AND end_date >= $3
       AND sessions_remaining > 0
     ORDER BY start_date DESC LIMIT 1`,
    [tenantId, memberId, today],
  );
  if (!subs.rows[0]) return;
  const remaining = (subs.rows[0].sessions_remaining as number) - 1;
  await query(
    `UPDATE subscriptions SET sessions_remaining = $3, status = CASE WHEN $3 <= 0 THEN 'expired' ELSE status END
     WHERE tenant_id = $1 AND id = $2`,
    [tenantId, subs.rows[0].id, remaining],
  );
  await syncMemberSubscriptionStatus(tenantId, memberId);
}

export async function deleteAttendance(tenantId: string, id: string) {
  await query("DELETE FROM attendance WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Subscriptions ─────────────────────────────────────────────────────────

export async function getSubscriptions(tenantId: string): Promise<Record<string, unknown>[]> {
  const result = await query("SELECT * FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC", [tenantId]);
  return rowsToCamel<Record<string, unknown>>(result.rows).map((s) => ({
    ...s,
    startDate: formatDate(s.startDate),
    endDate: formatDate(s.endDate),
  }));
}

export async function getSubscriptionsByMember(tenantId: string, memberId: string): Promise<Record<string, unknown>[]> {
  const result = await query(
    "SELECT * FROM subscriptions WHERE tenant_id = $1 AND member_id = $2 ORDER BY start_date DESC",
    [tenantId, memberId],
  );
  return rowsToCamel<Record<string, unknown>>(result.rows).map((s) => ({
    ...s,
    startDate: formatDate(s.startDate),
    endDate: formatDate(s.endDate),
  }));
}

export async function createSubscription(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO subscriptions (tenant_id, member_id, member_name, plan_name, amount, start_date, end_date, status, payment_status, payment_method, package_type, sessions_total, sessions_remaining)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      tenantId, data.memberId, data.memberName, data.planName, data.amount,
      data.startDate, data.endDate, data.status || "active",
      data.paymentStatus || "pending", data.paymentMethod || null,
      data.packageType || "duration", data.sessionsTotal || null, data.sessionsRemaining ?? data.sessionsTotal ?? null,
    ],
  );
  const sub = toCamelCase<Record<string, unknown>>(result.rows[0]);
  await syncMemberSubscriptionStatus(tenantId, data.memberId as string);
  return {
    ...sub,
    startDate: formatDate(sub.startDate),
    endDate: formatDate(sub.endDate),
  } as Record<string, unknown> & { id: string; startDate: string; endDate: string };
}

export async function updateSubscription(tenantId: string, id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  const map: Record<string, string> = {
    planName: "plan_name", amount: "amount", startDate: "start_date", endDate: "end_date",
    status: "status", paymentStatus: "payment_status", paymentMethod: "payment_method",
    packageType: "package_type", sessionsTotal: "sessions_total", sessionsRemaining: "sessions_remaining",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (fields.length > 0) {
    await query(`UPDATE subscriptions SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
  }
  const sub = await query("SELECT member_id FROM subscriptions WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
  if (sub.rows[0]) await syncMemberSubscriptionStatus(tenantId, sub.rows[0].member_id);
}

export async function deleteSubscription(tenantId: string, id: string) {
  const sub = await query("SELECT member_id FROM subscriptions WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
  await query("DELETE FROM subscriptions WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
  if (sub.rows[0]) await syncMemberSubscriptionStatus(tenantId, sub.rows[0].member_id);
}

export async function syncMemberSubscriptionStatus(tenantId: string, memberId: string) {
  const today = new Date().toISOString().split("T")[0];
  const subs = await query(
    `SELECT * FROM subscriptions WHERE tenant_id = $1 AND member_id = $2 ORDER BY start_date DESC`,
    [tenantId, memberId],
  );
  let status = "inactive";
  let subscriptionStart: string | null = null;
  let subscriptionEnd: string | null = null;

  for (const row of subs.rows) {
    const start = formatDate(row.start_date);
    const end = formatDate(row.end_date);
    const isSession = row.package_type === "sessions";
    const sessionsOk = !isSession || (row.sessions_remaining != null && row.sessions_remaining > 0);
    if (start <= today && end >= today && row.status !== "cancelled" && sessionsOk) {
      status = "active";
      subscriptionStart = start;
      subscriptionEnd = end;
      break;
    }
    if (start > today && row.status !== "cancelled") {
      if (!subscriptionStart) { subscriptionStart = start; subscriptionEnd = end; }
      continue;
    }
    if (end < today) {
      status = "expired";
      subscriptionStart = start;
      subscriptionEnd = end;
    }
  }

  const endDate = subscriptionEnd;
  if (endDate) {
    const daysLeft = Math.ceil((new Date(endDate).getTime() - new Date(today).getTime()) / 86400000);
    if (status === "active" && daysLeft <= 10) status = "expiring_soon";
  }

  await query(
    `UPDATE members SET status = $3, subscription_start = $4, subscription_end = $5 WHERE tenant_id = $1 AND id = $2`,
    [tenantId, memberId, status, subscriptionStart, subscriptionEnd],
  );
}

// ─── Packages ──────────────────────────────────────────────────────────────

export async function getPackages(tenantId: string) {
  const result = await query("SELECT * FROM packages WHERE tenant_id = $1 ORDER BY name", [tenantId]);
  return rowsToCamel(result.rows);
}

export async function createPackage(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    "INSERT INTO packages (tenant_id, name, duration, price, package_type, session_count) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [tenantId, data.name, data.duration, data.price, data.packageType || "duration", data.sessionCount || null],
  );
  return toCamelCase(result.rows[0]);
}

export async function updatePackage(tenantId: string, id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  const map: Record<string, string> = {
    name: "name", duration: "duration", price: "price",
    packageType: "package_type", sessionCount: "session_count",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (fields.length > 0) await query(`UPDATE packages SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
}

export async function deletePackage(tenantId: string, id: string) {
  await query("DELETE FROM packages WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Belts ─────────────────────────────────────────────────────────────────

export async function getBelts(tenantId: string) {
  const result = await query("SELECT id, name, color, sort_order AS \"order\" FROM belts WHERE tenant_id = $1 ORDER BY sort_order", [tenantId]);
  return rowsToCamel(result.rows);
}

export async function createBelt(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    "INSERT INTO belts (tenant_id, name, color, sort_order) VALUES ($1,$2,$3,$4) RETURNING id, name, color, sort_order AS \"order\"",
    [tenantId, data.name, data.color, data.order ?? 0],
  );
  return toCamelCase(result.rows[0]);
}

export async function updateBelt(tenantId: string, id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  if ("name" in updates) { fields.push(`name = $${idx++}`); values.push(updates.name); }
  if ("color" in updates) { fields.push(`color = $${idx++}`); values.push(updates.color); }
  if ("order" in updates) { fields.push(`sort_order = $${idx++}`); values.push(updates.order); }
  if (fields.length > 0) await query(`UPDATE belts SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
}

export async function deleteBelt(tenantId: string, id: string) {
  await query("DELETE FROM member_belts WHERE tenant_id = $1 AND belt_id = $2", [tenantId, id]);
  await query("DELETE FROM belts WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

export async function getMemberBelts(tenantId: string, memberId?: string) {
  const sql = memberId
    ? "SELECT * FROM member_belts WHERE tenant_id = $1 AND member_id = $2 ORDER BY awarded_at DESC"
    : "SELECT * FROM member_belts WHERE tenant_id = $1 ORDER BY awarded_at DESC";
  const params = memberId ? [tenantId, memberId] : [tenantId];
  const result = await query(sql, params);
  return rowsToCamel<Record<string, unknown>>(result.rows).map((b) => ({
    ...b,
    awardedAt: formatTimestamp(b.awardedAt),
  }));
}

export async function awardBeltToMember(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    "INSERT INTO member_belts (tenant_id, member_id, belt_id, stripes, awarded_at) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [tenantId, data.memberId, data.beltId, data.stripes ?? 0, data.awardedAt || new Date().toISOString()],
  );
  const belt = toCamelCase(result.rows[0]);
  return { ...belt, awardedAt: formatTimestamp(belt.awardedAt) };
}

export async function revokeMemberBelt(tenantId: string, id: string) {
  await query("DELETE FROM member_belts WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Products ──────────────────────────────────────────────────────────────

export async function getProducts(tenantId: string) {
  const result = await query("SELECT * FROM products WHERE tenant_id = $1 ORDER BY name", [tenantId]);
  return rowsToCamel(result.rows);
}

export async function createProduct(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO products (tenant_id, name, description, price, stock, category, image_url, track_inventory)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [tenantId, data.name, data.description || null, data.price, data.stock ?? 0,
     data.category || "general", data.imageUrl || null, data.trackInventory ?? true],
  );
  return toCamelCase(result.rows[0]);
}

export async function updateProduct(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    name: "name", description: "description", price: "price", stock: "stock",
    category: "category", imageUrl: "image_url", trackInventory: "track_inventory",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (fields.length > 0) await query(`UPDATE products SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
}

export async function deleteProduct(tenantId: string, id: string) {
  await query("DELETE FROM products WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Sales ─────────────────────────────────────────────────────────────────

export async function getSales(tenantId: string): Promise<Record<string, unknown>[]> {
  const result = await query("SELECT * FROM sales WHERE tenant_id = $1 ORDER BY date DESC", [tenantId]);
  return rowsToCamel<Record<string, unknown>>(result.rows).map((s) => ({
    ...s,
    date: formatTimestamp(s.date),
  }));
}

export async function getSalesByMember(tenantId: string, memberId: string) {
  const result = await query(
    "SELECT * FROM sales WHERE tenant_id = $1 AND member_id = $2 ORDER BY date DESC",
    [tenantId, memberId],
  );
  return rowsToCamel<Record<string, unknown>>(result.rows).map((s) => ({
    ...s,
    date: formatTimestamp(s.date),
  }));
}

export async function createSale(tenantId: string, data: Record<string, unknown>) {
  const receiptId = data.receiptId || `RCP-${Date.now()}`;
  const result = await query(
    `INSERT INTO sales (tenant_id, product_id, product_name, quantity, unit_price, total_price,
      member_id, buyer_name, buyer_phone, date, payment_method, payment_status, status, receipt_id, subscription_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      tenantId, data.productId, data.productName, data.quantity ?? 1, data.unitPrice, data.totalPrice,
      data.memberId || null, data.buyerName || null, data.buyerPhone || null,
      data.date || new Date().toISOString(), data.paymentMethod || "cash",
      data.paymentStatus || "paid", data.status || "completed", receiptId, data.subscriptionId || null,
    ],
  );
  if (data.productId && data.productId !== "subscription") {
    await query(
      "UPDATE products SET stock = GREATEST(0, stock - $3) WHERE tenant_id = $1 AND id = $2 AND track_inventory = true",
      [tenantId, data.productId, data.quantity ?? 1],
    );
  }
  const sale = toCamelCase(result.rows[0]);
  return { ...sale, date: formatTimestamp(sale.date) };
}

export async function cancelSale(tenantId: string, id: string, reason: string) {
  const result = await query(
    `UPDATE sales SET status = 'cancelled', cancelled_reason = $3, cancelled_at = NOW()
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [tenantId, id, reason],
  );
  if (!result.rows[0]) return null;
  const sale = toCamelCase(result.rows[0]);
  return { ...sale, date: formatTimestamp(sale.date) };
}

export async function updateSale(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    paymentStatus: "payment_status", paymentMethod: "payment_method", status: "status",
    buyerName: "buyer_name", buyerPhone: "buyer_phone",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (fields.length > 0) await query(`UPDATE sales SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
}

export async function deleteSale(tenantId: string, id: string) {
  await query("DELETE FROM sales WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

export async function payReceipt(tenantId: string, receiptId: string, paymentMethod = "cash") {
  await query(
    "UPDATE sales SET payment_status = 'paid', payment_method = $3 WHERE tenant_id = $1 AND receipt_id = $2",
    [tenantId, receiptId, paymentMethod],
  );
}

export async function deleteReceipt(tenantId: string, receiptId: string) {
  await query("DELETE FROM sales WHERE tenant_id = $1 AND receipt_id = $2", [tenantId, receiptId]);
}

// ─── Expenses ──────────────────────────────────────────────────────────────

export async function getExpenses(tenantId: string): Promise<Record<string, unknown>[]> {
  const result = await query("SELECT * FROM expenses WHERE tenant_id = $1 ORDER BY date DESC", [tenantId]);
  return rowsToCamel<Record<string, unknown>>(result.rows).map((e) => ({
    ...e,
    date: formatDate(e.date),
  }));
}

export async function createExpense(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    "INSERT INTO expenses (tenant_id, category, description, amount, date, expenses_title) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [tenantId, data.category, data.description || null, data.amount, data.date, data.expensesTitle || null],
  );
  const exp = toCamelCase(result.rows[0]);
  return { ...exp, date: formatDate(exp.date) };
}

export async function updateExpense(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = { category: "category", description: "description", amount: "amount", date: "date", expensesTitle: "expenses_title" };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (fields.length > 0) await query(`UPDATE expenses SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
}

export async function deleteExpense(tenantId: string, id: string) {
  await query("DELETE FROM expenses WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Activity Logs ─────────────────────────────────────────────────────────

export async function getActivityLogs(tenantId: string, limit = 100) {
  const result = await query(
    "SELECT * FROM activity_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2",
    [tenantId, limit],
  );
  return rowsToCamel(result.rows).map((l) => ({
    ...l,
    createdAt: formatTimestamp((l as Record<string, unknown>).createdAt),
  }));
}

// ─── Events ────────────────────────────────────────────────────────────────

export async function getEvents(tenantId: string) {
  const result = await query("SELECT * FROM events WHERE tenant_id = $1 ORDER BY start_date", [tenantId]);
  return rowsToCamel(result.rows).map((e) => ({
    ...e,
    startDate: formatTimestamp((e as Record<string, unknown>).startDate),
    endDate: (e as Record<string, unknown>).endDate ? formatTimestamp((e as Record<string, unknown>).endDate) : null,
  }));
}

export async function createEvent(tenantId: string, data: Record<string, unknown>, createdBy?: string) {
  const result = await query(
    `INSERT INTO events (tenant_id, title, description, start_date, end_date, is_all_day, color, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [tenantId, data.title, data.description || null, data.startDate, data.endDate || null,
     data.isAllDay ?? false, data.color || null, createdBy || null],
  );
  const ev = toCamelCase(result.rows[0]);
  return { ...ev, startDate: formatTimestamp(ev.startDate), endDate: ev.endDate ? formatTimestamp(ev.endDate) : null };
}

export async function updateEvent(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    title: "title", description: "description", startDate: "start_date",
    endDate: "end_date", isAllDay: "is_all_day", color: "color",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (fields.length > 0) await query(`UPDATE events SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2`, values);
}

export async function deleteEvent(tenantId: string, id: string) {
  await query("DELETE FROM events WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Users & Roles ─────────────────────────────────────────────────────────

export async function getUsers(tenantId: string) {
  const result = await query(
    "SELECT id, email, display_name, photo_url, role, created_at, last_login FROM users WHERE tenant_id = $1 ORDER BY created_at",
    [tenantId],
  );
  return rowsToCamel(result.rows);
}

export async function createUser(tenantId: string, email: string, password: string, name: string, role: string) {
  const existing = await query("SELECT id FROM users WHERE tenant_id = $1 AND email = $2", [tenantId, email]);
  if (existing.rows.length > 0) throw new Error("User already exists");
  const hash = await hashPassword(password);
  const result = await query(
    "INSERT INTO users (tenant_id, email, password_hash, display_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, display_name, role, created_at",
    [tenantId, email, hash, name, role],
  );
  await logActivity(tenantId, { action: "user.create", entityType: "user", entityId: result.rows[0].id, description: `User created: ${name} (${role})` });
  return toCamelCase(result.rows[0]);
}

export async function updateUserRole(tenantId: string, userId: string, role: string) {
  await query("UPDATE users SET role = $3 WHERE tenant_id = $1 AND id = $2", [tenantId, userId, role]);
}

export async function deleteUser(tenantId: string, userId: string) {
  await query("DELETE FROM users WHERE tenant_id = $1 AND id = $2", [tenantId, userId]);
}

export async function getRoles(tenantId: string) {
  const result = await query("SELECT id, name, permissions, is_system FROM roles WHERE tenant_id = $1", [tenantId]);
  const fetched = rowsToCamel(result.rows);
  const defaults = [
    { id: "admin", name: "Admin", isSystem: true, permissions: ["*"] },
    { id: "staff", name: "Staff", isSystem: true, permissions: [] },
  ];
  const map = new Map(defaults.map((r) => [r.id, r]));
  fetched.forEach((r) => map.set((r as { id: string }).id, r as typeof defaults[0]));
  return Array.from(map.values());
}

export async function createRole(tenantId: string, name: string, permissions: string[] = []) {
  const id = name.trim().toLowerCase().replace(/\s+/g, "_");
  await query(
    "INSERT INTO roles (tenant_id, id, name, permissions) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [tenantId, id, name, JSON.stringify(permissions)],
  );
  return { id, name, permissions };
}

export async function updateRole(tenantId: string, id: string, name: string, permissions: string[] = []) {
  await query(
    "UPDATE roles SET name = $3, permissions = $4 WHERE tenant_id = $1 AND id = $2",
    [tenantId, id, name, JSON.stringify(permissions)],
  );
}

export async function deleteRole(tenantId: string, id: string) {
  if (id === "admin" || id === "staff") throw new Error("Cannot delete system role");
  await query("DELETE FROM roles WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Settings ──────────────────────────────────────────────────────────────

function parseJsonField<T>(val: unknown, fallback: T): T {
  if (val == null) return fallback;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return val as T;
}

export async function getSettings(tenantId: string) {
  const result = await query("SELECT * FROM tenant_settings WHERE tenant_id = $1", [tenantId]);
  if (!result.rows[0]) return null;
  const s = toCamelCase(result.rows[0]);
  const clubType = (s.clubType as string) || "hybrid";
  const template = getClubTypeTemplate(clubType);
  return {
    ...s,
    clubType,
    progressionConfig: parseProgressionConfig(parseJsonField(s.progressionConfig, template.progressionConfig)),
    memberFieldConfig: parseMemberFieldConfig(parseJsonField(s.memberFieldConfig, template.memberFieldConfig)),
    moduleConfig: parseModuleConfig(parseJsonField(s.moduleConfig, template.moduleConfig)),
    socials: typeof s.socials === "string" ? JSON.parse(s.socials as string) : s.socials,
    whatsappTemplates: typeof s.whatsappTemplates === "string" ? JSON.parse(s.whatsappTemplates as string) : s.whatsappTemplates,
    productCategories: typeof s.productCategories === "string" ? JSON.parse(s.productCategories as string) : s.productCategories,
  };
}

export async function updateSettings(tenantId: string, updates: Record<string, unknown>) {
  const existing = await getSettings(tenantId);
  if (!existing) {
    await query("INSERT INTO tenant_settings (tenant_id) VALUES ($1)", [tenantId]);
  }
  const map: Record<string, string> = {
    name: "name", logoUrlLight: "logo_url_light", logoUrlDark: "logo_url_dark",
    managerEmail: "manager_email", phone: "phone", location: "location",
    whatsappTemplate: "whatsapp_template", receiptType: "receipt_type",
    receiptLogoThermal: "receipt_logo_thermal", receiptA4Design: "receipt_a4_design",
    screensaverEnabled: "screensaver_enabled", screensaverTimeout: "screensaver_timeout",
    githubToken: "github_token",
  };
  const fields: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [tenantId];
  let idx = 2;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if ("socials" in updates) { fields.push(`socials = $${idx++}`); values.push(JSON.stringify(updates.socials)); }
  if ("whatsappTemplates" in updates) { fields.push(`whatsapp_templates = $${idx++}`); values.push(JSON.stringify(updates.whatsappTemplates)); }
  if ("productCategories" in updates) { fields.push(`product_categories = $${idx++}`); values.push(JSON.stringify(updates.productCategories)); }
  if ("clubType" in updates) { fields.push(`club_type = $${idx++}`); values.push(updates.clubType); }
  if ("progressionConfig" in updates) { fields.push(`progression_config = $${idx++}`); values.push(JSON.stringify(updates.progressionConfig)); }
  if ("memberFieldConfig" in updates) { fields.push(`member_field_config = $${idx++}`); values.push(JSON.stringify(updates.memberFieldConfig)); }
  if ("moduleConfig" in updates) { fields.push(`module_config = $${idx++}`); values.push(JSON.stringify(updates.moduleConfig)); }
  await query(`UPDATE tenant_settings SET ${fields.join(", ")} WHERE tenant_id = $1`, values);
}

export async function applyClubTypeTemplate(tenantId: string, clubTypeId: string) {
  const template = getClubTypeTemplate(clubTypeId);
  await query(
    `UPDATE tenant_settings SET club_type = $2, progression_config = $3, member_field_config = $4, module_config = $5, updated_at = NOW()
     WHERE tenant_id = $1`,
    [
      tenantId,
      template.id,
      JSON.stringify(template.progressionConfig),
      JSON.stringify(template.memberFieldConfig),
      JSON.stringify(template.moduleConfig),
    ],
  );

  if (template.defaultBelts?.length) {
    const existing = await query("SELECT id FROM belts WHERE tenant_id = $1 LIMIT 1", [tenantId]);
    if (existing.rows.length === 0) {
      for (const belt of template.defaultBelts) {
        await query(
          "INSERT INTO belts (tenant_id, name, color, sort_order) VALUES ($1,$2,$3,$4)",
          [tenantId, belt.name, belt.color, belt.order],
        );
      }
    }
  }

  const pkgExisting = await query("SELECT id FROM packages WHERE tenant_id = $1 LIMIT 1", [tenantId]);
  if (pkgExisting.rows.length === 0) {
    for (const pkg of template.defaultPackages) {
      await query(
        "INSERT INTO packages (tenant_id, name, duration, price, package_type, session_count) VALUES ($1,$2,$3,$4,$5,$6)",
        [tenantId, pkg.name, pkg.duration, pkg.price, pkg.packageType, pkg.sessionCount || null],
      );
    }
  }
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export async function getDashboardStats(tenantId: string, startDate?: string, endDate?: string) {
  const members = await getMembers(tenantId);
  const subscriptions = await getSubscriptions(tenantId);
  const expenses = await getExpenses(tenantId);
  const sales = await getSales(tenantId);

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const start = startDate || defaultStart;
  const end = endDate || defaultEnd;

  const activeSubscriptions = members.filter((m) => (m as Record<string, unknown>).status === "active").length;
  const monthlyIncome = subscriptions
    .filter((s) => String(s.startDate) >= start && String(s.startDate) <= end)
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const salesIncome = sales
    .filter((s) => String(s.date).split("T")[0] >= start
      && String(s.date).split("T")[0] <= end
      && s.status !== "cancelled")
    .reduce((sum, s) => sum + Number(s.totalPrice), 0);
  const filteredExpenses = expenses.filter((e) => String(e.date) >= start && String(e.date) <= end);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expensesByCategoryMap: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    const cat = String(e.category);
    expensesByCategoryMap[cat] = (expensesByCategoryMap[cat] || 0) + Number(e.amount);
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const next10 = new Date(); next10.setDate(next10.getDate() + 10);
  const next10Str = next10.toISOString().split("T")[0];

  const expiringSubscriptions = members.filter((m) => {
    const mem = m as { subscriptionEnd?: string; status: string; id: string };
    if (!mem.subscriptionEnd || mem.subscriptionEnd < todayStr || mem.subscriptionEnd > next10Str) return false;
    const hasFuture = subscriptions.some(
      (s) => String(s.memberId) === mem.id && String(s.startDate) > todayStr,
    );
    return !hasFuture;
  });

  const recentTransactions = [
    ...sales.filter((s) => String(s.date).split("T")[0] >= start
      && String(s.date).split("T")[0] <= end
      && s.status !== "cancelled"),
    ...subscriptions.filter((s) => String(s.startDate) >= start && String(s.startDate) <= end)
      .map((s) => ({ ...s, date: s.startDate })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10);

  return {
    totalMembers: members.length,
    activeSubscriptions,
    monthlyIncome,
    netProfit: monthlyIncome + salesIncome - totalExpenses,
    totalExpenses,
    expensesByCategory: Object.entries(expensesByCategoryMap).map(([category, total]) => ({ category, total })),
    newMembersThisMonth: members.filter((m) => {
      const ss = (m as { subscriptionStart?: string }).subscriptionStart;
      return ss && ss >= start && ss <= end;
    }).length,
    expiringSubscriptions,
    salesIncome,
    recentTransactions,
  };
}

// ─── Tenant Provisioning ───────────────────────────────────────────────────

export async function provisionTenant(params: {
  clubName: string;
  email: string;
  password: string;
  adminName: string;
  phone?: string;
  planSlug?: string;
  clubType?: string;
}) {
  const slug = await uniqueSlug(params.clubName, async (s) => {
    const r = await query("SELECT id FROM tenants WHERE slug = $1", [s]);
    return r.rows.length > 0;
  });

  const planResult = await query(
    "SELECT * FROM subscription_plans WHERE slug = $1 AND is_active = true",
    [params.planSlug || "starter"],
  );
  const plan = planResult.rows[0] as PlanRow;
  if (!plan) throw new Error("Invalid plan");

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const tenantResult = await query(
    `INSERT INTO tenants (name, slug, email, phone, status, plan_id, trial_ends_at)
     VALUES ($1,$2,$3,$4,'trial',$5,$6) RETURNING *`,
    [params.clubName, slug, params.email, params.phone || null, plan.id, trialEnd.toISOString()],
  );
  const tenant = tenantResult.rows[0];
  const tenantId = tenant.id;

  await createTenantSubscriptionSnapshot({
    tenantId,
    plan,
    status: "trialing",
    billingCycle: "monthly",
    periodStart: new Date(),
    periodEnd: trialEnd,
  });

  const hash = await hashPassword(params.password);
  const userResult = await query(
    "INSERT INTO users (tenant_id, email, password_hash, display_name, role) VALUES ($1,$2,$3,$4,'admin') RETURNING *",
    [tenantId, params.email, hash, params.adminName],
  );

  const clubType = params.clubType || "hybrid";
  const template = getClubTypeTemplate(clubType);
  await query(
    `INSERT INTO tenant_settings (tenant_id, name, manager_email, club_type, progression_config, member_field_config, module_config)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      tenantId, params.clubName, params.email, clubType,
      JSON.stringify(template.progressionConfig),
      JSON.stringify(template.memberFieldConfig),
      JSON.stringify(template.moduleConfig),
    ],
  );
  await query("INSERT INTO tenant_counters (tenant_id, member_count) VALUES ($1, 1000)", [tenantId]);
  await query(
    "INSERT INTO tenant_booking_settings (tenant_id, public_slug, portal_enabled) VALUES ($1, $2, true) ON CONFLICT DO NOTHING",
    [tenantId, slug],
  );

  if (template.defaultBelts?.length) {
    for (const belt of template.defaultBelts) {
      await query(
        "INSERT INTO belts (tenant_id, name, color, sort_order) VALUES ($1,$2,$3,$4)",
        [tenantId, belt.name, belt.color, belt.order],
      );
    }
  }
  for (const pkg of template.defaultPackages) {
    await query(
      "INSERT INTO packages (tenant_id, name, duration, price, package_type, session_count) VALUES ($1,$2,$3,$4,$5,$6)",
      [tenantId, pkg.name, pkg.duration, pkg.price, pkg.packageType, pkg.sessionCount || null],
    );
  }
  await query(
    `INSERT INTO roles (tenant_id, id, name, permissions, is_system) VALUES
     ($1,'admin','Admin','["*"]',true),
     ($1,'staff','Staff','[]',true),
     ($1,'coach','Coach','["classes.view","bookings.view","attendance.view","attendance.add"]',true)`,
    [tenantId],
  );

  return { tenant: toCamelCase(tenant), user: toCamelCase(userResult.rows[0]) };
}

// ─── Platform subscriptions (snapshotted per tenant period) ────────────────

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price_monthly: number;
  price_yearly: number;
  max_members: number;
  max_users: number;
  features: string[] | string;
};

async function createTenantSubscriptionSnapshot(params: {
  tenantId: string;
  plan: PlanRow;
  status: string;
  billingCycle: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const { tenantId, plan, status, billingCycle, periodStart, periodEnd } = params;
  const features = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string || "[]");
  await query(
    `INSERT INTO tenant_subscriptions (
      tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end,
      plan_name, plan_slug, plan_description, price_monthly, price_yearly, max_members, max_users, plan_features
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      tenantId, plan.id, status, billingCycle, periodStart.toISOString(), periodEnd.toISOString(),
      plan.name, plan.slug, plan.description || null,
      plan.price_monthly, plan.price_yearly, plan.max_members, plan.max_users,
      JSON.stringify(features),
    ],
  );
}

function mapTenantSubscriptionRow(row: Record<string, unknown>) {
  const sub = toCamelCase(row) as Record<string, unknown>;
  if (!sub.features && sub.planFeatures) {
    const raw = sub.planFeatures;
    sub.features = typeof raw === "string" ? JSON.parse(raw) : raw;
  }
  return sub;
}

// ─── Platform Admin ────────────────────────────────────────────────────────

export async function getAllTenants() {
  const result = await query(`
    SELECT t.*,
      ts.plan_name, ts.price_monthly,
      ts.status as subscription_status, ts.current_period_end, ts.billing_cycle,
      (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id) as member_count,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT * FROM tenant_subscriptions WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1
    ) ts ON true
    ORDER BY t.created_at DESC
  `);
  return rowsToCamel(result.rows);
}

export async function getTenantById(id: string) {
  const result = await query(`
    SELECT t.*,
      ts.plan_name, ts.price_monthly, ts.max_members, ts.max_users,
      ts.status as subscription_status, ts.current_period_end, ts.billing_cycle
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT * FROM tenant_subscriptions WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1
    ) ts ON true
    WHERE t.id = $1
  `, [id]);
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function updateTenant(id: string, updates: Record<string, unknown>) {
  const fields: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [id];
  let idx = 2;
  for (const key of ["name", "email", "phone", "status"]) {
    if (key in updates) {
      fields.push(`${key} = $${idx++}`);
      values.push(updates[key]);
    }
  }
  if ("planId" in updates && updates.planId) {
    fields.push(`plan_id = $${idx++}`);
    values.push(updates.planId);
    const planResult = await query("SELECT * FROM subscription_plans WHERE id = $1", [updates.planId]);
    const plan = planResult.rows[0] as PlanRow | undefined;
    if (plan) {
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await createTenantSubscriptionSnapshot({
        tenantId: id,
        plan,
        status: "active",
        billingCycle: "monthly",
        periodStart,
        periodEnd,
      });
    }
  }
  if (fields.length > 1) await query(`UPDATE tenants SET ${fields.join(", ")} WHERE id = $1`, values);
}

export async function getSubscriptionPlans(activeOnly = false) {
  const result = await query(
    `SELECT sp.*,
      (SELECT COUNT(DISTINCT ts.tenant_id) FROM tenant_subscriptions ts WHERE ts.plan_id = sp.id) as subscriber_count
     FROM subscription_plans sp
     ${activeOnly ? "WHERE sp.is_active = true" : ""}
     ORDER BY sp.sort_order`,
  );
  return rowsToCamel(result.rows);
}

export async function getSubscriptionPlanById(id: string) {
  const result = await query("SELECT * FROM subscription_plans WHERE id = $1", [id]);
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function createSubscriptionPlan(data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_members, max_users, features, sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      data.name, data.slug, data.description || null,
      data.priceMonthly, data.priceYearly, data.maxMembers, data.maxUsers,
      JSON.stringify(data.features || []),
      data.sortOrder ?? 0,
      data.isActive !== false,
    ],
  );
  return toCamelCase(result.rows[0]);
}

export async function updateSubscriptionPlan(id: string, data: Record<string, unknown>) {
  const result = await query(
    `UPDATE subscription_plans SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      price_monthly = COALESCE($4, price_monthly),
      price_yearly = COALESCE($5, price_yearly),
      max_members = COALESCE($6, max_members),
      max_users = COALESCE($7, max_users),
      features = COALESCE($8, features),
      is_active = COALESCE($9, is_active),
      sort_order = COALESCE($10, sort_order)
     WHERE id = $1 RETURNING *`,
    [
      id,
      data.name ?? null,
      data.description ?? null,
      data.priceMonthly ?? null,
      data.priceYearly ?? null,
      data.maxMembers ?? null,
      data.maxUsers ?? null,
      data.features ? JSON.stringify(data.features) : null,
      data.isActive ?? null,
      data.sortOrder ?? null,
    ],
  );
  if (!result.rows[0]) throw new Error("Plan not found");
  return toCamelCase(result.rows[0]);
}

export async function deleteSubscriptionPlan(id: string) {
  const refs = await query(
    `SELECT COUNT(*) as count FROM tenant_subscriptions WHERE plan_id = $1`,
    [id],
  );
  if (Number(refs.rows[0].count) > 0) {
    throw new Error("Cannot delete a plan with existing subscriptions. Deactivate it instead.");
  }
  const result = await query("DELETE FROM subscription_plans WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) throw new Error("Plan not found");
}

export async function getPlatformStats() {
  const tenants = await query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active, COUNT(*) FILTER (WHERE status = 'trial') as trial FROM tenants");
  const revenue = await query(`
    SELECT COALESCE(SUM(
      CASE
        WHEN ts.billing_cycle = 'yearly' THEN COALESCE(ts.price_yearly, 0) / 12
        ELSE COALESCE(ts.price_monthly, 0)
      END
    ), 0) as mrr
    FROM tenants t
    JOIN LATERAL (
      SELECT * FROM tenant_subscriptions WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1
    ) ts ON true
    WHERE t.status IN ('active', 'trial')
      AND (ts.current_period_end IS NULL OR ts.current_period_end > NOW())
  `);
  return {
    totalTenants: Number(tenants.rows[0].total),
    activeTenants: Number(tenants.rows[0].active),
    trialTenants: Number(tenants.rows[0].trial),
    mrr: Number(revenue.rows[0].mrr),
  };
}

export async function getTenantSubscription(tenantId: string) {
  const result = await query(`
    SELECT ts.*
    FROM tenant_subscriptions ts
    WHERE ts.tenant_id = $1
    ORDER BY ts.created_at DESC LIMIT 1
  `, [tenantId]);
  return result.rows[0] ? mapTenantSubscriptionRow(result.rows[0]) : null;
}

export async function checkTenantAccess(tenantId: string): Promise<{
  allowed: boolean;
  reason?: string;
  code?: "subscription_suspended" | "subscription_cancelled" | "trial_expired" | "subscription_expired";
}> {
  const tenant = await query("SELECT status, trial_ends_at FROM tenants WHERE id = $1", [tenantId]);
  if (!tenant.rows[0]) return { allowed: false, reason: "Tenant not found", code: "subscription_suspended" };
  const { status, trial_ends_at } = tenant.rows[0];
  if (status === "suspended") {
    return { allowed: false, reason: "Subscription suspended", code: "subscription_suspended" };
  }
  if (status === "cancelled") {
    return { allowed: false, reason: "Subscription cancelled", code: "subscription_cancelled" };
  }

  const subResult = await query(
    `SELECT status, current_period_end FROM tenant_subscriptions
     WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [tenantId],
  );
  const sub = subResult.rows[0];
  const periodEnd = sub?.current_period_end || trial_ends_at;

  if (periodEnd && new Date(periodEnd) < new Date()) {
    if (status === "trial" || sub?.status === "trialing") {
      await maybeNotifyTrialExpired(tenantId);
      return { allowed: false, reason: "Trial expired", code: "trial_expired" };
    }
    return { allowed: false, reason: "Subscription period ended", code: "subscription_expired" };
  }

  if (status === "trial" && trial_ends_at) {
    await maybeSendTrialReminders(tenantId);
  }

  return { allowed: true };
}

export function getTrialDaysRemaining(trialEndsAt: string | Date | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

async function maybeSendTrialReminders(tenantId: string) {
  const row = await query(
    `SELECT t.email, t.name, t.trial_ends_at, t.trial_reminder_3d_sent_at, t.trial_reminder_1d_sent_at, ts.plan_name
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT plan_name FROM tenant_subscriptions WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1
     ) ts ON true
     WHERE t.id = $1 AND t.status = 'trial'`,
    [tenantId],
  );
  const tenant = row.rows[0];
  if (!tenant?.trial_ends_at) return;

  const daysLeft = getTrialDaysRemaining(tenant.trial_ends_at as string);
  if (daysLeft === null || daysLeft <= 0) return;

  const billingUrl = `${getAppBaseUrl()}/billing`;
  const trialEndDate = new Date(tenant.trial_ends_at as string).toLocaleDateString();
  const base = {
    to: tenant.email as string,
    clubName: tenant.name as string,
    planName: (tenant.plan_name as string) || "your plan",
    trialEndDate,
    billingUrl,
  };

  if (daysLeft <= 3 && daysLeft > 1 && !tenant.trial_reminder_3d_sent_at) {
    await sendTrialReminderEmail({ ...base, daysLeft });
    await query("UPDATE tenants SET trial_reminder_3d_sent_at = NOW() WHERE id = $1", [tenantId]);
  }

  if (daysLeft <= 1 && !tenant.trial_reminder_1d_sent_at) {
    await sendTrialReminderEmail({ ...base, daysLeft: 1 });
    await query("UPDATE tenants SET trial_reminder_1d_sent_at = NOW() WHERE id = $1", [tenantId]);
  }
}

export async function processAllTrialReminders() {
  const result = await query(
    `SELECT id FROM tenants WHERE status = 'trial' AND trial_ends_at > NOW()`,
  );
  for (const row of result.rows) {
    await maybeSendTrialReminders(row.id as string);
  }
}

async function maybeNotifyTrialExpired(tenantId: string) {
  const row = await query(
    `SELECT t.email, t.name, t.trial_expired_notified_at, ts.plan_name
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT plan_name FROM tenant_subscriptions WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1
     ) ts ON true
     WHERE t.id = $1`,
    [tenantId],
  );
  const tenant = row.rows[0];
  if (!tenant || tenant.trial_expired_notified_at) return;
  const billingUrl = `${getAppBaseUrl()}/billing`;
  await sendTrialExpiredEmail({
    to: tenant.email,
    clubName: tenant.name,
    planName: tenant.plan_name || "your plan",
    billingUrl,
  });
  await query("UPDATE tenants SET trial_expired_notified_at = NOW() WHERE id = $1", [tenantId]);
}

// ─── Platform payments (TAP) ───────────────────────────────────────────────

function nextInvoiceNumber(): string {
  return `INV-${Date.now()}`;
}

export async function createPlatformCheckout(tenantId: string, userId: string, billingCycle: "monthly" | "yearly") {
  if (!isTapConfigured()) throw new Error("Payment gateway is not configured");

  const tenantRow = await query(
    `SELECT t.*, u.display_name, u.email as user_email
     FROM tenants t JOIN users u ON u.tenant_id = t.id AND u.id = $2
     WHERE t.id = $1`,
    [tenantId, userId],
  );
  const tenant = tenantRow.rows[0];
  if (!tenant) throw new Error("Tenant not found");

  const sub = await getTenantSubscription(tenantId) as Record<string, unknown> | null;
  if (!sub) throw new Error("No subscription found");

  const amount = billingCycle === "yearly"
    ? Number(sub.priceYearly || 0)
    : Number(sub.priceMonthly || 0);
  if (!amount) throw new Error("Invalid plan amount");

  const currency = process.env.TAP_CURRENCY || "USD";
  const paymentResult = await query(
    `INSERT INTO platform_payments (tenant_id, subscription_id, amount, currency, status, billing_cycle, plan_name, plan_slug, customer_email)
     VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8) RETURNING *`,
    [tenantId, sub.id, amount, currency, billingCycle, sub.planName, sub.planSlug, tenant.user_email || tenant.email],
  );
  const payment = toCamelCase(paymentResult.rows[0]) as { id: string };

  const baseUrl = getAppBaseUrl();
  const charge = await createTapCharge({
    amount,
    currency,
    customer: {
      firstName: tenant.display_name || tenant.name,
      email: tenant.user_email || tenant.email,
      phone: tenant.phone || undefined,
    },
    description: `Nawady — ${sub.planName} (${billingCycle})`,
    metadata: {
      paymentId: payment.id,
      tenantId,
      billingCycle,
    },
    redirectUrl: `${baseUrl}/payment/result`,
    webhookUrl: `${baseUrl}/api/webhooks/tap`,
  });

  await query("UPDATE platform_payments SET tap_charge_id = $2, metadata = $3 WHERE id = $1", [
    payment.id,
    charge.id,
    JSON.stringify({ tapStatus: charge.status }),
  ]);

  const payUrl = charge.transaction?.url;
  if (!payUrl) throw new Error("No payment URL returned from TAP");

  return { paymentId: payment.id, url: payUrl, chargeId: charge.id };
}

export async function confirmPlatformPayment(tapChargeId: string) {
  const charge = await retrieveTapCharge(tapChargeId);
  const paymentRow = await query("SELECT * FROM platform_payments WHERE tap_charge_id = $1", [tapChargeId]);
  const payment = paymentRow.rows[0];
  if (!payment) return { ok: false, status: charge.status, reason: "Payment record not found" };

  if (payment.status === "captured") {
    return { ok: true, status: "CAPTURED", payment: toCamelCase(payment) };
  }

  if (!isTapChargeSuccessful(charge.status)) {
    await query(
      "UPDATE platform_payments SET status = 'failed', metadata = metadata || $2::jsonb WHERE id = $1",
      [payment.id, JSON.stringify({ tapStatus: charge.status, tapMessage: charge.response?.message })],
    );
    return { ok: false, status: charge.status, payment: toCamelCase(payment) };
  }

  return activateCapturedPayment(payment, charge.id);
}

async function activateCapturedPayment(payment: Record<string, unknown>, tapChargeId: string) {
  const tenantId = payment.tenant_id as string;
  const billingCycle = (payment.billing_cycle as string) || "monthly";
  const periodStart = new Date();
  const periodEnd = new Date();
  if (billingCycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub = await getTenantSubscription(tenantId) as Record<string, unknown> | null;
  const planRow = sub?.planId
    ? await query("SELECT * FROM subscription_plans WHERE id = $1", [sub.planId])
    : { rows: [] };
  const plan = planRow.rows[0] as PlanRow | undefined;

  if (plan) {
    await createTenantSubscriptionSnapshot({
      tenantId,
      plan: {
        id: plan.id,
        name: (sub?.planName as string) || plan.name,
        slug: (sub?.planSlug as string) || plan.slug,
        description: (sub?.planDescription as string) || plan.description,
        price_monthly: Number(sub?.priceMonthly ?? plan.price_monthly),
        price_yearly: Number(sub?.priceYearly ?? plan.price_yearly),
        max_members: Number(sub?.maxMembers ?? plan.max_members),
        max_users: Number(sub?.maxUsers ?? plan.max_users),
        features: (sub?.features as string[]) || plan.features,
      },
      status: "active",
      billingCycle,
      periodStart,
      periodEnd,
    });
  }

  await query(
    `UPDATE tenants SET status = 'active', plan_id = COALESCE(plan_id, $2), trial_ends_at = NULL, updated_at = NOW() WHERE id = $1`,
    [tenantId, sub?.planId || null],
  );

  const invoiceNumber = (payment.invoice_number as string) || nextInvoiceNumber();
  const paidAt = new Date();
  await query(
    `UPDATE platform_payments SET status = 'captured', paid_at = $2, invoice_number = $3, metadata = metadata || $4::jsonb WHERE id = $1`,
    [payment.id, paidAt.toISOString(), invoiceNumber, JSON.stringify({ tapStatus: "CAPTURED" })],
  );

  const tenantInfo = await query("SELECT name, email FROM tenants WHERE id = $1", [tenantId]);
  const t = tenantInfo.rows[0];
  if (t) {
    const sent = await sendPaymentInvoiceEmail({
      to: (payment.customer_email as string) || t.email,
      clubName: t.name,
      planName: (payment.plan_name as string) || "Platform plan",
      amount: Number(payment.amount),
      currency: (payment.currency as string) || "USD",
      invoiceNumber,
      billingCycle,
      paidAt: paidAt.toISOString(),
    });
    if (sent) {
      await query("UPDATE platform_payments SET invoice_sent_at = NOW() WHERE id = $1", [payment.id]);
    }
  }

  const updated = await query("SELECT * FROM platform_payments WHERE id = $1", [payment.id]);
  return { ok: true, status: "CAPTURED", payment: toCamelCase(updated.rows[0]), tapChargeId };
}

export async function getPlatformPayments() {
  const result = await query(`
    SELECT p.*, t.name as tenant_name, t.email as tenant_email
    FROM platform_payments p
    JOIN tenants t ON t.id = p.tenant_id
    ORDER BY p.created_at DESC
    LIMIT 200
  `);
  return rowsToCamel(result.rows);
}

// ─── Support chat ──────────────────────────────────────────────────────────

const BOT_REPLIES: { match: RegExp; reply: string }[] = [
  { match: /trial|تجرب/i, reply: "Your trial lasts 14 days. When it ends, go to Billing to pay via TAP and restore access." },
  { match: /pay|payment|billing|دفع|فوتر/i, reply: "Open Billing from the menu. Choose monthly or yearly and pay securely through TAP." },
  { match: /password|كلمة/i, reply: "Admins can reset passwords from System Settings. Contact us if you are locked out." },
  { match: /member|عضو/i, reply: "Members are managed under the Members module. You can add profiles, documents, and subscriptions there." },
];

function botReplyFor(message: string): string | null {
  for (const item of BOT_REPLIES) {
    if (item.match.test(message)) return item.reply;
  }
  return null;
}

export async function getOrCreateSupportConversation(tenantId: string, userId: string, userName: string) {
  const existing = await query(
    `SELECT * FROM support_conversations WHERE tenant_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 1`,
    [tenantId],
  );
  if (existing.rows[0]) return toCamelCase(existing.rows[0]);

  const created = await query(
    `INSERT INTO support_conversations (tenant_id, created_by_user_id, created_by_name, subject)
     VALUES ($1,$2,$3,'Platform support') RETURNING *`,
    [tenantId, userId, userName],
  );
  const conversation = created.rows[0];
  await query(
    `INSERT INTO support_messages (conversation_id, sender_type, sender_name, body)
     VALUES ($1,'bot','Assistant','Hello! I can help with billing, trials, and platform features. Type your question or wait for our team to reply.')`,
    [conversation.id],
  );
  return toCamelCase(conversation);
}

export async function getSupportMessages(conversationId: string, tenantId?: string) {
  if (tenantId) {
    const conv = await query("SELECT id FROM support_conversations WHERE id = $1 AND tenant_id = $2", [conversationId, tenantId]);
    if (!conv.rows[0]) throw new Error("Conversation not found");
  }
  const result = await query(
    `SELECT * FROM support_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId],
  );
  return rowsToCamel(result.rows);
}

export async function sendSupportMessage(params: {
  conversationId: string;
  body: string;
  senderType: "tenant_user" | "platform_admin" | "bot";
  senderId?: string;
  senderName?: string;
  tenantId?: string;
}) {
  if (params.tenantId) {
    const conv = await query("SELECT id FROM support_conversations WHERE id = $1 AND tenant_id = $2", [params.conversationId, params.tenantId]);
    if (!conv.rows[0]) throw new Error("Conversation not found");
  }
  const result = await query(
    `INSERT INTO support_messages (conversation_id, sender_type, sender_id, sender_name, body)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [params.conversationId, params.senderType, params.senderId || null, params.senderName || null, params.body],
  );
  await query("UPDATE support_conversations SET last_message_at = NOW(), status = 'open' WHERE id = $1", [params.conversationId]);

  if (params.senderType === "tenant_user") {
    const auto = botReplyFor(params.body);
    if (auto) {
      await query(
        `INSERT INTO support_messages (conversation_id, sender_type, sender_name, body) VALUES ($1,'bot','Assistant',$2)`,
        [params.conversationId, auto],
      );
    } else {
      await query(
        `INSERT INTO support_messages (conversation_id, sender_type, sender_name, body) VALUES ($1,'bot','Assistant',$2)`,
        [params.conversationId, "Thanks! Our support team has been notified and will reply shortly."],
      );
    }
  }

  return toCamelCase(result.rows[0]);
}

export async function getAllSupportConversations() {
  const result = await query(`
    SELECT c.*, t.name as tenant_name, t.email as tenant_email,
      (SELECT body FROM support_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM support_conversations c
    JOIN tenants t ON t.id = c.tenant_id
    ORDER BY c.last_message_at DESC
    LIMIT 100
  `);
  return rowsToCamel(result.rows);
}

// ─── Platform admin users & roles ────────────────────────────────────────────

export async function getPlatformAdminById(id: string) {
  const result = await query(
    `SELECT pa.*, r.name as role_name, r.permissions
     FROM platform_admins pa
     LEFT JOIN platform_admin_roles r ON r.id = pa.role_id
     WHERE pa.id = $1`,
    [id],
  );
  if (!result.rows[0]) return null;
  const row = toCamelCase(result.rows[0]) as Record<string, unknown>;
  const perms = row.permissions;
  row.permissions = typeof perms === "string" ? JSON.parse(perms) : perms;
  return row;
}

export async function getPlatformAdminPermissions(adminId: string): Promise<string[]> {
  const admin = await getPlatformAdminById(adminId);
  if (!admin) return [];
  return (admin.permissions as string[]) || ["*"];
}

export async function getAllPlatformAdmins() {
  const result = await query(
    `SELECT pa.id, pa.email, pa.display_name, pa.role_id, pa.is_active, pa.created_at, r.name as role_name
     FROM platform_admins pa
     LEFT JOIN platform_admin_roles r ON r.id = pa.role_id
     ORDER BY pa.created_at`,
  );
  return rowsToCamel(result.rows);
}

export async function getPlatformAdminRoles() {
  return Object.entries(PLATFORM_ROLE_PRESETS).map(([id, role]) => ({
    id,
    name: role.name,
    permissions: role.permissions,
  }));
}

export async function createPlatformAdminUser(params: {
  email: string;
  password: string;
  displayName: string;
  roleId: string;
}) {
  const hash = await hashPassword(params.password);
  const result = await query(
    `INSERT INTO platform_admins (email, password_hash, display_name, role_id, is_active)
     VALUES ($1,$2,$3,$4,true) RETURNING id, email, display_name, role_id, is_active, created_at`,
    [params.email, hash, params.displayName, params.roleId],
  );
  return toCamelCase(result.rows[0]);
}

export async function updatePlatformAdminUser(id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;
  if ("displayName" in updates) { fields.push(`display_name = $${idx++}`); values.push(updates.displayName); }
  if ("roleId" in updates) { fields.push(`role_id = $${idx++}`); values.push(updates.roleId); }
  if ("isActive" in updates) { fields.push(`is_active = $${idx++}`); values.push(updates.isActive); }
  if ("password" in updates && updates.password) {
    const hash = await hashPassword(updates.password as string);
    fields.push(`password_hash = $${idx++}`);
    values.push(hash);
  }
  if (!fields.length) return;
  await query(`UPDATE platform_admins SET ${fields.join(", ")} WHERE id = $1`, values);
}

export async function impersonateTenant(platformAdminId: string, tenantId: string) {
  const adminUser = await query(
    "SELECT id, email, display_name FROM users WHERE tenant_id = $1 AND role = 'admin' ORDER BY created_at LIMIT 1",
    [tenantId],
  );
  const user = adminUser.rows[0];
  if (!user) throw new Error("No admin user found for tenant");
  return {
    userId: user.id as string,
    tenantId,
    email: user.email as string,
    role: "admin",
    impersonatedBy: platformAdminId,
  };
}

// ─── Coaches ───────────────────────────────────────────────────────────────

export async function getCoachForUser(tenantId: string, userId: string): Promise<string | null> {
  const result = await query(
    "SELECT id FROM coaches WHERE tenant_id = $1 AND user_id = $2 AND is_active = true LIMIT 1",
    [tenantId, userId],
  );
  return (result.rows[0]?.id as string) || null;
}

export async function getCoaches(tenantId: string) {
  const result = await query(
    "SELECT * FROM coaches WHERE tenant_id = $1 ORDER BY name",
    [tenantId],
  );
  return rowsToCamel(result.rows);
}

export async function createCoach(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO coaches (tenant_id, user_id, name, phone, email, bio, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      tenantId,
      data.userId || null,
      data.name,
      data.phone || null,
      data.email || null,
      data.bio || null,
      data.isActive ?? true,
    ],
  );
  const coach = toCamelCase(result.rows[0]);
  await logActivity(tenantId, {
    action: "coach.create",
    entityType: "coach",
    entityId: coach.id as string,
    description: `Coach created: ${data.name}`,
  });
  return coach;
}

export async function updateCoach(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    userId: "user_id",
    name: "name",
    phone: "phone",
    email: "email",
    bio: "bio",
    isActive: "is_active",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx++}`);
      values.push(updates[key]);
    }
  }
  if (!fields.length) return null;
  const result = await query(
    `UPDATE coaches SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    values,
  );
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function deleteCoach(tenantId: string, id: string) {
  await query("DELETE FROM coaches WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Class templates ───────────────────────────────────────────────────────

function mapClassTemplate(row: Record<string, unknown>) {
  const t = toCamelCase(row) as Record<string, unknown>;
  if (typeof t.recurrence === "string") {
    try {
      t.recurrence = JSON.parse(t.recurrence);
    } catch {
      t.recurrence = [];
    }
  }
  if (!Array.isArray(t.recurrence)) t.recurrence = [];
  if (Array.isArray(row.allowed_package_ids)) {
    t.allowedPackageIds = row.allowed_package_ids;
  } else {
    t.allowedPackageIds = [];
  }
  t.deductSession = row.deduct_session === true;
  return t;
}

export async function getClassTemplates(tenantId: string) {
  const result = await query(
    `SELECT t.*, c.name AS coach_name
     FROM class_templates t
     LEFT JOIN coaches c ON c.id = t.coach_id
     WHERE t.tenant_id = $1
     ORDER BY t.name`,
    [tenantId],
  );
  return result.rows.map((row) => {
    const mapped = mapClassTemplate(row);
    mapped.coachName = row.coach_name;
    return mapped;
  });
}

export async function createClassTemplate(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO class_templates
     (tenant_id, name, description, coach_id, location, capacity, duration_minutes, color, recurrence, is_active, allowed_package_ids, deduct_session, branch_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      tenantId,
      data.name,
      data.description || null,
      data.coachId || null,
      data.location || null,
      data.capacity ?? 20,
      data.durationMinutes ?? 60,
      data.color || "#3b82f6",
      JSON.stringify(data.recurrence || []),
      data.isActive ?? true,
      data.allowedPackageIds || [],
      data.deductSession ?? false,
      data.branchId || null,
    ],
  );
  const template = mapClassTemplate(result.rows[0]);
  await logActivity(tenantId, {
    action: "class_template.create",
    entityType: "class_template",
    entityId: template.id as string,
    description: `Class template created: ${data.name}`,
  });
  return template;
}

export async function updateClassTemplate(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    name: "name",
    description: "description",
    coachId: "coach_id",
    location: "location",
    capacity: "capacity",
    durationMinutes: "duration_minutes",
    color: "color",
    isActive: "is_active",
    deductSession: "deduct_session",
    branchId: "branch_id",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx++}`);
      values.push(updates[key]);
    }
  }
  if ("recurrence" in updates) {
    fields.push(`recurrence = $${idx++}`);
    values.push(JSON.stringify(updates.recurrence || []));
  }
  if ("allowedPackageIds" in updates) {
    fields.push(`allowed_package_ids = $${idx++}`);
    values.push(updates.allowedPackageIds || []);
  }
  if (!fields.length) return null;
  const result = await query(
    `UPDATE class_templates SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    values,
  );
  return result.rows[0] ? mapClassTemplate(result.rows[0]) : null;
}

export async function deleteClassTemplate(tenantId: string, id: string) {
  await query("DELETE FROM class_templates WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Class sessions ────────────────────────────────────────────────────────

function mapClassSession(row: Record<string, unknown>) {
  const s = toCamelCase(row) as Record<string, unknown>;
  s.startsAt = formatTimestamp(s.startsAt);
  s.endsAt = formatTimestamp(s.endsAt);
  if (row.coach_name) s.coachName = row.coach_name;
  return s;
}

export async function getClassSessions(
  tenantId: string,
  from: string,
  to: string,
  options?: { coachId?: string; branchId?: string },
) {
  const clauses = ["s.tenant_id = $1", "s.starts_at >= $2", "s.starts_at <= $3"];
  const values: unknown[] = [tenantId, from, to];
  if (options?.coachId) {
    clauses.push(`s.coach_id = $${values.length + 1}`);
    values.push(options.coachId);
  }
  if (options?.branchId) {
    clauses.push(`s.branch_id = $${values.length + 1}`);
    values.push(options.branchId);
  }
  const result = await query(
    `SELECT s.*, c.name AS coach_name
     FROM class_sessions s
     LEFT JOIN coaches c ON c.id = s.coach_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY s.starts_at`,
    values,
  );
  return result.rows.map(mapClassSession);
}

export async function createClassSession(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO class_sessions
     (tenant_id, template_id, name, coach_id, location, starts_at, ends_at, capacity, status, notes, branch_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      tenantId,
      data.templateId || null,
      data.name,
      data.coachId || null,
      data.location || null,
      data.startsAt,
      data.endsAt,
      data.capacity ?? 20,
      data.status || "scheduled",
      data.notes || null,
      data.branchId || null,
    ],
  );
  return mapClassSession(result.rows[0]);
}

export async function updateClassSession(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    name: "name",
    coachId: "coach_id",
    location: "location",
    startsAt: "starts_at",
    endsAt: "ends_at",
    capacity: "capacity",
    status: "status",
    notes: "notes",
    branchId: "branch_id",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx++}`);
      values.push(updates[key]);
    }
  }
  if (!fields.length) return null;
  const result = await query(
    `UPDATE class_sessions SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    values,
  );
  return result.rows[0] ? mapClassSession(result.rows[0]) : null;
}

export async function deleteClassSession(tenantId: string, id: string) {
  await query("DELETE FROM class_sessions WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

export { generateClassSessionsForTenant, generateClassSessionsForAllTenants } from "./scheduling.js";

// ─── Member portal accounts ────────────────────────────────────────────────

export async function getMemberAccount(tenantId: string, memberId: string) {
  const result = await query(
    "SELECT id, member_id, phone, email, is_active, last_login, created_at FROM member_accounts WHERE tenant_id = $1 AND member_id = $2",
    [tenantId, memberId],
  );
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function enableMemberPortalAccess(
  tenantId: string,
  memberId: string,
  password: string,
) {
  const member = await getMember(tenantId, memberId);
  if (!member) throw new Error("Member not found");
  const hash = await hashPassword(password);
  const phone = (member as { phone?: string }).phone;
  if (!phone) throw new Error("Member must have a phone number");

  const existing = await query(
    "SELECT id FROM member_accounts WHERE tenant_id = $1 AND member_id = $2",
    [tenantId, memberId],
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE member_accounts SET password_hash = $3, phone = $4, is_active = true WHERE tenant_id = $1 AND member_id = $2`,
      [tenantId, memberId, hash, phone],
    );
  } else {
    await query(
      `INSERT INTO member_accounts (tenant_id, member_id, phone, email, password_hash, is_active)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [tenantId, memberId, phone, (member as { email?: string }).email || null, hash],
    );
  }
  return getMemberAccount(tenantId, memberId);
}

export async function portalLogin(slug: string, phone: string, password: string) {
  const { getTenantByPortalSlug, getBookingSettings } = await import("./bookings.js");
  const tenant = await getTenantByPortalSlug(slug);
  if (!tenant) throw new Error("Club not found");
  const tenantId = tenant.id as string;
  const settings = await getBookingSettings(tenantId);
  if (!settings.portalEnabled) throw new Error("Member portal is disabled");

  const normalized = phone.replace(/\s+/g, "");
  const result = await query(
    `SELECT ma.*, m.name AS member_name, m.status AS member_status
     FROM member_accounts ma
     JOIN members m ON m.id = ma.member_id
     WHERE ma.tenant_id = $1 AND ma.is_active = true
       AND REPLACE(ma.phone, ' ', '') = $2`,
    [tenantId, normalized],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Invalid credentials");
  const valid = await comparePassword(password, row.password_hash);
  if (!valid) throw new Error("Invalid credentials");

  await query("UPDATE member_accounts SET last_login = NOW() WHERE id = $1", [row.id]);
  return {
    accountId: row.id as string,
    tenantId,
    memberId: row.member_id as string,
    memberName: row.member_name as string,
    phone: row.phone as string,
    tenantName: tenant.name as string,
    tenantSlug: tenant.slug as string,
  };
}

export async function getPortalMemberProfile(tenantId: string, memberId: string) {
  const member = await getMember(tenantId, memberId);
  if (!member) return null;
  const subs = await getSubscriptionsByMember(tenantId, memberId);
  const today = new Date().toISOString().split("T")[0];
  const activeSub = subs.find((s) => {
    const sub = s as Record<string, unknown>;
    return (
      sub.status !== "cancelled" &&
      sub.status !== "expired" &&
      String(sub.startDate) <= today &&
      String(sub.endDate) >= today &&
      (sub.packageType !== "sessions" || (Number(sub.sessionsRemaining) || 0) > 0)
    );
  });
  return { member, activeSubscription: activeSub || null, subscriptions: subs };
}
