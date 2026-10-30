import { site } from "@/data/site";
import { getProjectBySlug } from "@/data/projects";
import { renderShareCard, shareCardContentType, shareCardSize } from "@/lib/og/share-card";

export const alt = `A case study by ${site.name}`;
export const size = shareCardSize;
export const contentType = shareCardContentType;

/** Each case study's card carries its project's name and one-line tagline. */
export default async function CaseStudyOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project?.caseStudy) return new Response("Not found", { status: 404 });

  return renderShareCard({
    eyebrow: `Case study · ${site.name}`,
    title: project.title,
    line: project.caseStudy.tagline,
  });
}
