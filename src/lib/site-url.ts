/**
 * Canonical absolute site URL.
 *
 * The production domain is https://ojfr.me. It can be overridden by
 * NEXT_PUBLIC_SITE_URL (e.g. for preview deployments) without a code change.
 * Metadata, canonical links, Open Graph, robots and the sitemap all resolve
 * against this value.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://ojfr.me"
).replace(/\/+$/, "");
