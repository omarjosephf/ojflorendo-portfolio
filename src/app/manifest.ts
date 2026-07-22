import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA / install metadata) for the OJ Florendo platform.
 * Icons reference project-created assets already served by the app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OJ Florendo — Portfolio & Platform",
    short_name: "OJ Florendo",
    description:
      "Portfolio, CV and personal platform of OJ Florendo — software, AI, data and design.",
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
