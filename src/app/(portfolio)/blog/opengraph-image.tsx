import { site } from "@/data/site";
import { renderShareCard, shareCardContentType, shareCardSize } from "@/lib/og/share-card";

export const alt = `${site.name}'s blog: notes from building AI automation`;
export const size = shareCardSize;
export const contentType = shareCardContentType;

export default function BlogOpengraphImage() {
  return renderShareCard({
    eyebrow: "Blog",
    title: "Notes from building AI automation.",
    line: "Written by AI agents from my own material, approved by me.",
  });
}
