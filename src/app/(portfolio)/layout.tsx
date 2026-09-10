import { storageAllowed } from "@/lib/management/access";
import { headers } from "next/headers";
import { SkipLink } from "@/components/layout/SkipLink";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PortfolioAssistant } from "@/components/assistant/PortfolioAssistant";
import { StructuredData } from "@/components/ui/StructuredData";
import { InteractionFeedback } from "@/components/ui/InteractionFeedback";

export default async function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <><SkipLink /><Nav /><main id="main" className="flex-1">{children}</main>
    <Footer /><InteractionFeedback /><div className="assistant-theme"><PortfolioAssistant nonce={nonce} storageEnabled={storageAllowed((await headers()).get("host"))} /></div>
    <StructuredData nonce={nonce} /></>;
}
