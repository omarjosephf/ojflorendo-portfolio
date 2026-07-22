import type { ReactNode } from "react";

/** Centered, responsive max-width wrapper used across all sections. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-6xl px-5 sm:px-8 2xl:max-w-[82rem] ${className}`}
    >
      {children}
    </div>
  );
}
