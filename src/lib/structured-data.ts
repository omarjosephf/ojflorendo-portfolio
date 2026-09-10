import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { SITE_URL } from "@/lib/site-url";
import type { ProjectItem } from "@/types";

export function buildStructuredData() {
  const sameAs = site.socials
    .filter((social) => social.external)
    .map((social) => social.href);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: site.name,
        alternateName: positioning.professionalName,
        url: SITE_URL,
        jobTitle: site.descriptor,
        // Third person: this describes OJ to a machine reader, not to a visitor.
        // No Offer, Review, rating, price or service-area data is published here;
        // none of it would be verifiable.
        description: positioning.personDescription,
        email: `mailto:${site.email}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Windsor",
          addressRegion: "Berkshire",
          addressCountry: "GB",
        },
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: `${site.name} — Portfolio`,
        alternateName: `${positioning.professionalName} Portfolio`,
        description: positioning.seoDescription,
        inLanguage: "en-GB",
        publisher: { "@id": `${SITE_URL}/#person` },
      },
    ],
  } as const;
}

export function buildCaseStudyJsonLd(project: ProjectItem) {
  const url = `${SITE_URL}/projects/${project.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${project.title} — Case study`,
    headline: project.title,
    description: project.caseStudy?.overview ?? project.summary,
    url,
    inLanguage: "en-GB",
    keywords: project.technologies.join(", "),
    author: {
      "@type": "Person",
      name: site.name,
      alternateName: positioning.professionalName,
      url: SITE_URL,
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  } as const;
}
