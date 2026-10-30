import { SkipLink } from "@/components/layout/SkipLink";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { NotFoundContent } from "@/components/layout/NotFoundContent";
import { archivo } from "./(portfolio)/font";
import "./(portfolio)/site.css";

/**
 * The 404 for any address that matches no route. It renders outside the
 * portfolio layout, so it brings the site's own shell: the night look, the
 * navigation and the footer. A missing post or case study raises the 404 in
 * `(portfolio)/not-found.tsx` instead, inside the layout it already has.
 */
export default function NotFound() {
  return (
    <div className={`jf-site ${archivo.variable}`}>
      <SkipLink />
      <Nav />
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
      <Footer />
    </div>
  );
}
