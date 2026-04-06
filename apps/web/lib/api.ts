// Empty string → relative URLs → goes through Next.js /v1/* rewrite → no CORS needed.
// Set NEXT_PUBLIC_API_BASE only when the API lives on a different origin (separate deployment).
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
export const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo-user";
export const DEFAULT_PLAN = process.env.NEXT_PUBLIC_DEMO_PLAN ?? "free";
const ENABLE_INSECURE_DEMO_AUTH = ["1", "true"].includes(
  (process.env.NEXT_PUBLIC_ENABLE_INSECURE_DEMO_AUTH ?? "").toLowerCase(),
);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ── User JWT (takes priority when logged in) ──────────────────────────────────
// Stored in localStorage by auth.ts after login/register.

function getUserJwt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("babaji_user_token");
}

// ── Device Bearer token cache (server-minted fallback) ────────────────────────
// Minted server-side at /api/auth/token so API_SECRET never reaches the browser.

let _cachedDeviceToken: string | null = null;
let _deviceTokenExpiresAt = 0;

async function getDeviceToken(): Promise<string | null> {
  const now = Date.now() / 1000;
  if (_cachedDeviceToken && now < _deviceTokenExpiresAt) return _cachedDeviceToken;
  try {
    const res = await fetch("/api/auth/token", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string; expires_in: number };
    _cachedDeviceToken = data.token;
    _deviceTokenExpiresAt = now + data.expires_in - 10;
    return _cachedDeviceToken;
  } catch {
    return null;
  }
}

// ── Header builder ────────────────────────────────────────────────────────────

type RequestOptions = { userId?: string; plan?: string };

async function buildHeaders(options?: RequestOptions): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Prefer user JWT (logged-in session) over device token
  const userJwt = getUserJwt();
  if (userJwt) {
    headers["Authorization"] = `Bearer ${userJwt}`;
    return headers;
  }

  // Fall back to server-minted device bearer
  const deviceToken = await getDeviceToken();
  if (deviceToken) {
    headers["Authorization"] = `Bearer ${deviceToken}`;
    return headers;
  }

  if (ENABLE_INSECURE_DEMO_AUTH) {
    headers["X-Plan"] = options?.plan ?? DEFAULT_PLAN;
    headers["X-User-Id"] = options?.userId ?? DEFAULT_USER_ID;
  }
  return headers;
}

// ── Response parser ───────────────────────────────────────────────────────────

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.text();
    throw new ApiError(data || `${response.status} ${response.statusText}`, response.status);
  }
  return response.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function postJson<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await buildHeaders(options),
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response);
}

export async function getJson<T>(path: string, options?: RequestOptions): Promise<T> {
  const headers = await buildHeaders(options);
  delete headers["Content-Type"];
  const response = await fetch(`${API_BASE}${path}`, { method: "GET", headers });
  return parseJsonResponse<T>(response);
}
