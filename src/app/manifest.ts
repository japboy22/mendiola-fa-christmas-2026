import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mendiola Football Academy - Bulacan | Christmas Party 2026",
    short_name: "Mendiola Xmas",
    description:
      "Official Christmas Party 2026 Attendance Confirmation (RSVP) for Mendiola Football Academy - Bulacan. December 5, 2026, 3:00 PM at Valle Maria Mar, Sta. Cruz, Sta. Maria, Bulacan.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF8F8",
    theme_color: "#D91B23",
    categories: ["sports", "events", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
