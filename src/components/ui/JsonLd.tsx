/**
 * Renders a JSON-LD structured-data block.
 *
 * NOTE (documented exception to docs/ENGINEERING_HANDBOOK.md §15.1, dangerous
 * APIs — see SECURITY.md, "Notable coding decisions"): the `<script>` below is
 * the only use of `dangerouslySetInnerHTML` in the codebase. It is the
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
