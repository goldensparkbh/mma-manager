import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  cancelSale,
  createAttendance,
  createExpense,
  createMember,
  createProduct,
  createProduct,
  createSale,
  createServiceSale,
  createSubscription,
  deleteAttendance,
  getActivityLogs,
  getAttendanceByDate,
  getDashboardStats,
  getExpenses,
  getMembers,
  getProducts,
  getSales,
  getSubscriptions,
  updateMember,
  updateProduct,
  getSubscriptionPackages,
  createSubscriptionPackage,
  updateSubscriptionPackage,
  deleteSubscriptionPackage,
  getBelts,
  createBelt,
  updateBelt,
  deleteBelt,
  getMemberBelts,
  awardBeltToMember,
  revokeMemberBelt,
  deleteMember,
  updateSubscription,
  deleteSubscription,
  deleteProduct,
  updateSale,
  deleteSale,
  getUsers,
  updateUserRole,
  updateExpense,
  deleteExpense,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  deleteUser,
  createUserWithRole,
  type Role,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent
} from "@/lib/firebaseData";

import type {
  InsertAttendance,
  InsertExpense,
  InsertMember,
  InsertProduct,
  InsertSale,
  InsertSubscription,
  InsertSubscriptionPackage,
  InsertBelt,
  InsertMemberBelt,
  InsertEvent,
} from "@shared/schema";

const jsonResponse = (payload?: unknown, status = 200) => {
  if (status === 204) {
    return new Response(null, { status });
  }

  return new Response(payload !== undefined ? JSON.stringify(payload) : null, {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

const queryHandlers: Record<string, (queryKey: readonly unknown[]) => Promise<unknown>> = {
  "/api/dashboard/stats": (queryKey) => {
    const start = typeof queryKey[1] === "string" ? queryKey[1] : undefined;
    const end = typeof queryKey[2] === "string" ? queryKey[2] : undefined;
    return getDashboardStats(start, end);
  },
  "/api/members": () => getMembers(),
  "/api/attendance": (queryKey) => {
    const date =
      typeof queryKey[1] === "string"
        ? queryKey[1]
        : new Date().toISOString().split("T")[0];
    return getAttendanceByDate(date);
  },
  "/api/subscriptions": () => getSubscriptions(),
  "/api/packages": () => getSubscriptionPackages(),
  "/api/belts": () => getBelts(),
  "/api/member-belts": () => getMemberBelts(),
  "/api/products": () => getProducts(),
  "/api/sales": () => getSales(),
  "/api/expenses": () => getExpenses(),
  "/api/logs": (queryKey) => {
    const limit = typeof queryKey[1] === "number" ? queryKey[1] : 100;
    return getActivityLogs(limit);
  },
  "/api/roles": () => getRoles(),
  "/api/users": () => getUsers(),
  "/api/events": () => getEvents(),
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const route = url.split("?")[0];

  if (method === "POST" && route === "/api/members") {
    const result = await createMember(data as InsertMember & { imageFile?: File | null });
    return jsonResponse(result, 201);
  }

  if (method === "PATCH" && route.startsWith("/api/members/")) {
    const id = route.split("/")[3];
    await updateMember(id, data as Partial<InsertMember>);
    return jsonResponse({ ok: true });
  }

  if (method === "POST" && route === "/api/attendance") {
    const result = await createAttendance(data as InsertAttendance);
    return jsonResponse(result, 201);
  }

  if (method === "DELETE" && route.startsWith("/api/attendance/")) {
    const id = route.split("/")[3];
    await deleteAttendance(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "POST" && route === "/api/subscriptions") {
    const result = await createSubscription(data as InsertSubscription);

    // Auto-create sale if paymentStatus is paid
    if ((data as InsertSubscription).paymentStatus === 'paid') {
      const subData = data as InsertSubscription;
      await createServiceSale({
        productId: "subscription", // Generic ID for services
        productName: `اشتراك: ${subData.planName}`,
        quantity: 1,
        unitPrice: subData.amount,
        totalPrice: subData.amount,
        buyerName: subData.memberName,
        date: new Date().toISOString(),
        paymentMethod: subData.paymentMethod || "cash",
        status: "completed",
        subscriptionId: result.id
      });
    }

    return jsonResponse(result, 201);
  }

  if (method === "POST" && route === "/api/packages") {
    const result = await createSubscriptionPackage(data as InsertSubscriptionPackage);
    return jsonResponse(result, 201);
  }

  if (method === "DELETE" && route.startsWith("/api/packages/")) {
    const id = route.split("/")[3];
    await deleteSubscriptionPackage(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "PATCH" && route.startsWith("/api/packages/")) {
    const id = route.split("/")[3];
    await updateSubscriptionPackage(id, data as Partial<InsertSubscriptionPackage>);
    return jsonResponse({ ok: true });
  }

  if (method === "POST" && route === "/api/belts") {
    const result = await createBelt(data as InsertBelt);
    return jsonResponse(result, 201);
  }

  if (method === "DELETE" && route.startsWith("/api/belts/")) {
    const id = route.split("/")[3];
    await deleteBelt(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "POST" && route === "/api/member-belts") {
    const result = await awardBeltToMember(data as InsertMemberBelt);
    return jsonResponse(result, 201);
  }

  if (method === "DELETE" && route.startsWith("/api/member-belts/")) {
    const id = route.split("/")[3];
    await revokeMemberBelt(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "POST" && route === "/api/products") {
    const result = await createProduct(data as InsertProduct & { imageFile?: File | null });
    return jsonResponse(result, 201);
  }

  if (method === "PATCH" && route.startsWith("/api/products/")) {
    const id = route.split("/")[3];
    await updateProduct(id, data as Partial<InsertProduct> & { imageFile?: File | null });
    return jsonResponse({ ok: true });
  }

  if (method === "POST" && route === "/api/sales") {
    const result = await createSale(data as InsertSale);
    return jsonResponse(result, 201);
  }

  if (method === "PATCH" && route.endsWith("/cancel") && route.startsWith("/api/sales/")) {
    const id = route.split("/")[3];
    const reason = String((data as { reason?: string })?.reason ?? "").trim();
    if (!reason) {
      throw new Error("Cancel reason is required");
    }
    const result = await cancelSale(id, reason);
    if (!result) {
      throw new Error("Sale not found");
    }
    return jsonResponse(result);
  }

  if (method === "POST" && route === "/api/expenses") {
    const result = await createExpense(data as InsertExpense);
    return jsonResponse(result, 201);
  }

  if (method === "PATCH" && route.startsWith("/api/expenses/")) {
    const id = route.split("/")[3];
    await updateExpense(id, data as Partial<InsertExpense>);
    return jsonResponse({ ok: true });
  }

  if (method === "DELETE" && route.startsWith("/api/expenses/")) {
    const id = route.split("/")[3];
    await deleteExpense(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "DELETE" && route.startsWith("/api/members/")) {
    const id = route.split("/")[3];
    await deleteMember(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "PATCH" && route.startsWith("/api/subscriptions/")) {
    const id = route.split("/")[3];
    await updateSubscription(id, data as Partial<InsertSubscription>);
    return jsonResponse({ ok: true });
  }

  if (method === "DELETE" && route.startsWith("/api/subscriptions/")) {
    const id = route.split("/")[3];
    await deleteSubscription(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "DELETE" && route.startsWith("/api/products/")) {
    const id = route.split("/")[3];
    await deleteProduct(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "PATCH" && route.startsWith("/api/sales/") && !route.endsWith("/cancel")) {
    const id = route.split("/")[3];
    await updateSale(id, data as Partial<InsertSale>);
    return jsonResponse({ ok: true });
  }

  if (method === "DELETE" && route.startsWith("/api/sales/")) {
    const id = route.split("/")[3];
    await deleteSale(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "GET" && route === "/api/users") {
    const users = await getUsers();
    return jsonResponse(users);
  }

  if (method === "PATCH" && route.startsWith("/api/users/") && route.endsWith("/role")) {
    const id = route.split("/")[3];
    await updateUserRole(id, (data as any).role);
    return jsonResponse({ ok: true });
  }

  if (method === "DELETE" && route.startsWith("/api/users/")) {
    const id = route.split("/")[3];
    await deleteUser(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "POST" && route === "/api/users/invite") {
    const { email, password, name, role } = data as any;
    await createUserWithRole(email, password, name, role);
    return jsonResponse({ ok: true }, 201);
  }

  if (method === "POST" && route === "/api/roles") {
    const { name, permissions } = data as any;
    const result = await createRole(name, permissions);
    return jsonResponse(result, 201);
  }

  if (method === "PATCH" && route.startsWith("/api/roles/")) {
    const id = route.split("/")[3];
    const { name, permissions } = data as any;
    await updateRole(id, name, permissions);
    return jsonResponse({ ok: true });
  }

  if (method === "DELETE" && route.startsWith("/api/roles/")) {
    const id = route.split("/")[3];
    await deleteRole(id);
    return jsonResponse(undefined, 204);
  }

  if (method === "POST" && route === "/api/events") {
    const result = await createEvent(data as InsertEvent);
    return jsonResponse(result, 201);
  }

  if (method === "PATCH" && route.startsWith("/api/events/")) {
    const id = route.split("/")[3];
    await updateEvent(id, data as Partial<InsertEvent>);
    return jsonResponse(undefined, 200);
  }

  if (method === "DELETE" && route.startsWith("/api/events/")) {
    const id = route.split("/")[3];
    await deleteEvent(id);
    return jsonResponse(undefined, 204);
  }

  throw new Error(`Unhandled request: ${method} ${route}`);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  () =>
    async ({ queryKey }) => {
      const route = queryKey[0];
      if (typeof route !== "string") {
        throw new Error("Invalid query key");
      }
      const handler = queryHandlers[route];
      if (!handler) {
        throw new Error(`Unknown query key: ${route}`);
      }
      return (await handler(queryKey)) as T;
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
