import Link from "next/link";
import { PageNotice } from "@/components/layout/PageNotice";

/** What a visitor sees for a page that does not exist, wherever it is raised. */
export function NotFoundContent() {
  return (
    <PageNotice
      label="404"
      title="This page isn't here"
      body="The link may be old, or the page may have moved. Everything on the site is one step away from the home page."
    >
      <Link href="/" className="jf-button">
        Back to the home page
      </Link>
      <Link href="/blog" className="jf-button jf-button-quiet">
        Read the blog
      </Link>
    </PageNotice>
  );
}
