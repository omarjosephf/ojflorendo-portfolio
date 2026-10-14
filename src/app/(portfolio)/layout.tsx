import { Archivo } from "next/font/google";
import { visitorStorageAllowed } from "@/lib/management/access";
import { headers } from "next/headers";
import { SkipLink } from "@/components/layout/SkipLink";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PortfolioAssistant } from "@/components/assistant/PortfolioAssistant";
import { StructuredData } from "@/components/ui/StructuredData";
import { InteractionFeedback } from "@/components/ui/InteractionFeedback";
import "./site.css";

/**
 * The public site's one typeface, self-hosted by next/font. Archivo's width
 * axis carries the display voice (expanded) and the body (normal width).
 * Loaded here rather than in the root layout so /manage keeps its own fonts.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export default async function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  return (
    <div className={`jf-site ${archivo.variable}`}>
      <SkipLink />
      <Nav />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <InteractionFeedback />
      <div className="assistant-theme">
        <PortfolioAssistant nonce={nonce} storageEnabled={visitorStorageAllowed(requestHeaders.get("host"))} />
      </div>
      <StructuredData nonce={nonce} />
    </div>
  );
}
