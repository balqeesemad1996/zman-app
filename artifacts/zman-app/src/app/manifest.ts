import type { MetadataRoute } from "next";
import { COLOR_TOKENS } from "@/lib/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zman Internal Tool",
    short_name: "Zman",
    description: "أداة Zman الداخلية لإدارة الطلبات والمالية",
    start_url: "/",
    display: "standalone",
    background_color: COLOR_TOKENS.CANVAS,
    theme_color: COLOR_TOKENS.BRAND,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
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
