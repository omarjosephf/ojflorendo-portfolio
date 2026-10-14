import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/**
 * A home-page section: a labelled landmark whose heading carries its own
 * weight. No eyebrow label above it and no section number; the one numbered
 * list on the page is the real three-step sequence in How it works.
 */
export function HomeSection({
  id,
  title,
  intro,
  children,
  className = "",
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={`jf-section ${className}`}>
      <Container>
        <div className="jf-section-head">
          <h2 id={headingId} className="jf-section-title">
            {title}
          </h2>
          {intro ? <p className="jf-section-intro">{intro}</p> : null}
        </div>
        {children}
      </Container>
    </section>
  );
}
