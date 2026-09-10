import type { MetadataRoute } from "next";
import { positioning } from "@/data/positioning";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OJ Florendo Rayatchi — Portfolio & Professional Platform",
    short_name: "OJ Florendo",
    // One approved description, shared with the page metadata and structured
    // data so the three cannot drift apart.
    description: positioning.seoDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f2e9",
    theme_color: "#f5f2e9",
    lang: "en-GB",
    categories: ["portfolio", "productivity"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/favicon.ico", type: "image/x-icon", sizes: "48x48" },
    ],
  };
}
