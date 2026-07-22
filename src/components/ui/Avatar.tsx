import Image from "next/image";
import { site } from "@/data/site";

/**
 * Profile photo area (CLAUDE.md §9). Shows the profile photo when
 * `site.profileImage` is set, otherwise a clean monogram placeholder so the
 * layout looks complete.
 */
export function Avatar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-accent to-sky p-[2px] ${className}`}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface">
        {site.profileImage ? (
          <Image
            src={site.profileImage}
            alt={`Portrait of ${site.name}`}
            width={64}
            height={64}
            className="h-full w-full rounded-full object-cover"
            priority
          />
        ) : (
          <span
            className="font-heading text-lg font-bold text-gradient"
            aria-hidden="true"
          >
            OJ
          </span>
        )}
      </div>
    </div>
  );
}
