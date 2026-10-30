import { Archivo } from "next/font/google";

/**
 * The public site's one typeface, self-hosted by next/font. Archivo's width
 * axis carries the display voice (expanded) and the body (normal width).
 * Shared by the portfolio layout and the root 404 page, which renders outside
 * that layout; /manage keeps its own fonts.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
