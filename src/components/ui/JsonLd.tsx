/**
 * Renders a JSON-LD structured-data block (CLAUDE.md §13).
 *
 * NOTE (documented exception to CLAUDE.md §15 — see SECURITY.md, gap G12): this
 * and <StructuredData/> are the only uses of `dangerouslySetInnerHTML`. It is the
 * official Next.js JSON-LD pattern and is safe here because the payload is 100%
 * static, self-authored data (no user input), `<` is escaped to `<`, the
 * element is a non-executable `application/ld+json` data block, and it carries
 * the request nonce.
 */
export function JsonLd({ data, nonce }: { data: unknown; nonce?: string }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
