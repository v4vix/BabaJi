import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API_BASE = process.env.API_BASE ?? "http://localhost:8101";
const KB_SERVICE_URL = process.env.KB_SERVICE_URL ?? "http://localhost:8102";

function normalizeBaseUrl(value: string): string {
  return /^https?:\/\//.test(value) ? value : `http://${value}`;
}

type MeResponse = {
  id: string;
  email: string;
  role?: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const meRes = await fetch(`${normalizeBaseUrl(API_BASE)}/v1/auth/me`, {
    method: "GET",
    headers: { Authorization: authHeader },
    cache: "no-store",
  });
  if (!meRes.ok) {
    return NextResponse.json({ detail: "Invalid session." }, { status: 401 });
  }

  const me = (await meRes.json()) as MeResponse;
  if (me.role !== "admin") {
    return NextResponse.json({ detail: "Admin access required." }, { status: 403 });
  }

  const adminToken = process.env.ADMIN_API_TOKEN ?? process.env.API_SECRET;
  if (!adminToken) {
    return NextResponse.json({ detail: "Admin upload is not configured." }, { status: 503 });
  }

  const incoming = await request.formData();
  const outgoing = new FormData();
  for (const [key, value] of incoming.entries()) {
    outgoing.append(key, value);
  }

  const kbRes = await fetch(`${normalizeBaseUrl(KB_SERVICE_URL)}/v1/admin/upload`, {
    method: "POST",
    headers: { "X-Admin-Token": adminToken },
    body: outgoing,
  });

  const text = await kbRes.text();
  return new Response(text, {
    status: kbRes.status,
    headers: { "Content-Type": kbRes.headers.get("Content-Type") ?? "text/plain; charset=utf-8" },
  });
}
