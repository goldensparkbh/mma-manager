export type ApiClient = {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
  setToken: (token: string | null) => void;
  getToken: () => string | null;
};

export function createApiClient(baseUrl: string, initialToken: string | null = null): ApiClient {
  let token = initialToken;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body && !(init.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return {
    get: (path) => request(path),
    post: (path, body) =>
      request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
    delete: (path) => request(path, { method: "DELETE" }),
    setToken: (t) => {
      token = t;
    },
    getToken: () => token,
  };
}
