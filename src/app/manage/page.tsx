import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ManagementWorkspace } from "@/components/management/ManagementWorkspace";
import { previewAllowed, storageAllowed } from "@/lib/management/access";
import corpus from "@/data/management-corpus.generated.json";
import { LocalWorkspaceStore } from "@/lib/management/local-store";
import type { WorkspaceState, CorpusSnapshot } from "@/lib/management/types";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "E.V · Management preview", description: "Private local preview of E.V management.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
};
export default async function ManagementPage() {
  const host=(await headers()).get("host");
  if(!previewAllowed(host)&&storageAllowed(host))redirect("/manage/live");
  if (!previewAllowed(host)) notFound();
  let initialStore: WorkspaceState | null = null;
  let initialError = "";
  try { initialStore = await new LocalWorkspaceStore().read(); }
  catch { initialError = "The local workspace could not be read. Existing data have not been reset."; }
  return <ManagementWorkspace corpus={corpus as CorpusSnapshot} initialStore={initialStore} initialError={initialError} liveEnabled={process.env.EV_CONVERSATION_STORAGE === "staging"} />;
}
