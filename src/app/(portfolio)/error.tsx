"use client";

import Link from "next/link";
import { PageNotice } from "@/components/layout/PageNotice";

/**
 * A page that failed while rendering. The message stays generic (handbook
 * §15): the error itself is never shown to the visitor.
 */
export default function PortfolioError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageNotice
      label="Something went wrong"
      title="This page didn't load"
      body="It's a problem on my side, not yours. Try again, or go back to the home page."
    >
      <button type="button" className="jf-button" onClick={reset}>
        Try again
      </button>
      <Link href="/" className="jf-button jf-button-quiet">
        Back to the home page
      </Link>
    </PageNotice>
  );
}
