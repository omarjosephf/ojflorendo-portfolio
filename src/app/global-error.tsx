"use client";

import Link from "next/link";
import { PageNotice } from "@/components/layout/PageNotice";
import { archivo } from "./(portfolio)/font";
import "./globals.css";
import "./(portfolio)/site.css";

/**
 * The last-resort page when the root layout itself fails. It replaces the
 * whole document, so it brings its own html and body and no navigation that
 * could fail the same way. The message stays generic (handbook §15).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body>
        <div className={`jf-site ${archivo.variable}`}>
          <main id="main" className="flex-1">
            <PageNotice
              label="Something went wrong"
              title="The site didn't load"
              body="It's a problem on my side, not yours. Try again, or come back in a few minutes."
            >
              <button type="button" className="jf-button" onClick={reset}>
                Try again
              </button>
              <Link href="/" className="jf-button jf-button-quiet">
                Back to the home page
              </Link>
            </PageNotice>
          </main>
        </div>
      </body>
    </html>
  );
}
