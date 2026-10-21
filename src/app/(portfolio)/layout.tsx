import { visitorStorageAllowed } from "@/lib/management/access";
import { headers } from "next/headers";
import { SkipLink } from "@/components/layout/SkipLink";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PortfolioAssistant } from "@/components/assistant/PortfolioAssistant";
import { StructuredData } from "@/components/ui/StructuredData";
import { InteractionFeedback } from "@/components/ui/InteractionFeedback";
import { archivo } from "./font";
import "./site.css";

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
