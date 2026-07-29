import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OJ Florendo Rayatchi — Portfolio & Professional Platform",
    short_name: "OJ Florendo",
    description:
      "Software developer, AI-focused builder, and creative developer creating practical websites, Python tools, AI prototypes, training, and digital solutions.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    lang: "en-GB",
    categories: ["portfolio", "productivity"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/favicon.ico", type: "image/x-icon", sizes: "48x48" },
    ],
  };
}
