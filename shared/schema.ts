export type UserRole = "admin" | "staff" | "platform_admin";

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  role: UserRole | string;
  tenantId?: string | null;
  isPlatformAdmin?: boolean;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  status: "active" | "suspended" | "trial" | "cancelled";
  planId?: string | null;
  planName?: string | null;
  trialEndsAt?: string | null;
  memberCount?: number;
  userCount?: number;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  billingCycle?: string | null;
  createdAt?: string;
}

export interface PlatformSubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxMembers: number;
  maxUsers: number;
  features: string[];
  isActive: boolean;
  sortOrder?: number;
  subscriberCount?: number;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId?: string | null;
  planName?: string;
  planSlug?: string;
  planDescription?: string | null;
  status: "active" | "past_due" | "cancelled" | "trialing";
  billingCycle: "monthly" | "yearly";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  priceMonthly?: number;
  priceYearly?: number;
  maxMembers?: number;
  maxUsers?: number;
  features?: string[];
}

export interface Role {
  id: string;
  name: string;
  permissions?: string[];
  isSystem?: boolean;
}

export type { ClubTypeId, ProgressionConfig, ModuleConfig, MemberFieldConfig, CustomFieldDef, PackageType } from "./clubTypes";

export interface Member {
  id: string;
  name: string;
  firstName?: string | null;
  fatherName?: string | null; // Middle/Second Name
  lastName?: string | null;
  memberId: string;
  cpr?: string | null;
  phone: string;
  email?: string | null;
  dob?: string | null; // Date of Birth
  gender?: "male" | "female" | null;
  age?: number | null;
  height?: string | null;
  weight?: string | null;
  bloodType?: string | null;
  beltSize?: string | null;
  suitSize?: string | null;
  healthNotes?: string | null;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  status: string;
  balance?: number | null;
  imageUrl?: string | null;
  documents?: {
    name: string;
    label?: string | null;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }[] | null;
  customFields?: Record<string, string | number | null> | null;
  branchId?: string | null;
}

export type InsertMember = Omit<Member, "id">;

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string | null;
  trackInventory?: boolean;
}

export type InsertProduct = Omit<Product, "id">;

export interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
}

export type InsertAttendance = Omit<Attendance, "id">;

export interface Subscription {
  id: string;
  memberId: string;
  memberName: string;
  planName: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus?: "paid" | "pending" | "unpaid";
  paymentMethod?: string | null;
  packageType?: "duration" | "sessions";
  sessionsTotal?: number | null;
  sessionsRemaining?: number | null;
  createdAt?: string;
}

export type InsertSubscription = Omit<Subscription, "id">;

export interface SubscriptionPackage {
  id: string;
  name: string;
  duration: number; // validity in days
  price: number;
  packageType?: "duration" | "sessions";
  sessionCount?: number | null;
}

export type InsertSubscriptionPackage = Omit<SubscriptionPackage, "id">;

export interface Belt {
  id: string;
  name: string;
  color: string; // Hex code
  order: number; // 1, 2, 3...
}

export type InsertBelt = Omit<Belt, "id">;

export interface MemberBelt {
  id: string;
  memberId: string;
  beltId: string;
  stripes?: number;
  awardedAt: string;
}

export interface TenantSettings {
  name?: string;
  clubType?: string;
  progressionConfig?: import("./clubTypes").ProgressionConfig;
  memberFieldConfig?: import("./clubTypes").MemberFieldConfig;
  moduleConfig?: import("./clubTypes").ModuleConfig;
  logoUrlLight?: string;
  logoUrlDark?: string;
  managerEmail?: string;
  phone?: string;
  location?: string;
}

export type InsertMemberBelt = Omit<MemberBelt, "id" | "awardedAt"> & { awardedAt?: string };

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  memberId?: string;
  buyerName?: string | null;
  buyerPhone?: string | null;
  date: string;
  paymentMethod?: string | null;
  paymentStatus?: "paid" | "unpaid" | "partially_paid" | "pending";
  status?: string | null;
  cancelledReason?: string | null;
  cancelledAt?: string | null;
  receiptId?: string | null;
  subscriptionId?: string | null;
}

export type InsertSale = Omit<Sale, "id">;

export interface Expense {
  id: string;
  category: string;
  description?: string | null;
  amount: number;
  date: string;
  expensesTitle?: string;
}

export type InsertExpense = Omit<Expense, "id">;

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export type InsertActivityLog = Omit<ActivityLog, "id" | "createdAt"> & {
  createdAt?: string;
};

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  startDate: string; // ISO string
  endDate?: string | null; // ISO string
  isAllDay?: boolean;
  color?: string; // hex color
  createdBy?: string;
}

export type InsertEvent = Omit<Event, "id">;

export interface RecurrenceSlot {
  day: number;
  startTime: string;
}

export interface Coach {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  userId?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export type InsertCoach = Omit<Coach, "id" | "createdAt">;

export interface ClassTemplate {
  id: string;
  name: string;
  description?: string | null;
  coachId?: string | null;
  coachName?: string | null;
  location?: string | null;
  capacity: number;
  durationMinutes: number;
  color?: string | null;
  recurrence: RecurrenceSlot[];
  allowedPackageIds?: string[];
  deductSession?: boolean;
  isActive?: boolean;
  branchId?: string | null;
  createdAt?: string;
}

export type InsertClassTemplate = Omit<ClassTemplate, "id" | "createdAt" | "coachName">;

export interface ClassSession {
  id: string;
  templateId?: string | null;
  name: string;
  coachId?: string | null;
  coachName?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount?: number;
  status: "scheduled" | "cancelled" | "completed";
  notes?: string | null;
  branchId?: string | null;
  createdAt?: string;
}

export type InsertClassSession = Omit<ClassSession, "id" | "createdAt" | "coachName" | "bookedCount">;

export interface BookingSettings {
  tenantId?: string;
  bookingWindowDays: number;
  cancellationHours: number;
  allowWaitlist: boolean;
  autoPromoteWaitlist: boolean;
  portalEnabled: boolean;
  tapEnabled?: boolean;
  widgetEnabled?: boolean;
  paymentGraceDays?: number;
  allowRefunds?: boolean;
  refundWindowHours?: number;
  portalPrimaryColor?: string | null;
  portalWelcomeMessage?: string | null;
  publicSlug?: string | null;
  appDirectoryEnabled?: boolean;
}

export interface MemberPayment {
  id: string;
  memberId: string;
  packageId?: string | null;
  subscriptionId?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "captured" | "failed" | "refunded";
  paymentType?: "one_time" | "recurring" | "manual";
  packageName?: string | null;
  invoiceNumber?: string | null;
  paidAt?: string | null;
  createdAt?: string;
}

export interface NotificationTemplate {
  id: string;
  eventKey: string;
  channel: "email" | "whatsapp" | "sms";
  subject?: string | null;
  body: string;
  isEnabled: boolean;
}

export interface MemberAccount {
  id: string;
  memberId: string;
  phone: string;
  email?: string | null;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
}

export interface Booking {
  id: string;
  sessionId: string;
  memberId: string;
  memberName: string;
  status: "confirmed" | "cancelled" | "waitlist" | "no_show" | "attended";
  bookedAt: string;
  cancelledAt?: string | null;
  attendedAt?: string | null;
  bookedBy?: "member" | "staff";
  sessionName?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string | null;
  coachName?: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DashboardStats {
  totalMembers: number;
  activeSubscriptions: number;
  monthlyIncome: number;
  netProfit: number;
  totalExpenses: number;
  expensesByCategory: { category: string; total: number }[];
  newMembersThisMonth: number;
  expiringSubscriptions: Member[];
  salesIncome: number;
  recentTransactions: (Sale | Subscription)[];
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
