/** "OJ" brand monogram used in the nav and footer. Project-created asset. */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface font-heading text-sm font-bold tracking-tight text-gradient ${className}`}
      aria-hidden="true"
    >
      OJ
    </span>
  );
}
