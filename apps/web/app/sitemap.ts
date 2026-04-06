import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/kundli",
  "/vaastu",
  "/matchmaking",
  "/panchang",
  "/consult",
  "/insights",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://babaji.app";
  const now = new Date();
  return ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
