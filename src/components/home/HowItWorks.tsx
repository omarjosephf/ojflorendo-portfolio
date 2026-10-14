import { positioning } from "@/data/positioning";
import { HomeSection } from "@/components/home/HomeSection";

const { howIWork } = positioning;

/**
 * A real sequence, so it is an ordered list and the numbers carry meaning. The
 * line joining the three stations is drawn in CSS and hidden from assistive
 * technology with the rest of the decoration.
 */
export function HowItWorks() {
  return (
    <HomeSection id="approach" title="How it works" intro={howIWork.intro}>
      <ol className="jf-steps">
        {howIWork.steps.map((step, index) => (
          <li key={step.title} className="jf-step">
            <span className="jf-step-number" aria-hidden="true">
              {index + 1}
            </span>
            <h3 className="jf-step-title">{step.title}</h3>
            <p className="jf-step-body">{step.description}</p>
          </li>
        ))}
      </ol>
      <p className="jf-fine">{howIWork.principle}</p>
    </HomeSection>
  );
}
