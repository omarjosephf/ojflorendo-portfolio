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
      className={`portfolio-section ${className}`}
    >
      <Container>
        <Reveal className="section-header">
          <p className="section-eyebrow">
            {eyebrow}
          </p>
          <h2
            id={headingId}
            className="section-title"
          >
            {title}
          </h2>
          {intro ? (
            <p className="section-intro">
              {intro}
            </p>
          ) : null}
        </Reveal>
        <div className="section-body">{children}</div>
      </Container>
    </section>
  );
}
