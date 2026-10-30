import { site } from "@/data/site";
import { renderShareCard, shareCardContentType, shareCardSize } from "@/lib/og/share-card";

export const alt = `About ${site.name}, ${site.descriptor}`;
export const size = shareCardSize;
export const contentType = shareCardContentType;

export default function AboutOpengraphImage() {
  return renderShareCard({
    eyebrow: "About",
    title: site.name,
    line: "His story, the systems he runs, his training work and credentials.",
  });
}
