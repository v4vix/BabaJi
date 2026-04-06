"use client";

import { type ReactNode } from "react";
import { AnalyticsProvider } from "../lib/analytics";
import { ToastProvider } from "../lib/toast";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider>
      <ToastProvider>{children}</ToastProvider>
    </AnalyticsProvider>
  );
}
