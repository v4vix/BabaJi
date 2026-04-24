import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import NavBar from "./NavBar";
import Providers from "./Providers";
import DemoSwitcher from "./DemoSwitcher";

export const metadata: Metadata = {
  title: "BabaJi — Ancient Wisdom, Modern Intelligence",
  description: "Vedic astrology, Vaastu Shastra, and Jyotish guidance powered by AI. Birth charts, compatibility, muhurta, and more.",
  applicationName: "BabaJi",
  keywords: [
    "vedic astrology",
    "kundli",
    "vaastu",
    "muhurta",
    "matchmaking",
    "jyotish",
    "spiritual guidance",
  ],
  openGraph: {
    title: "BabaJi — Ancient Wisdom, Modern Intelligence",
    description: "Birth charts, Vaastu, timing, and reflective guidance in a calmer modern experience.",
    siteName: "BabaJi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BabaJi",
    description: "A calmer, premium way to explore kundli, Vaastu, timing, and guided spiritual insight.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          {children}
          <DemoSwitcher />
        </Providers>
      </body>
    </html>
  );
}
