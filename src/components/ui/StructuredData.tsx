import { buildStructuredData } from "@/lib/structured-data";
import { JsonLd } from "@/components/ui/JsonLd";

/**
 * Person + WebSite JSON-LD for the site. Built from the one canonical site-URL
 * source required by docs/ENGINEERING_HANDBOOK.md §7, and rendered through
 * <JsonLd/>, which holds the sole `dangerouslySetInnerHTML` exception.
 */
export function StructuredData({ nonce }: { nonce?: string }) {
  return <JsonLd data={buildStructuredData()} nonce={nonce} />;
}
