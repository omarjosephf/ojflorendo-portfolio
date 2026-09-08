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
      className={`portfolio-container mx-auto w-full max-w-[88rem] px-6 sm:px-10 lg:px-16 ${className}`}
    >
      {children}
    </div>
  );
}
