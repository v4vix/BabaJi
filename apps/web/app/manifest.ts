import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BabaJi",
    short_name: "BabaJi",
    description: "Ancient wisdom, modern intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#005f73",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
