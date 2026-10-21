/**
 * Whether a POST is a JSON request from this site's own pages.
 *
 * A `text/plain` body is a "simple" request: any other site can send one
 * from its visitors' browsers with no preflight, spreading paid E.V calls or
 * spam across many addresses so the per-address limiter never trips. Requiring
 * `application/json` forces the browser's preflight, which this site never
 * answers. `Sec-Fetch-Site` is sent by current browsers; when it is present it
 * must say same-origin. A client without that header, such as a server or a
 * test, still has to send the JSON content type.
 */
export function isSameOriginJson(req: Request): boolean {
  const type = (req.headers.get("content-type") ?? "").trim().toLowerCase();
  if (type !== "application/json" && !type.startsWith("application/json;")) return false;
  const site = req.headers.get("sec-fetch-site");
  return site === null || site === "same-origin";
}
