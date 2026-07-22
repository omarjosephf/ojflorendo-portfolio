import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Per-request Content-Security-Policy with a fresh nonce.
 *
 * This follows the official Next.js CSP guide (App Router, Next 16 `proxy`
 * convention). A nonce-based, `strict-dynamic` script policy means we never
 * allow `'unsafe-inline'` for scripts in production — the primary XSS defence.
 * Next.js automatically attaches this nonce to its framework/bootstrap scripts
 * and any injected styles when it sees the CSP header on the incoming request.
 *
 * Consequence (documented in SECURITY.md, gap G2): using a nonce forces
 * dynamic rendering. The site is "static-first" in substance (no DB / auth /
 * user input) but is server-rendered per request rather than a static export.
 */
export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // `img-src blob: data:` — allows <canvas>/WebGL textures and data URIs.
  // Dev-only relaxations: `'unsafe-eval'` (React dev error overlay uses eval),
  // `'unsafe-inline'` styles, and websocket `connect-src` for Turbopack HMR.
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""}`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    // Enforce HTTPS sub-resources only in production.
    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ].join("; ");

  // Expose the nonce to the render pass (Next reads `x-nonce` and the CSP
  // header from the request) and echo the CSP on the response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Run on all document requests except:
       * - api routes
       * - _next/static and _next/image (build assets / optimizer)
       * - metadata files (favicon, sitemap, robots) and static images
       * Skip next/link prefetches so prefetched pages aren't given a stale nonce.
       */
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
