import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { THEME_COOKIE, themeColors, themePreference } from "@/lib/theme/preference";
import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { SITE_URL } from "@/lib/site-url";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const title = "OJ Florendo Rayatchi | Websites for Service Businesses";
const description = positioning.seoDescription;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s · ${site.name}`,
  },
  description,
  applicationName: `${site.name} Portfolio`,
  authors: [{ name: site.name }],
  creator: site.name,
  keywords: [
    "OJ Florendo Rayatchi",
    "OJ Florendo",
    "web developer",
    "websites for small businesses",
    "service business website",
    "AI product builder",
    "AI document assistant",
    "portfolio",
    "Python",
    "AI training",
    "Next.js",
    "Windsor",
    "Berkshire",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: `${site.name} — Portfolio`,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export async function generateViewport(): Promise<Viewport> {
  const preference = themePreference((await cookies()).get(THEME_COOKIE)?.value);
  return {
    colorScheme: preference === "system" ? "light dark" : preference,
    themeColor: (["light", "dark"] as const).map((scheme) => ({
      media: `(prefers-color-scheme: ${scheme})`,
      color: themeColors[preference === "system" ? scheme : preference],
    })),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const preference = themePreference((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en-GB"
      data-theme={preference}
      className={`${inter.variable} ${display.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider initialPreference={preference}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
