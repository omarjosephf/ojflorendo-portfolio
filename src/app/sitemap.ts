import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { projects } from "@/data/projects";

/**
 * XML sitemap.
 *
 * `lastModified` is emitted **only where a real content date exists**.
 *
 * It previously stamped `new Date()` on every entry, which meant each
 * deployment told search engines that every page had changed. Crawlers respond
 * to that by learning to distrust the field, so an always-now `lastmod` is worse
 * than none: it spends credibility to convey nothing.
 *
 * No machine-readable revision date is tracked for the landing page or the case
 * studies today, so neither carries the field. Omission is what "unknown" is
 * supposed to look like, and it is honest. Add a date here only once one is
 * genuinely recorded alongside that content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  // One entry per project that has a dedicated case-study route.
  const caseStudies: MetadataRoute.Sitemap = projects
    .filter((p) => p.caseStudy)
    .map((p) => ({
      url: `${SITE_URL}/projects/${p.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  return [...home, ...caseStudies];
}
