import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Timestamp,
  limit,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import type {
  ActivityLog,
  Attendance,
  DashboardStats,
  Expense,
  InsertActivityLog,
  InsertAttendance,
  InsertExpense,
  InsertMember,
  InsertProduct,
  InsertSale,
  InsertSubscription,
  Member,
  Product,
  Sale,
  Subscription,
  SubscriptionPackage,
  InsertSubscriptionPackage,
  Belt,
  InsertBelt,
  MemberBelt,
  InsertMemberBelt,
} from "@shared/schema";

const normalizeTimestamp = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if ((value as Timestamp).toDate) {
    return (value as Timestamp).toDate().toISOString();
  }
  return "";
};

const mapDoc = <T>(snapshot: DocumentData) => {
  return { id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) } as T;
};

const mapDocs = <T>(snapshots: QuerySnapshot<DocumentData>) => {
  return snapshots.docs.map((snapshot) => mapDoc<T>(snapshot));
};

async function safeLogActivity(entry: InsertActivityLog) {
  try {
    await addDoc(collection(db, "activityLogs"), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}

export async function getMembers(): Promise<Member[]> {
  const snapshots = await getDocs(collection(db, "members"));
  return mapDocs<Member>(snapshots);
}

export async function createMember(data: InsertMember & { imageFile?: File | null }) {
  const { imageFile, ...memberData } = data;
  const docRef = doc(collection(db, "members"));
  let imageUrl = memberData.imageUrl ?? "";

  if (imageFile) {
    const storageRef = ref(storage, `members/${docRef.id}/profile`);
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  const payload = {
    ...memberData,
    imageUrl: imageUrl || null,
    balance: memberData.balance ?? 0,
  };

  await setDoc(docRef, payload);

  await safeLogActivity({
    action: "member.create",
    entityType: "member",
    entityId: docRef.id,
    description: `Member created: ${memberData.name}`,
    metadata: JSON.stringify({ memberId: memberData.memberId }),
  });

  return { id: docRef.id, ...payload } as Member;
}

export async function updateMember(id: string, updates: Partial<InsertMember>) {
  const docRef = doc(db, "members", id);
  await updateDoc(docRef, updates);
  await safeLogActivity({
    action: "member.update",
    entityType: "member",
    entityId: id,
    description: "Member updated",
    metadata: JSON.stringify({ updatedFields: Object.keys(updates) }),
  });
}

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  const snapshots = await getDocs(
    query(collection(db, "attendance"), where("date", "==", date))
  );
  return mapDocs<Attendance>(snapshots);
}

export async function createAttendance(data: InsertAttendance): Promise<Attendance> {
  const docRef = await addDoc(collection(db, "attendance"), data);
  await safeLogActivity({
    action: "attendance.create",
    entityType: "attendance",
    entityId: docRef.id,
    description: `Attendance recorded for ${data.memberName}`,
    metadata: JSON.stringify({ date: data.date }),
  });
  return { id: docRef.id, ...data };
}

export async function deleteAttendance(id: string) {
  const docRef = doc(db, "attendance", id);
  const existing = await getDoc(docRef);
  await deleteDoc(docRef);
  if (existing.exists()) {
    const record = existing.data() as Attendance;
    await safeLogActivity({
      action: "attendance.delete",
      entityType: "attendance",
      entityId: id,
      description: `Attendance removed for ${record.memberName}`,
      metadata: JSON.stringify({ date: record.date }),
    });
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const snapshots = await getDocs(collection(db, "subscriptions"));
  return mapDocs<Subscription>(snapshots);
}

export async function createSubscription(data: InsertSubscription): Promise<Subscription> {
  const docRef = await addDoc(collection(db, "subscriptions"), data);
  if (data.memberId) {
    const memberRef = doc(db, "members", data.memberId);
    await updateDoc(memberRef, {
      subscriptionStart: data.startDate,
      subscriptionEnd: data.endDate,
      status: "active",
    });
  }
  await safeLogActivity({
    action: "subscription.create",
    entityType: "subscription",
    entityId: docRef.id,
    description: `Subscription created for ${data.memberName}`,
    metadata: JSON.stringify({
      planName: data.planName,
      amount: data.amount,
      startDate: data.startDate,
      endDate: data.endDate,
    }),
  });
  return { id: docRef.id, ...data };
}

export async function getProducts(): Promise<Product[]> {
  const snapshots = await getDocs(collection(db, "products"));
  return mapDocs<Product>(snapshots);
}

export async function createProduct(
  data: InsertProduct & { imageFile?: File | null }
): Promise<Product> {
  const { imageFile, ...productData } = data;
  const docRef = doc(collection(db, "products"));
  let imageUrl = productData.imageUrl ?? "";

  if (imageFile) {
    const storageRef = ref(storage, `products/${docRef.id}/image`);
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  const payload = {
    ...productData,
    imageUrl: imageUrl || null,
  };

  await setDoc(docRef, payload);
  await safeLogActivity({
    action: "product.create",
    entityType: "product",
    entityId: docRef.id,
    description: `Product created: ${productData.name}`,
  });
  return { id: docRef.id, ...payload };
}

export async function updateProduct(
  id: string,
  updates: Partial<InsertProduct> & { imageFile?: File | null }
) {
  const { imageFile, ...updateData } = updates;
  const docRef = doc(db, "products", id);
  const payload: Partial<InsertProduct> = { ...updateData };

  if (payload.imageUrl === "") {
    payload.imageUrl = null;
  }

  if (imageFile) {
    const storageRef = ref(storage, `products/${id}/image`);
    await uploadBytes(storageRef, imageFile);
    payload.imageUrl = await getDownloadURL(storageRef);
  }

  await updateDoc(docRef, payload);
  await safeLogActivity({
    action: "product.update",
    entityType: "product",
    entityId: id,
    description: "Product updated",
    metadata: JSON.stringify({ updatedFields: Object.keys(payload) }),
  });
}

export async function getSales(): Promise<Sale[]> {
  const snapshots = await getDocs(collection(db, "sales"));
  return snapshots.docs.map((snapshot) => {
    const data = snapshot.data() as Sale;
    return {
      id: snapshot.id,
      ...data,
      cancelledAt: normalizeTimestamp(data.cancelledAt),
    };
  });
}

export async function createSale(data: InsertSale): Promise<Sale> {
  const saleRef = doc(collection(db, "sales"));
  await runTransaction(db, async (transaction) => {
    const productRef = doc(db, "products", data.productId);
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }
    const product = productSnap.data() as Product;
    const currentStock = product.stock ?? 0;
    if (currentStock < data.quantity) {
      throw new Error("Insufficient stock");
    }
    transaction.update(productRef, {
      stock: currentStock - data.quantity,
    });
    transaction.set(saleRef, {
      ...data,
      status: data.status ?? "completed",
    });
  });

  await safeLogActivity({
    action: "sale.create",
    entityType: "sale",
    entityId: saleRef.id,
    description: `Sale recorded for ${data.productName}`,
    metadata: JSON.stringify({ quantity: data.quantity, totalPrice: data.totalPrice }),
  });

  return { id: saleRef.id, ...data, status: data.status ?? "completed" };
}

export async function cancelSale(id: string, reason: string): Promise<Sale | null> {
  const docRef = doc(db, "sales", id);
  const saleSnap = await getDoc(docRef);
  if (!saleSnap.exists()) return null;

  const sale = saleSnap.data() as Sale;
  if (sale.status === "cancelled") {
    return { ...sale, id };
  }

  const cancelledAt = new Date().toISOString();
  await updateDoc(docRef, {
    status: "cancelled",
    cancelledReason: reason,
    cancelledAt,
  });

  const productRef = doc(db, "products", sale.productId);
  const productSnap = await getDoc(productRef);
  if (productSnap.exists()) {
    const product = productSnap.data() as Product;
    await updateDoc(productRef, {
      stock: (product.stock ?? 0) + sale.quantity,
    });
  }

  await safeLogActivity({
    action: "sale.cancel",
    entityType: "sale",
    entityId: id,
    description: `Sale cancelled for ${sale.productName}`,
    metadata: JSON.stringify({ reason }),
  });

  return {
    id,
    ...sale,
    status: "cancelled",
    cancelledReason: reason,
    cancelledAt,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const snapshots = await getDocs(collection(db, "expenses"));
  return mapDocs<Expense>(snapshots);
}

export async function createExpense(data: InsertExpense): Promise<Expense> {
  const docRef = await addDoc(collection(db, "expenses"), data);
  await safeLogActivity({
    action: "expense.create",
    entityType: "expense",
    entityId: docRef.id,
    description: `Expense recorded (${data.category})`,
    metadata: JSON.stringify({ amount: data.amount, date: data.date }),
  });
  return { id: docRef.id, ...data };
}

export async function getActivityLogs(limitCount = 100): Promise<ActivityLog[]> {
  const snapshots = await getDocs(
    query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(limitCount))
  );
  return snapshots.docs.map((snapshot) => {
    const data = snapshot.data() as ActivityLog;
    return {
      id: snapshot.id,
      ...data,
      createdAt: normalizeTimestamp(data.createdAt) || new Date().toISOString(),
    };
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [members, subscriptions, expenses] = await Promise.all([
    getMembers(),
    getSubscriptions(),
    getExpenses(),
  ]);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  const activeSubscriptions = subscriptions.filter((s) => {
    const endDate = new Date(s.endDate);
    return endDate >= today && s.status === "active";
  }).length;

  const monthlyIncome = subscriptions
    .filter((s) => s.startDate >= startOfMonthStr)
    .reduce((sum, s) => sum + s.amount, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = monthlyIncome - totalExpenses;

  const newMembersThisMonth = members.filter((m) => {
    return m.subscriptionStart && m.subscriptionStart >= startOfMonthStr;
  }).length;

  const expiringSubscriptions = members.filter((m) => {
    if (!m.subscriptionEnd) return false;
    const endDate = new Date(m.subscriptionEnd);
    const diffDays = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 7 && diffDays >= 0;
  });

  return {
    totalMembers: members.length,
    activeSubscriptions,
    monthlyIncome,
    netProfit,
    newMembersThisMonth,
    expiringSubscriptions,
  };
}

export async function ensureUserRole(userId: string, role: string) {
  const docRef = doc(db, "users", userId);
  await setDoc(docRef, { role }, { merge: true });
}

export async function getSubscriptionPackages(): Promise<SubscriptionPackage[]> {
  const snapshots = await getDocs(collection(db, "packages"));
  return mapDocs<SubscriptionPackage>(snapshots);
}

export async function createSubscriptionPackage(data: InsertSubscriptionPackage): Promise<SubscriptionPackage> {
  const docRef = await addDoc(collection(db, "packages"), data);
  await safeLogActivity({
    action: "package.create",
    entityType: "package",
    entityId: docRef.id,
    description: `Package created: ${data.name}`,
    metadata: JSON.stringify(data),
  });
  return { id: docRef.id, ...data };
}

export async function deleteSubscriptionPackage(id: string) {
  await deleteDoc(doc(db, "packages", id));
  await safeLogActivity({
    action: "package.delete",
    entityType: "package",
    entityId: id,
    description: "Package deleted",
  });
}

// Belts Management
export async function getBelts(): Promise<Belt[]> {
  const q = query(collection(db, "belts"), orderBy("order", "asc"));
  const snapshots = await getDocs(q);
  return mapDocs<Belt>(snapshots);
}

export async function createBelt(data: InsertBelt): Promise<Belt> {
  const docRef = await addDoc(collection(db, "belts"), data);
  await safeLogActivity({
    action: "belt.create",
    entityType: "belt",
    entityId: docRef.id,
    description: `Belt created: ${data.name}`,
    metadata: JSON.stringify({ color: data.color }),
  });
  return { id: docRef.id, ...data };
}

export async function deleteBelt(id: string) {
  // Check if any member has this belt
  const q = query(collection(db, "memberBelts"), where("beltId", "==", id), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error("Cannot delete belt: It has been awarded to members.");
  }

  await deleteDoc(doc(db, "belts", id));
  await safeLogActivity({
    action: "belt.delete",
    entityType: "belt",
    entityId: id,
    description: "Belt deleted",
  });
}

export async function getMemberBelts(): Promise<MemberBelt[]> {
  const snapshots = await getDocs(collection(db, "memberBelts"));
  return mapDocs<MemberBelt>(snapshots);
}

export async function awardBeltToMember(data: InsertMemberBelt): Promise<MemberBelt> {
  // Check if already awarded?
  const q = query(
    collection(db, "memberBelts"),
    where("memberId", "==", data.memberId),
    where("beltId", "==", data.beltId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error("Member already has this belt");
  }

  const docRef = await addDoc(collection(db, "memberBelts"), {
    ...data,
    awardedAt: data.awardedAt || new Date().toISOString(),
  });

  await safeLogActivity({
    action: "belt.award",
    entityType: "member_belt",
    entityId: docRef.id,
    description: "Belt awarded to member",
    metadata: JSON.stringify({ memberId: data.memberId, beltId: data.beltId }),
  });

  return { id: docRef.id, ...data, awardedAt: data.awardedAt || new Date().toISOString() };
}


