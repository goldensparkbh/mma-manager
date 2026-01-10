import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  cancelSale,
  createAttendance,
  createExpense,
  createMember,
  createProduct,
  createSale,
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
} from "@/lib/firebaseData";
import type {
  InsertAttendance,
  InsertExpense,
  InsertMember,
  InsertProduct,
  InsertSale,
  InsertSubscription,
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
  "/api/dashboard/stats": () => getDashboardStats(),
  "/api/members": () => getMembers(),
  "/api/attendance": (queryKey) => {
    const date =
      typeof queryKey[1] === "string"
        ? queryKey[1]
        : new Date().toISOString().split("T")[0];
    return getAttendanceByDate(date);
  },
  "/api/subscriptions": () => getSubscriptions(),
  "/api/products": () => getProducts(),
  "/api/sales": () => getSales(),
  "/api/expenses": () => getExpenses(),
  "/api/logs": (queryKey) => {
    const limit = typeof queryKey[1] === "number" ? queryKey[1] : 100;
    return getActivityLogs(limit);
  },
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
    return jsonResponse(result, 201);
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
