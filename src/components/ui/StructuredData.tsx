import { buildStructuredData } from "@/lib/structured-data";
import { JsonLd } from "@/components/ui/JsonLd";

/** Person + WebSite JSON-LD for the site (CLAUDE.md §13). */
export function StructuredData({ nonce }: { nonce?: string }) {
  return <JsonLd data={buildStructuredData()} nonce={nonce} />;
}
