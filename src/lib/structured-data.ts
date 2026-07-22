import { site } from "@/data/site";
import { SITE_URL } from "@/lib/site-url";
import type { ProjectItem } from "@/types";

/**
 * Person + WebSite structured data (schema.org) for SEO and rich results
 * (CLAUDE.md §13). Built only from trusted, self-authored static content — no
 * user input ever reaches this object. Rendered by <StructuredData/>.
 */
export function buildStructuredData() {
  const sameAs = site.socials
    .filter((s) => s.external)
    .map((s) => s.href);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: site.name,
        url: SITE_URL,
        jobTitle: "Computing & IT (Software) Student; AI, Python & Data Trainer",
        description: site.headline,
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
        description: site.headline,
        inLanguage: "en-GB",
        publisher: { "@id": `${SITE_URL}/#person` },
      },
    ],
  } as const;
}

/**
 * CreativeWork structured data for a project case study. Built only from
 * trusted, self-authored static content.
 */
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
    author: { "@type": "Person", name: site.name, url: SITE_URL },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  } as const;
}
