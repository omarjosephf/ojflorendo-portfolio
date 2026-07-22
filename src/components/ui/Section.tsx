import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Standard section shell: semantic <section> with an accessible heading,
 * an accent "eyebrow" label, and consistent spacing. Each section is a
 * labelled landmark for assistive technology.
 */
export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  className = "",
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`scroll-mt-24 py-20 sm:py-28 ${className}`}
    >
      <Container>
        <Reveal className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
          <h2
            id={headingId}
            className="font-heading text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            {title}
          </h2>
          {intro ? (
            <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
              {intro}
            </p>
          ) : null}
        </Reveal>
        <div className="mt-10 sm:mt-14">{children}</div>
      </Container>
    </section>
  );
}
