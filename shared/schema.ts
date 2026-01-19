export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  role: UserRole;
  createdAt?: string;
}

export interface Member {
  id: string;
  name: string;
  firstName?: string | null;
  grandFatherName?: string | null; // Middle/Second Name
  lastName?: string | null;
  memberId: string;
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
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }[] | null;
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
}

export type InsertSubscription = Omit<Subscription, "id">;

export interface SubscriptionPackage {
  id: string;
  name: string;
  duration: number; // in days
  price: number;
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
  awardedAt: string;
}

export type InsertMemberBelt = Omit<MemberBelt, "id" | "awardedAt"> & { awardedAt?: string };

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  buyerName?: string | null;
  buyerPhone?: string | null;
  date: string;
  paymentMethod?: string | null;
  status?: string | null;
  cancelledReason?: string | null;
  cancelledAt?: string | null;
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
