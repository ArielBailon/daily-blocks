import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "daily-blocks",
    short_name: "daily-blocks",
    description: "Planificación diaria por bloques de tiempo",
    start_url: "/",
    display: "standalone",
    background_color: "#171512",
    theme_color: "#171512",
    // Served by src/app/icon.tsx (one route per generateImageMetadata id).
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
