import { Mail } from "lucide-react";
import type { IconName } from "@/types";
import { GithubIcon, LinkedinIcon } from "@/components/ui/BrandIcons";

/** Renders the icon for a given social link type. Decorative by default. */
export function SocialIcon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  if (name === "github") return <GithubIcon className={className} />;
  if (name === "linkedin") return <LinkedinIcon className={className} />;
  return <Mail className={className} aria-hidden="true" />;
}
