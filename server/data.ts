import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase, formatDate, formatTimestamp, uniqueSlug } from "./utils.js";
import { hashPassword } from "./auth.js";

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
      subscription_start, subscription_end, status, balance, image_url, documents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     RETURNING *`,
    [
      tenantId, memberId, data.name, data.firstName || null, data.fatherName || null, data.lastName || null,
      data.cpr || null, data.phone, data.email || null, data.dob || null, data.gender || null,
      data.age || null, data.height || null, data.weight || null, data.bloodType || null,
      data.beltSize || null, data.suitSize || null, data.healthNotes || null,
      data.subscriptionStart || null, data.subscriptionEnd || null,
      data.status || "inactive", data.balance ?? 0, data.imageUrl || null,
      JSON.stringify(data.documents || []),
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
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx++}`);
      values.push(key === "documents" ? JSON.stringify(updates[key]) : updates[key]);
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
  return toCamelCase(result.rows[0]);
}

export async function deleteAttendance(tenantId: string, id: string) {
  await query("DELETE FROM attendance WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ─── Subscriptions ─────────────────────────────────────────────────────────

export async function getSubscriptions(tenantId: string) {
  const result = await query("SELECT * FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC", [tenantId]);
  return rowsToCamel(result.rows).map((s) => ({
    ...s,
    startDate: formatDate((s as Record<string, unknown>).startDate),
    endDate: formatDate((s as Record<string, unknown>).endDate),
  }));
}

export async function getSubscriptionsByMember(tenantId: string, memberId: string) {
  const result = await query(
    "SELECT * FROM subscriptions WHERE tenant_id = $1 AND member_id = $2 ORDER BY start_date DESC",
    [tenantId, memberId],
  );
  return rowsToCamel(result.rows).map((s) => ({
    ...s,
    startDate: formatDate((s as Record<string, unknown>).startDate),
    endDate: formatDate((s as Record<string, unknown>).endDate),
  }));
}

export async function createSubscription(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO subscriptions (tenant_id, member_id, member_name, plan_name, amount, start_date, end_date, status, payment_status, payment_method)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      tenantId, data.memberId, data.memberName, data.planName, data.amount,
      data.startDate, data.endDate, data.status || "active",
      data.paymentStatus || "pending", data.paymentMethod || null,
    ],
  );
  const sub = toCamelCase(result.rows[0]);
  await syncMemberSubscriptionStatus(tenantId, data.memberId as string);
  return { ...sub, startDate: formatDate(sub.startDate), endDate: formatDate(sub.endDate) };
}

export async function updateSubscription(tenantId: string, id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  const map: Record<string, string> = {
    planName: "plan_name", amount: "amount", startDate: "start_date", endDate: "end_date",
    status: "status", paymentStatus: "payment_status", paymentMethod: "payment_method",
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
    if (start <= today && end >= today && row.status !== "cancelled") {
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
    "INSERT INTO packages (tenant_id, name, duration, price) VALUES ($1,$2,$3,$4) RETURNING *",
    [tenantId, data.name, data.duration, data.price],
  );
  return toCamelCase(result.rows[0]);
}

export async function updatePackage(tenantId: string, id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const key of ["name", "duration", "price"]) {
    if (key in updates) { fields.push(`${key} = $${idx++}`); values.push(updates[key]); }
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
  return rowsToCamel(result.rows).map((b) => ({
    ...b,
    awardedAt: formatTimestamp((b as Record<string, unknown>).awardedAt),
  }));
}

export async function awardBeltToMember(tenantId: string, data: Record<string, unknown>) {
  const result = await query(
    "INSERT INTO member_belts (tenant_id, member_id, belt_id, awarded_at) VALUES ($1,$2,$3,$4) RETURNING *",
    [tenantId, data.memberId, data.beltId, data.awardedAt || new Date().toISOString()],
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

export async function getSales(tenantId: string) {
  const result = await query("SELECT * FROM sales WHERE tenant_id = $1 ORDER BY date DESC", [tenantId]);
  return rowsToCamel(result.rows).map((s) => ({ ...s, date: formatTimestamp((s as Record<string, unknown>).date) }));
}

export async function getSalesByMember(tenantId: string, memberId: string) {
  const result = await query(
    "SELECT * FROM sales WHERE tenant_id = $1 AND member_id = $2 ORDER BY date DESC",
    [tenantId, memberId],
  );
  return rowsToCamel(result.rows).map((s) => ({ ...s, date: formatTimestamp((s as Record<string, unknown>).date) }));
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

export async function getExpenses(tenantId: string) {
  const result = await query("SELECT * FROM expenses WHERE tenant_id = $1 ORDER BY date DESC", [tenantId]);
  return rowsToCamel(result.rows).map((e) => ({ ...e, date: formatDate((e as Record<string, unknown>).date) }));
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

export async function getSettings(tenantId: string) {
  const result = await query("SELECT * FROM tenant_settings WHERE tenant_id = $1", [tenantId]);
  if (!result.rows[0]) return null;
  const s = toCamelCase(result.rows[0]);
  return {
    ...s,
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
  await query(`UPDATE tenant_settings SET ${fields.join(", ")} WHERE tenant_id = $1`, values);
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

  const activeSubscriptions = members.filter((m) => (m as { status: string }).status === "active").length;
  const monthlyIncome = subscriptions
    .filter((s) => (s as { startDate: string }).startDate >= start && (s as { startDate: string }).startDate <= end)
    .reduce((sum, s) => sum + Number((s as { amount: number }).amount), 0);
  const salesIncome = sales
    .filter((s) => (s as { date: string; status: string }).date.split("T")[0] >= start
      && (s as { date: string }).date.split("T")[0] <= end
      && (s as { status: string }).status !== "cancelled")
    .reduce((sum, s) => sum + Number((s as { totalPrice: number }).totalPrice), 0);
  const filteredExpenses = expenses.filter((e) => (e as { date: string }).date >= start && (e as { date: string }).date <= end);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number((e as { amount: number }).amount), 0);
  const expensesByCategoryMap: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    const cat = (e as { category: string }).category;
    expensesByCategoryMap[cat] = (expensesByCategoryMap[cat] || 0) + Number((e as { amount: number }).amount);
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const next10 = new Date(); next10.setDate(next10.getDate() + 10);
  const next10Str = next10.toISOString().split("T")[0];

  const expiringSubscriptions = members.filter((m) => {
    const mem = m as { subscriptionEnd?: string; status: string; id: string };
    if (!mem.subscriptionEnd || mem.subscriptionEnd < todayStr || mem.subscriptionEnd > next10Str) return false;
    const hasFuture = subscriptions.some(
      (s) => (s as { memberId: string; startDate: string }).memberId === mem.id
        && (s as { startDate: string }).startDate > todayStr,
    );
    return !hasFuture;
  });

  const recentTransactions = [
    ...sales.filter((s) => (s as { date: string; status: string }).date.split("T")[0] >= start
      && (s as { date: string }).date.split("T")[0] <= end
      && (s as { status: string }).status !== "cancelled"),
    ...subscriptions.filter((s) => (s as { startDate: string }).startDate >= start && (s as { startDate: string }).startDate <= end)
      .map((s) => ({ ...s, date: (s as { startDate: string }).startDate })),
  ].sort((a, b) => String((b as { date: string }).date).localeCompare(String((a as { date: string }).date))).slice(0, 10);

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
}) {
  const slug = await uniqueSlug(params.clubName, async (s) => {
    const r = await query("SELECT id FROM tenants WHERE slug = $1", [s]);
    return r.rows.length > 0;
  });

  const planResult = await query(
    "SELECT id FROM subscription_plans WHERE slug = $1 AND is_active = true",
    [params.planSlug || "starter"],
  );
  const planId = planResult.rows[0]?.id;
  if (!planId) throw new Error("Invalid plan");

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const tenantResult = await query(
    `INSERT INTO tenants (name, slug, email, phone, status, plan_id, trial_ends_at)
     VALUES ($1,$2,$3,$4,'trial',$5,$6) RETURNING *`,
    [params.clubName, slug, params.email, params.phone || null, planId, trialEnd.toISOString()],
  );
  const tenant = tenantResult.rows[0];
  const tenantId = tenant.id;

  await query(
    `INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
     VALUES ($1,$2,'trialing','monthly',NOW(),$3)`,
    [tenantId, planId, trialEnd.toISOString()],
  );

  const hash = await hashPassword(params.password);
  const userResult = await query(
    "INSERT INTO users (tenant_id, email, password_hash, display_name, role) VALUES ($1,$2,$3,$4,'admin') RETURNING *",
    [tenantId, params.email, hash, params.adminName],
  );

  await query(
    `INSERT INTO tenant_settings (tenant_id, name, manager_email) VALUES ($1,$2,$3)`,
    [tenantId, params.clubName, params.email],
  );
  await query("INSERT INTO tenant_counters (tenant_id, member_count) VALUES ($1, 1000)", [tenantId]);
  await query(
    `INSERT INTO roles (tenant_id, id, name, permissions, is_system) VALUES
     ($1,'admin','Admin','["*"]',true), ($1,'staff','Staff','[]',true)`,
    [tenantId],
  );

  return { tenant: toCamelCase(tenant), user: toCamelCase(userResult.rows[0]) };
}

// ─── Platform Admin ────────────────────────────────────────────────────────

export async function getAllTenants() {
  const result = await query(`
    SELECT t.*, sp.name as plan_name, sp.price_monthly,
      ts.status as subscription_status, ts.current_period_end, ts.billing_cycle,
      (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id) as member_count,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count
    FROM tenants t
    LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
    LEFT JOIN LATERAL (
      SELECT * FROM tenant_subscriptions WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1
    ) ts ON true
    ORDER BY t.created_at DESC
  `);
  return rowsToCamel(result.rows);
}

export async function getTenantById(id: string) {
  const result = await query(`
    SELECT t.*, sp.name as plan_name, sp.price_monthly, sp.max_members, sp.max_users,
      ts.status as subscription_status, ts.current_period_end, ts.billing_cycle
    FROM tenants t
    LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
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
  for (const key of ["name", "email", "phone", "status", "planId"]) {
    if (key in updates) {
      const col = key === "planId" ? "plan_id" : key;
      fields.push(`${col} = $${idx++}`);
      values.push(updates[key]);
    }
  }
  if (fields.length > 1) await query(`UPDATE tenants SET ${fields.join(", ")} WHERE id = $1`, values);
}

export async function getSubscriptionPlans() {
  const result = await query("SELECT * FROM subscription_plans ORDER BY sort_order");
  return rowsToCamel(result.rows);
}

export async function getPlatformStats() {
  const tenants = await query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active, COUNT(*) FILTER (WHERE status = 'trial') as trial FROM tenants");
  const revenue = await query(`
    SELECT COALESCE(SUM(sp.price_monthly), 0) as mrr
    FROM tenants t JOIN subscription_plans sp ON t.plan_id = sp.id
    WHERE t.status IN ('active', 'trial')
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
    SELECT ts.*, sp.name as plan_name, sp.price_monthly, sp.price_yearly, sp.max_members, sp.max_users, sp.features
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.tenant_id = $1
    ORDER BY ts.created_at DESC LIMIT 1
  `, [tenantId]);
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function checkTenantAccess(tenantId: string): Promise<{
  allowed: boolean;
  reason?: string;
  code?: "subscription_suspended" | "subscription_cancelled" | "trial_expired";
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
  if (status === "trial" && trial_ends_at && new Date(trial_ends_at) < new Date()) {
    return { allowed: false, reason: "Trial expired", code: "trial_expired" };
  }
  return { allowed: true };
}
