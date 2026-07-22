import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Static security headers applied to every response.
 *
 * The Content-Security-Policy is intentionally NOT set here — it is generated
 * per-request with a fresh nonce in `src/proxy.ts` (see CLAUDE.md §14 and the
 * Next.js CSP guide). These headers are the static, request-independent part of
 * our defence-in-depth header set.
 */
const securityHeaders = [
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy clickjacking fallback (superseded by CSP `frame-ancestors 'none'`).
  { key: "X-Frame-Options", value: "DENY" },
  // Limit referrer leakage to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features this static site never uses.
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), browsing-topics=()",
  },
  // Block Adobe cross-domain policy files.
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // Allow the browser to resolve DNS of same-page links early.
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Enforce HTTPS in production only (harmless-but-pointless over local http).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Do not advertise the framework in an `X-Powered-By` header.
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
