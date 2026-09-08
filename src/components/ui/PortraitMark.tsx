import { site } from "@/data/site";
import { Monogram } from "@/components/ui/Monogram";

/** The existing genuine photograph, clipped in CSS; the parent names its action. */
export function PortraitMark({ className = "" }: { className?: string }) {
  if (!site.profileImage) return <Monogram className={className} />;
  return (
    <img
      src={site.profileImage}
      alt=""
      aria-hidden="true"
      width={95}
      height={95}
      decoding="async"
      className={`portrait-mark ${className}`.trim()}
    />
  );
}
