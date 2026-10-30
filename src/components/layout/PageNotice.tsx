import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/**
 * The short page shown in place of content: the 404 and the error pages.
 * One heading, one sentence and the ways out, in the night look.
 */
export function PageNotice({
  label,
  title,
  body,
  children,
}: {
  label: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="page-notice-title" className="jf-section jf-notice">
      <Container>
        <p className="jf-notice-label">{label}</p>
        <h1 id="page-notice-title" className="jf-section-title">
          {title}
        </h1>
        <p className="jf-section-intro">{body}</p>
        <div className="jf-hero-actions jf-notice-actions">{children}</div>
      </Container>
    </section>
  );
}
