// GET /api/kundli-card?lagna=Leo&nakshatra=Rohini&dasha=Saturn&name=Arjun
// Returns a 1200×630 PNG suitable for og:image, WhatsApp, and Instagram sharing.

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const SAFFRON = "#E36A00";
const DEEP_TEAL = "#005F73";
const CREAM = "#FFF8F0";
const GOLD = "#C9A84C";

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lagna     = searchParams.get("lagna")     ?? "Aries";
  const nakshatra = searchParams.get("nakshatra") ?? "Ashwini";
  const dasha     = searchParams.get("dasha")     ?? "Sun";
  const name      = searchParams.get("name")      ?? "";
  const mode      = searchParams.get("mode")      ?? "full";

  const lagnaSymbol = SIGN_SYMBOLS[lagna] ?? "☉";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: CREAM,
          position: "relative",
          overflow: "hidden",
          fontFamily: "serif",
        }}
      >
        {/* Background geometric mandala hint */}
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            border: `3px solid ${GOLD}`,
            opacity: 0.15,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 420,
            height: 420,
            borderRadius: "50%",
            border: `3px solid ${GOLD}`,
            opacity: 0.1,
            display: "flex",
          }}
        />

        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 10,
            height: "100%",
            background: `linear-gradient(to bottom, ${SAFFRON}, ${DEEP_TEAL})`,
            display: "flex",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "36px 60px 0",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 38, color: SAFFRON, display: "flex" }}>🕉️</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: DEEP_TEAL, letterSpacing: 2 }}>
              BABAJI
            </span>
            <span style={{ fontSize: 12, color: "#64748b", letterSpacing: 3 }}>
              VEDIC BIRTH CHART
            </span>
          </div>
          {name ? (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 18,
                color: "#334155",
                fontStyle: "italic",
              }}
            >
              {name}
            </span>
          ) : null}
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "24px 60px 40px",
            gap: 40,
            alignItems: "center",
          }}
        >
          {/* Lagna symbol — big focal point */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 220,
              height: 220,
              borderRadius: 16,
              background: "#fff",
              border: `2px solid ${GOLD}`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.08)`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 72, color: SAFFRON, lineHeight: 1, display: "flex" }}>
              {lagnaSymbol}
            </span>
            <span style={{ fontSize: 15, color: DEEP_TEAL, fontWeight: 600, marginTop: 8, display: "flex" }}>
              Lagna · {lagna}
            </span>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
            <Stat label="Lagna (Ascendant)" value={lagna} symbol={lagnaSymbol} />
            <Stat label="Birth Nakshatra" value={nakshatra} />
            <Stat label="Current Dasha Lord" value={dasha} />
            <Stat label="Reading Mode" value={mode === "full" ? "Swiss Ephemeris" : mode} muted />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 60px 28px",
          }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8", letterSpacing: 1 }}>
            For guidance only · Not a prediction · babaji.app
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: DEEP_TEAL,
              color: "#fff",
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            babaji.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

function Stat({
  label,
  value,
  symbol,
  muted,
}: {
  label: string;
  value: string;
  symbol?: string;
  muted?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", display: "flex" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: muted ? "#94a3b8" : DEEP_TEAL,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {symbol ? <span style={{ color: SAFFRON, display: "flex" }}>{symbol}</span> : null}
        {value}
      </span>
    </div>
  );
}
