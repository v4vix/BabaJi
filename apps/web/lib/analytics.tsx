"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { postJson } from "./api";

type AnalyticsMetadata = Record<string, unknown>;
type TrackFn = (name: string, metadata?: AnalyticsMetadata) => void;

const AnalyticsContext = createContext<TrackFn>(() => {});
const SESSION_STORAGE_KEY = "babaji_analytics_session";

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
    return Object.fromEntries(entries.map(([key, item]) => [key, sanitizeValue(item)]));
  }
  return String(value);
}

function sanitizeMetadata(metadata?: AnalyticsMetadata): AnalyticsMetadata {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).slice(0, 24).map(([key, value]) => [key, sanitizeValue(value)]),
  );
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const cached = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (cached) return cached;
  const nextValue = `sess-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextValue);
  return nextValue;
}

async function sendEvent(name: string, page: string, metadata?: AnalyticsMetadata): Promise<void> {
  await postJson("/v1/analytics/events", {
    name,
    page,
    session_id: getSessionId(),
    source: "web",
    metadata: sanitizeMetadata(metadata),
  });
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const query = typeof window === "undefined" ? "" : window.location.search.replace(/^\?/, "");
    const fullPath = query ? `${pathname}?${query}` : pathname;
    if (!fullPath || lastTrackedPath.current === fullPath) return;
    lastTrackedPath.current = fullPath;
    void sendEvent("page_view", pathname, query ? { query } : undefined).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    function onError(event: ErrorEvent) {
      void sendEvent("web_error", window.location.pathname, {
        message: event.message,
        source: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
      }).catch(() => {});
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      void sendEvent("unhandled_rejection", window.location.pathname, {
        reason: sanitizeValue(event.reason),
      }).catch(() => {});
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  const track: TrackFn = (name, metadata) => {
    if (typeof window === "undefined") return;
    void sendEvent(name, window.location.pathname, metadata).catch(() => {});
  };

  return <AnalyticsContext.Provider value={track}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): { track: TrackFn } {
  return { track: useContext(AnalyticsContext) };
}
