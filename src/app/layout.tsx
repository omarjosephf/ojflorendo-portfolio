import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { SITE_URL } from "@/lib/site-url";
import { SkipLink } from "@/components/layout/SkipLink";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { StructuredData } from "@/components/ui/StructuredData";
import { ParticleWaveLazy } from "@/components/three/ParticleWaveLazy";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const title = "OJ Florendo Rayatchi | Software Developer & AI-Focused Builder";
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
    "software developer",
    "AI-focused builder",
    "creative developer",
    "portfolio",
    "Python",
    "AI training",
    "data analysis",
    "Next.js",
    "Windsor",
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

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en-GB"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {/* Decorative site-wide background, fixed behind all content. Loads
            only where WebGL exists; otherwise the body::before glow stands in. */}
        <ParticleWaveLazy />
        <SkipLink />
        <Nav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <StructuredData nonce={nonce} />
      </body>
    </html>
  );
}
