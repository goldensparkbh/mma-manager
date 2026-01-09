import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  memberId: text("member_id").notNull().unique(),
  phone: text("phone").notNull(),
  age: integer("age"),
  healthNotes: text("health_notes"),
  subscriptionStart: text("subscription_start"),
  subscriptionEnd: text("subscription_end"),
  status: text("status").notNull().default("active"),
  balance: real("balance").default(0),
  imageUrl: text("image_url"),
});

export const insertMemberSchema = createInsertSchema(members).omit({ id: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull().default("general"),
  imageUrl: text("image_url"),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  date: text("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  notes: text("notes"),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  planName: text("plan_name").notNull(),
  amount: real("amount").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("active"),
  paymentMethod: text("payment_method").default("cash"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  buyerName: text("buyer_name"),
  buyerPhone: text("buyer_phone"),
  date: text("date").notNull(),
  paymentMethod: text("payment_method").default("cash"),
  status: text("status").notNull().default("completed"),
  cancelledReason: text("cancelled_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
});

export const insertSaleSchema = createInsertSchema(sales).omit({ id: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  description: text("description"),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DashboardStats {
  totalMembers: number;
  activeSubscriptions: number;
  monthlyIncome: number;
  netProfit: number;
  newMembersThisMonth: number;
  expiringSubscriptions: Member[];
}

export interface FinanceReport {
  totalSubscriptionIncome: number;
  totalProductSales: number;
  totalExpenses: number;
  netProfit: number;
  subscriptionsByPlan: { plan: string; count: number; total: number }[];
  expensesByCategory: { category: string; total: number }[];
  recentSales: Sale[];
}
