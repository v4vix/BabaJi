/**
 * Server-side token minting route.
 *
 * The API_SECRET env var is read here (server-side only — never sent to the
 * browser).  It mints a short-lived HMAC-signed Bearer token for the current
 * demo user, which the browser then attaches to API calls.
 *
 * In a real app this route would:
 *   1. Validate a session cookie / NextAuth token to get the real user_id.
 *   2. Call /v1/auth/token with the user's stored device_key.
 *   3. Return the signed token to the browser.
 *
 * For now it uses the DEMO_USER_ID env var and the shared API_SECRET.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET() {
  const secret = process.env.API_SECRET;
  const userId = process.env.DEMO_USER_ID ?? "demo-user";
  const enableInsecureDemoAuth = (process.env.ENABLE_INSECURE_DEMO_AUTH ?? "true").toLowerCase() !== "false";

  if (!secret) {
    if (!enableInsecureDemoAuth) {
      return NextResponse.json(
        { error: "Device auth requires API_SECRET unless insecure demo auth is explicitly enabled." },
        { status: 503 },
      );
    }
    return NextResponse.json({ token: `${userId}:0:dev`, expires_in: 300, mode: "dev-unsigned" });
  }

  const ts = Math.floor(Date.now() / 1000).toString();
  const mac = crypto.createHmac("sha256", secret).update(`${userId}:${ts}`).digest("hex");
  const token = `${userId}:${ts}:${mac}`;
  // Expire slightly before the server-side window so clients always have a fresh token.
  return NextResponse.json({ token, expires_in: 290, mode: "signed" });
}
