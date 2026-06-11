import { getApiUrl } from "./config";

export function createApi(token: string | null = null) {
  let authToken = token;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    if (init.body && !(init.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
    setToken: (t: string | null) => {
      authToken = t;
    },
  };
}
