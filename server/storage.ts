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
  type ActivityLog,
  type InsertActivityLog,
  users,
  members,
  products,
  attendance,
  subscriptions,
  sales,
  expenses,
  activityLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, gte, and, desc } from "drizzle-orm";

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
  deleteAttendance(id: string): Promise<Attendance | undefined>;

  getSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;

  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  cancelSale(id: string, reason: string): Promise<Sale | undefined>;

  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  getActivityLogs(limit?: number): Promise<ActivityLog[]>;

  getDashboardStats(): Promise<DashboardStats>;
  seedInitialData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private async safeLogActivity(entry: InsertActivityLog): Promise<void> {
    try {
      await db.insert(activityLogs).values(entry);
    } catch (error) {
      console.error("Failed to log activity", error);
    }
  }

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
    await this.safeLogActivity({
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      description: `User created: ${user.username}`,
    });
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
    await this.safeLogActivity({
      action: "member.create",
      entityType: "member",
      entityId: member.id,
      description: `Member created: ${member.name}`,
      metadata: JSON.stringify({ memberId: member.memberId }),
    });
    return member;
  }

  async updateMember(id: string, updates: Partial<InsertMember>): Promise<Member | undefined> {
    const [updated] = await db.update(members).set(updates).where(eq(members.id, id)).returning();
    if (updated) {
      await this.safeLogActivity({
        action: "member.update",
        entityType: "member",
        entityId: updated.id,
        description: `Member updated: ${updated.name}`,
        metadata: JSON.stringify({ updatedFields: Object.keys(updates) }),
      });
    }
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
    await this.safeLogActivity({
      action: "product.create",
      entityType: "product",
      entityId: product.id,
      description: `Product created: ${product.name}`,
      metadata: JSON.stringify({
        price: product.price,
        stock: product.stock,
        category: product.category,
      }),
    });
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    if (updated) {
      await this.safeLogActivity({
        action: "product.update",
        entityType: "product",
        entityId: updated.id,
        description: `Product updated: ${updated.name}`,
        metadata: JSON.stringify({ updatedFields: Object.keys(updates) }),
      });
    }
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
    await this.safeLogActivity({
      action: "attendance.create",
      entityType: "attendance",
      entityId: record.id,
      description: `Attendance recorded for ${record.memberName}`,
      metadata: JSON.stringify({ date: record.date }),
    });
    return record;
  }

  async deleteAttendance(id: string): Promise<Attendance | undefined> {
    const [record] = await db.delete(attendance).where(eq(attendance.id, id)).returning();
    if (record) {
      await this.safeLogActivity({
        action: "attendance.delete",
        entityType: "attendance",
        entityId: record.id,
        description: `Attendance removed for ${record.memberName}`,
        metadata: JSON.stringify({ date: record.date }),
      });
    }
    return record || undefined;
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
    
    await this.safeLogActivity({
      action: "subscription.create",
      entityType: "subscription",
      entityId: subscription.id,
      description: `Subscription created for ${subscription.memberName}`,
      metadata: JSON.stringify({
        planName: subscription.planName,
        amount: subscription.amount,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      }),
    });
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
    
    await this.safeLogActivity({
      action: "sale.create",
      entityType: "sale",
      entityId: sale.id,
      description: `Sale recorded for ${sale.productName}`,
      metadata: JSON.stringify({
        quantity: sale.quantity,
        totalPrice: sale.totalPrice,
        paymentMethod: sale.paymentMethod,
      }),
    });
    return sale;
  }

  async cancelSale(id: string, reason: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    if (!sale) {
      return undefined;
    }

    if (sale.status === "cancelled") {
      return sale;
    }

    const [updated] = await db
      .update(sales)
      .set({
        status: "cancelled",
        cancelledReason: reason,
        cancelledAt: new Date(),
      })
      .where(eq(sales.id, id))
      .returning();

    if (!updated) {
      return undefined;
    }

    const [product] = await db.select().from(products).where(eq(products.id, updated.productId));
    if (product) {
      await db.update(products).set({
        stock: product.stock + updated.quantity,
      }).where(eq(products.id, updated.productId));
    }

    await this.safeLogActivity({
      action: "sale.cancel",
      entityType: "sale",
      entityId: updated.id,
      description: `Sale cancelled for ${updated.productName}`,
      metadata: JSON.stringify({
        reason,
        quantity: updated.quantity,
        totalPrice: updated.totalPrice,
      }),
    });

    return updated;
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    await this.safeLogActivity({
      action: "expense.create",
      entityType: "expense",
      entityId: expense.id,
      description: `Expense recorded (${expense.category})`,
      metadata: JSON.stringify({ amount: expense.amount, date: expense.date }),
    });
    return expense;
  }

  async getActivityLogs(limit = 100): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
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
