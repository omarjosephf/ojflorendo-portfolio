/** Temporary "JF" text monogram until the logo phase designs the real mark (ADR-0029). */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      className={`oj-mark ${className}`}
      aria-hidden="true"
    >
      JF
    </span>
  );
}
