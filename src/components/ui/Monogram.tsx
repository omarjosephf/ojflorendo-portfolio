/** "OJ" brand monogram used in the nav and footer. Project-created asset. */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      className={`oj-mark ${className}`}
      aria-hidden="true"
    >
      OJ
    </span>
  );
}
