/** Keyboard skip link — first focusable element, jumps to main content (docs/ENGINEERING_HANDBOOK.md §19, accessibility standard). */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-[100] rounded-md bg-accent px-4 py-2 font-semibold text-night focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Skip to content
    </a>
  );
}
