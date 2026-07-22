import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getProjectBySlug, projects } from "@/data/projects";
import { buildCaseStudyJsonLd } from "@/lib/structured-data";
import { CaseStudyView } from "@/components/case-study/CaseStudyView";
import { JsonLd } from "@/components/ui/JsonLd";

type Params = { params: Promise<{ slug: string }> };

/** Pre-list the known case-study slugs. */
export function generateStaticParams() {
  return projects.filter((p) => p.caseStudy).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project?.caseStudy) return {};

  const title = `${project.title} — Case study`;
  const description = project.caseStudy.overview.slice(0, 155);
  const path = `/projects/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project?.caseStudy) notFound();

  // Read the request nonce (also opts this route into dynamic rendering, which
  // the nonce-based CSP requires — consistent with the rest of the site).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <CaseStudyView project={project} />
      <JsonLd data={buildCaseStudyJsonLd(project)} nonce={nonce} />
    </>
  );
}
