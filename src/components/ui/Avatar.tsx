import { site } from "@/data/site";

/**
 * Profile photo area (CLAUDE.md §9). Shows the profile photo when
 * `site.profileImage` is set, otherwise a clean monogram placeholder so the
 * layout looks complete.
 *
 * Uses a plain `<img>` with explicit dimensions rather than `next/image`,
 * matching every other image on this site. `next/image` is not compatible with
 * the nonce-based CSP here, and this component was the last place still
 * referencing it — dormant only because `profileImage` was null, so setting a
 * photo would have executed that path in production for the first time. The
 * asset is pre-sized at build time instead, which is what the framework's
 * optimiser would have been doing.
 */
export function Avatar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-accent to-sky p-[2px] ${className}`}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface">
        {site.profileImage ? (
          <img
            src={site.profileImage}
            alt={`Portrait of ${site.name}`}
            // Explicit dimensions reserve the box before the file arrives, so
            // the hero never shifts as it loads.
            width={64}
            height={64}
            decoding="async"
            className="h-full w-full rounded-full object-cover"
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
