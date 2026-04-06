/**
 * Client-side auth helpers.
 * User JWTs (register/login) are stored in localStorage.
 * Device bearer tokens (server-minted) are used as fallback.
 */

const USER_TOKEN_KEY = "babaji_user_token";
const USER_KEY = "babaji_user";

export type User = {
  id: string;
  email: string;
  display_name: string;
  plan: string;
  role?: string;
  created_at: string;
  email_verified?: boolean;
};

export type AuthResult = {
  token: string;
  expires_in: number;
  user: User;
};

// ── Storage ───────────────────────────────────────────────────────────────────

export function saveAuth(result: AuthResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_TOKEN_KEY, result.token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
}

export function saveUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getUserToken();
}

// ── API calls ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getUserToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/v1/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) {
    clearAuth();
    return null;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { detail?: string }).detail ?? `${res.status}`);
  }
  return res.json() as Promise<User>;
}

export async function syncStoredUser(): Promise<User | null> {
  const user = await fetchCurrentUser();
  if (user) saveUser(user);
  return user;
}

export async function apiRegister(email: string, password: string, displayName: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { detail?: string }).detail ?? `${res.status}`);
  }
  return res.json() as Promise<AuthResult>;
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { detail?: string }).detail ?? `${res.status}`);
  }
  return res.json() as Promise<AuthResult>;
}
