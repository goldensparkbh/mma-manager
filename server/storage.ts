import {
  type User,
  type InsertUser,
  type Member,
  type InsertMember,
  type Product,
  type InsertProduct,
  type Attendance,
  type InsertAttendance,
  type Subscription,
  type InsertSubscription,
  type Sale,
  type InsertSale,
  type Expense,
  type InsertExpense,
  type DashboardStats,
  users,
  members,
  products,
  attendance,
  subscriptions,
  sales,
  expenses,
} from "@shared/schema";
import { db } from "./db";
import { eq, gte, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member | undefined>;

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;

  getAttendance(date?: string): Promise<Attendance[]>;
  createAttendance(attendanceRecord: InsertAttendance): Promise<Attendance>;

  getSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;

  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;

  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  getDashboardStats(): Promise<DashboardStats>;
  seedInitialData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getMembers(): Promise<Member[]> {
    return db.select().from(members);
  }

  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || undefined;
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values(insertMember).returning();
    return member;
  }

  async updateMember(id: string, updates: Partial<InsertMember>): Promise<Member | undefined> {
    const [updated] = await db.update(members).set(updates).where(eq(members.id, id)).returning();
    return updated || undefined;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated || undefined;
  }

  async getAttendance(date?: string): Promise<Attendance[]> {
    if (date) {
      return db.select().from(attendance).where(eq(attendance.date, date));
    }
    return db.select().from(attendance);
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(insertAttendance).returning();
    return record;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions);
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(insertSubscription).returning();
    
    if (insertSubscription.memberId) {
      await db.update(members).set({
        subscriptionStart: insertSubscription.startDate,
        subscriptionEnd: insertSubscription.endDate,
        status: "active",
      }).where(eq(members.id, insertSubscription.memberId));
    }
    
    return subscription;
  }

  async getSales(): Promise<Sale[]> {
    return db.select().from(sales);
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(insertSale).returning();
    
    const [product] = await db.select().from(products).where(eq(products.id, insertSale.productId));
    if (product) {
      await db.update(products).set({
        stock: Math.max(0, product.stock - insertSale.quantity),
      }).where(eq(products.id, insertSale.productId));
    }
    
    return sale;
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allMembers = await db.select().from(members);
    const allSubscriptions = await db.select().from(subscriptions);
    const allExpenses = await db.select().from(expenses);

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

    const activeSubscriptions = allSubscriptions.filter((s) => {
      const endDate = new Date(s.endDate);
      return endDate >= today && s.status === "active";
    }).length;

    const monthlyIncome = allSubscriptions
      .filter((s) => s.startDate >= startOfMonthStr)
      .reduce((sum, s) => sum + s.amount, 0);

    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = monthlyIncome - totalExpenses;

    const newMembersThisMonth = allMembers.filter((m) => {
      return m.subscriptionStart && m.subscriptionStart >= startOfMonthStr;
    }).length;

    const expiringSubscriptions = allMembers.filter((m) => {
      if (!m.subscriptionEnd) return false;
      const endDate = new Date(m.subscriptionEnd);
      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    });

    return {
      totalMembers: allMembers.length,
      activeSubscriptions,
      monthlyIncome,
      netProfit,
      newMembersThisMonth,
      expiringSubscriptions,
    };
  }

  async seedInitialData(): Promise<void> {
    const existingMembers = await db.select().from(members);
    if (existingMembers.length > 0) {
      return;
    }

    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    const memberData: InsertMember[] = [
      {
        name: "أحمد علي",
        memberId: "1023",
        phone: "33000000",
        age: 25,
        healthNotes: "",
        subscriptionStart: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        subscriptionEnd: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)),
        status: "active",
        balance: 0,
      },
      {
        name: "محمد سالم",
        memberId: "1044",
        phone: "33111111",
        age: 30,
        healthNotes: "",
        subscriptionStart: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 5)),
        subscriptionEnd: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)),
        status: "active",
        balance: 0,
      },
      {
        name: "سعيد حسن",
        memberId: "0999",
        phone: "33222222",
        age: 28,
        healthNotes: "ربو خفيف",
        subscriptionStart: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 13)),
        subscriptionEnd: formatDate(today),
        status: "active",
        balance: 0,
      },
      {
        name: "خالد عبدالله",
        memberId: "1055",
        phone: "33333333",
        age: 22,
        healthNotes: "",
        subscriptionStart: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        subscriptionEnd: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
        status: "active",
        balance: 50,
      },
      {
        name: "عمر فيصل",
        memberId: "1060",
        phone: "33444444",
        age: 35,
        healthNotes: "",
        subscriptionStart: formatDate(new Date(today.getFullYear(), today.getMonth(), 5)),
        subscriptionEnd: formatDate(new Date(today.getFullYear(), today.getMonth() + 3, 5)),
        status: "active",
        balance: 0,
      },
    ];

    const insertedMembers = await db.insert(members).values(memberData).returning();

    const productData: InsertProduct[] = [
      {
        name: "بروتين واي جولد ستاندرد",
        description: "بروتين عالي الجودة للرياضيين - 2.27 كجم",
        price: 35,
        stock: 15,
        category: "supplements",
        imageUrl: "",
      },
      {
        name: "كرياتين مونوهيدرات",
        description: "كرياتين نقي 100% - 500 جرام",
        price: 12,
        stock: 25,
        category: "supplements",
        imageUrl: "",
      },
      {
        name: "حبل قفز احترافي",
        description: "حبل قفز للتمارين الهوائية",
        price: 5,
        stock: 30,
        category: "equipment",
        imageUrl: "",
      },
      {
        name: "قفازات رفع أثقال",
        description: "قفازات جلدية لحماية اليدين",
        price: 8,
        stock: 20,
        category: "accessories",
        imageUrl: "",
      },
      {
        name: "تيشيرت رياضي",
        description: "تيشيرت قطني للتمارين - مقاسات متعددة",
        price: 10,
        stock: 50,
        category: "clothing",
        imageUrl: "",
      },
      {
        name: "مشروب طاقة",
        description: "مشروب طاقة رياضي - عبوة 500 مل",
        price: 1.5,
        stock: 100,
        category: "drinks",
        imageUrl: "",
      },
    ];

    await db.insert(products).values(productData);

    const expenseData: InsertExpense[] = [
      { category: "rent", description: "إيجار شهر الحالي", amount: 800, date: formatDate(today) },
      { category: "salaries", description: "رواتب المدربين", amount: 600, date: formatDate(today) },
      { category: "utilities", description: "فاتورة كهرباء", amount: 150, date: formatDate(today) },
      { category: "maintenance", description: "صيانة أجهزة", amount: 50, date: formatDate(today) },
    ];

    await db.insert(expenses).values(expenseData);

    const subscriptionData: InsertSubscription[] = insertedMembers.slice(0, 4).map((m) => ({
      memberId: m.id,
      memberName: m.name,
      planName: "شهري",
      amount: 25,
      startDate: m.subscriptionStart ?? formatDate(today),
      endDate: m.subscriptionEnd ?? formatDate(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())),
      status: "active",
      paymentMethod: "cash",
    }));

    if (insertedMembers[4]) {
      subscriptionData.push({
        memberId: insertedMembers[4].id,
        memberName: insertedMembers[4].name,
        planName: "ربع سنوي",
        amount: 65,
        startDate: insertedMembers[4].subscriptionStart ?? formatDate(today),
        endDate: insertedMembers[4].subscriptionEnd ?? formatDate(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())),
        status: "active",
        paymentMethod: "card",
      });
    }

    await db.insert(subscriptions).values(subscriptionData);
  }
}

export const storage = new DatabaseStorage();
