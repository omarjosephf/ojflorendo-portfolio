import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/**
 * A stage of the About journey: a labelled landmark whose heading carries its
 * own weight, with no eyebrow label or section number. `stage` marks the
 * sections the journey scene's camera anchors to, in page order.
 */
export function Section({
  id,
  title,
  intro,
  children,
  className = "",
  stage = false,
  as: Heading = "h2",
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
  stage?: boolean;
  /**
   * Heading level for this section title. Defaults to h2, which is correct
   * wherever a page owns its own h1.
   */
  as?: "h1" | "h2";
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`jf-stage ${className}`}
      data-stage={stage ? "" : undefined}
    >
      <Container>
        <div className="jf-stage-head">
          <Heading id={headingId} className="jf-stage-title">
            {title}
          </Heading>
          {intro ? <p className="jf-stage-intro">{intro}</p> : null}
        </div>
        <div className="jf-stage-body">{children}</div>
      </Container>
    </section>
  );
}
