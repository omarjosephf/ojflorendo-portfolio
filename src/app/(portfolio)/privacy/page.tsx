import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { privacyIntro, privacySections, privacyUpdated } from "@/data/privacy";

const title = "Privacy notice";
const description =
  "What this site collects, why, who else handles it and what you can ask Joseph Florendo to do with your data.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "website", url: "/privacy", title, description },
};

/** The privacy notice; the wording lives in `src/data/privacy.ts`. */
export default function PrivacyPage() {
  return (
    <article aria-labelledby="privacy-title" className="jf-section jf-privacy">
      <Container>
        <div className="jf-section-head">
          <h1 id="privacy-title" className="jf-section-title">
            {title}
          </h1>
          <p className="jf-section-intro">{privacyIntro}</p>
          <p className="jf-fine jf-updated">Last updated {privacyUpdated}</p>
        </div>
        <ul className="jf-rows">
          {privacySections.map((section) => (
            <li key={section.id} className="jf-row">
              <h2 id={section.id} className="jf-row-title">
                {section.heading}
              </h2>
              <div className="jf-privacy-text">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="jf-row-text">
                    {paragraph}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </article>
  );
}
