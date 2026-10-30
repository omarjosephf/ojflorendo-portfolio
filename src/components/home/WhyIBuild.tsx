import Link from "next/link";
import { positioning } from "@/data/positioning";
import { Container } from "@/components/ui/Container";

const { why } = positioning;

/** The founder note. Its text is a marked placeholder until the owner writes it. */
export function WhyIBuild() {
  const placeholder = why.body.startsWith("[");
  return (
    <section id="why" aria-labelledby="why-heading" className="jf-section jf-why">
      <Container>
        <h2 id="why-heading" className="jf-section-title">{why.heading}</h2>
        <p className={placeholder ? "jf-why-body jf-placeholder" : "jf-why-body"}>{why.body}</p>
        <Link href="/about" className="jf-text-link">
          {why.link}
        </Link>
      </Container>
    </section>
  );
}
