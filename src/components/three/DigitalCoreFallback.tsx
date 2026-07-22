/**
 * Pure-CSS "Digital Core" (CLAUDE.md §10). Decorative and self-contained:
 * renders with no WebGL, no JavaScript and no inline styles, and is dampened
 * automatically under prefers-reduced-motion. Used on its own until the 3D
 * scene loads, and as the permanent fallback when WebGL is unavailable.
 */
export function DigitalCoreFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`dc ${className}`} role="img" aria-label="Abstract digital core graphic">
      <div className="dc-glow" />
      <div className="dc-ring dc-ring-3">
        <span className="dc-dot" />
      </div>
      <div className="dc-ring dc-ring-2">
        <span className="dc-dot" />
      </div>
      <div className="dc-ring dc-ring-1">
        <span className="dc-dot" />
      </div>
      <div className="dc-core" />
    </div>
  );
}
