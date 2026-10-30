import { positioning } from "@/data/positioning";
import { HomeSection } from "@/components/home/HomeSection";

/**
 * Questions a visitor asks before starting a project, answered in rows like
 * the later About stages. Every answer is visible: nothing hides behind a
 * toggle, so the page reads the same with or without script.
 */
export function YourQuestions() {
  const { heading, intro, items } = positioning.questions;
  return (
    <HomeSection id="questions" title={heading} intro={intro}>
      <ul className="jf-rows">
        {items.map((item) => (
          <li key={item.question} className="jf-row">
            <h3 className="jf-row-title">{item.question}</h3>
            <p className="jf-row-text">{item.answer}</p>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
