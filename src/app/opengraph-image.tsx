import { site } from "@/data/site";
import { renderShareCard, shareCardContentType, shareCardSize } from "@/lib/og/share-card";

export const alt = `${site.name} — ${site.descriptor}`;
export const size = shareCardSize;
export const contentType = shareCardContentType;

export default function OpengraphImage() {
  return renderShareCard({
    eyebrow: `${site.descriptor} · Windsor, UK`,
    title: site.name,
    line: site.headline,
  });
}
