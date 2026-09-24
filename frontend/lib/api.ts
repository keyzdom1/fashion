const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("session_id", sid);
  }
  return sid;
}

function getAuthHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const sid = getSessionId();
  if (sid) headers["X-Session-Id"] = sid;
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...getAuthHeaders(!isFormData),
    ...(options.headers as Record<string, string> | undefined),
  };
  const method = (options.method || "GET").toUpperCase();
  const attempts = method === "GET" ? 3 : 1;
  let lastError: Error = new Error("API error");

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        cache: options.cache ?? "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail =
          typeof body.detail === "string"
            ? body.detail
            : body.detail
              ? JSON.stringify(body.detail)
              : "";
        const err = new Error(
          detail ||
            (res.status === 404
              ? "Not found — the backend may need a redeploy on Render"
              : `API error ${res.status}`)
        );
        const transient = res.status >= 500;
        if (transient && attempt < attempts - 1) {
          lastError = err;
          await sleep(800 * (attempt + 1));
          continue;
        }
        throw err;
      }
      if (res.status === 204) return undefined as T;
      return res.json();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Network error");
      const isNetwork =
        e instanceof TypeError ||
        (e instanceof Error && /failed to fetch|network/i.test(e.message));
      if (isNetwork && attempt < attempts - 1) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      if (attempt === attempts - 1 || !isNetwork) throw lastError;
    }
  }
  throw lastError;
}

export async function login(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  return data;
}

export async function register(email: string, password: string, fullName?: string) {
  return api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("access_token");
}

export { API_URL };
