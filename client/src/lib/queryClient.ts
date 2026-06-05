import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiFetch, getToken } from "./api";

async function handleResponse(res: Response) {
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (data instanceof FormData) {
    body = data;
  } else if (data !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  const res = await fetch(url, { method, headers, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || "Request failed");
  }
  return res;
}

export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401 }) =>
    async ({ queryKey }) => {
      const route = queryKey[0];
      if (typeof route !== "string") throw new Error("Invalid query key");

      const params = new URLSearchParams();
      if (route === "/api/dashboard/stats") {
        if (typeof queryKey[1] === "string") params.set("start", queryKey[1]);
        if (typeof queryKey[2] === "string") params.set("end", queryKey[2]);
      }
      if (route === "/api/attendance" && typeof queryKey[1] === "string") {
        params.set("date", queryKey[1]);
      }
      if (route === "/api/logs" && typeof queryKey[1] === "number") {
        params.set("limit", String(queryKey[1]));
      }

      const url = params.toString() ? `${route}?${params}` : route;
      const res = await apiFetch(url);
      if (res.status === 401) {
        if (on401 === "returnNull") return null;
        throw new Error("Unauthorized");
      }
      return handleResponse(res);
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: { retry: false },
  },
});
