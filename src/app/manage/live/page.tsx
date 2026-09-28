import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { previewAllowed, adminAllowed } from "@/lib/management/access";
import { LiveOwnerWorkspace } from "@/components/management/LiveOwnerWorkspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Owner admin",robots:{index:false,follow:false},alternates:{canonical:null}};
export default async function LiveOwnerPage(){
  if(!adminAllowed((await headers()).get("host")))notFound();
  return <LiveOwnerWorkspace preview={previewAllowed((await headers()).get("host"))} nonce={(await headers()).get("x-nonce")??undefined}/>;
}
