import { positioning } from "@/data/positioning";
import { Container } from "@/components/ui/Container";
import { AskEvButton } from "@/components/home/AskEvButton";

const { assistant } = positioning;

/**
 * The E.V invitation. The illustration on the right is a static picture of the
 * panel's answer layout with a true, name-free example, labelled as an example;
 * the button opens the real panel.
 */
export function AskEv() {
  return (
    <section id="assistant" aria-labelledby="assistant-heading" className="jf-section jf-ev">
      <Container className="jf-ev-grid">
        <div className="jf-ev-copy">
          <h2 id="assistant-heading" className="jf-section-title">{assistant.heading}</h2>
          <p className="jf-section-intro">{assistant.body}</p>
          <AskEvButton label={assistant.action} />
        </div>
        <figure className="jf-ev-sample">
          <div className="jf-ev-bubble jf-ev-question">{assistant.example.question}</div>
          <div className="jf-ev-bubble jf-ev-answer">
            <p>{assistant.example.answer}</p>
            <p className="jf-ev-source">
              <span className="jf-ev-source-label">Source</span>
              {assistant.example.source}
            </p>
          </div>
          <figcaption className="jf-fine">{assistant.exampleLabel}</figcaption>
        </figure>
      </Container>
    </section>
  );
}
