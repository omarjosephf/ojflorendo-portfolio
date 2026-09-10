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
  as: Heading = "h2",
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
  /**
   * Heading level for this section title. Defaults to h2, which is correct
   * wherever a page owns its own h1. A route whose first section IS the page
   * subject passes "h1" so the document still has exactly one h1 and the
   * heading order never skips a level.
   */
  as?: "h1" | "h2";
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
          <Heading
            id={headingId}
            className="section-title"
          >
            {title}
          </Heading>
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
