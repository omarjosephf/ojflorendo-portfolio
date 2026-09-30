import { createHash } from "node:crypto";

import type {
  OfflineSourceDocument,
  SourceSecurityFinding,
  SourceSecurityFindingKind,
} from "./types";

interface InjectionPattern {
  kind: SourceSecurityFindingKind;
  expression: RegExp;
}

const INJECTION_PATTERNS: readonly InjectionPattern[] = [
  {
    kind: "instruction-override",
    expression:
      /\b(?:ignore|disregard|override|forget)\b[^\r\n]{0,80}\b(?:previous|prior|system|developer|original)\b[^\r\n]{0,40}\b(?:instruction|message|prompt|rule)s?\b/giu,
  },
  {
    kind: "prompt-extraction",
    expression:
      /\b(?:reveal|repeat|print|show|return|expose)\b[^\r\n]{0,80}\b(?:system|developer|hidden)\b[^\r\n]{0,40}\b(?:instruction|message|prompt|rule)s?\b/giu,
  },
  {
    kind: "role-spoofing",
    expression: /(?:<\/?(?:system|developer)>|\[(?:system|developer)\]|\bact as (?:the )?(?:system|developer|administrator)\b)/giu,
  },
  {
    kind: "credential-exfiltration",
    expression:
      /\b(?:send|upload|post|reveal|exfiltrate)\b[^\r\n]{0,100}\b(?:secret|credential|token|api[ _-]?key|password)s?\b/giu,
  },
] as const;

const SENSITIVE_MATERIAL_PATTERNS: readonly RegExp[] = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/u,
  /\b(?:sk-(?:proj-)?|gh[pousr]_|github_pat_)[A-Za-z0-9_-]{16,}\b/u,
  /\bAIza[0-9A-Za-z_-]{20,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u,
  /\b(?:api[_ -]?key|access[_ -]?token|auth(?:orization)?|password|secret)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{8,}/iu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b\d{3}-\d{2}-\d{4}\b/u,
] as const;

// These patterns intentionally reject actionable machine-local locations. A
// public technical example may therefore need a relative path instead. That is
// the fail-closed trade-off for preventing account, host, share and temporary
// paths from entering a durable draft/review bundle. Matches wholly inside the
// scheme or forward-slash pathname of a valid HTTP(S) URL are public URL text,
// not machine-local paths; query strings and fragments receive no exemption.
const MACHINE_LOCAL_PATH_PATTERNS: readonly RegExp[] = [
  /(?:file:\/\/\/)?[A-Z]:[\\/]/giu,
  /\b[A-Z]:(?![\\/])[^:\/\s"'<>|?*]+[\\/]/giu,
  /[\\/]{2}[?.][\\/]/gu,
  /(?<![A-Z0-9.])\/(?:\?\?|Device|GLOBAL\?\?)\//giu,
  /file:\/\/[^/\s"'<>]+\/[^/\s"'<>]+/giu,
  /~(?:[A-Z0-9._+-]+)?[\\/]/giu,
  /(?<![A-Z0-9.])\/(?:Users|home)\/+[^/\s"'<>?#]+/giu,
  /(?<![A-Z0-9.])\/root(?=[/\s<>"'`()\[\]{}:;,!?]|$|\.(?:\s|$))/giu,
  /(?<![A-Z0-9.])\/mnt\/[A-Z]\/Users\/+[^/\s"'<>?#]+/giu,
  /(?<![A-Z0-9.])\/(?:tmp|var\/tmp|private\/tmp|private\/var\/tmp)(?=[/\s<>"'`()\[\]{}:;,!?]|$|\.(?:\s|$))/giu,
  /(?<![A-Z0-9.])\/dev\/shm(?=[/\s<>"'`()\[\]{}:;,!?]|$|\.(?:\s|$))/giu,
  /(?<![A-Z0-9.])\/(?:private\/)?var\/folders\/+[^/\s"'<>?#]+\/+[^/\s"'<>?#]+/giu,
  /(?<![A-Z0-9.])\/run\/user\/\d+(?=[/\s<>"'`()\[\]{}:;,!?]|$|\.(?:\s|$))/giu,
  /%(?:USERPROFILE|APPDATA|LOCALAPPDATA|TEMP|TMP|CD)%[\\/]/giu,
  /%HOMEDRIVE%%HOMEPATH%[\\/]/giu,
  /\$env:(?:USERPROFILE|APPDATA|LOCALAPPDATA|TEMP|TMP)[\\/]/giu,
  /\$\{env:(?:USERPROFILE|APPDATA|LOCALAPPDATA|TEMP|TMP)\}[\\/]/giu,
  /\$(?:HOME|TMPDIR|XDG_RUNTIME_DIR|PWD)[\\/]|\$\{(?:HOME|TMPDIR|XDG_RUNTIME_DIR|PWD)\}[\\/]/giu,
] as const;

const UNC_PATH = /[\\/]{2}[^\\/\s"'<>|?*]+[\\/]+[^\\/\s"'<>|?*]+/gu;
const PUBLIC_HTTP_URL = /https?:\/\/[^\s<>"'`()\[\]{}|*?#]+/giu;
const DEFAULT_IGNORABLES = /\p{Default_Ignorable_Code_Point}/gu;
const PERCENT_ESCAPE_RUN = /(?:%[0-9A-F]{2})+/giu;
const SINGLE_PERCENT_ESCAPE = /%([0-9A-F]{2})/giu;
const SECURITY_DECODE_MAX_PASSES = 16;

function normalizedSecurityText(value: string) {
  return value.normalize("NFKC").replace(DEFAULT_IGNORABLES, "");
}

export function isDisallowedLocalHostname(value: string) {
  let hostname = value
    .toLocaleLowerCase("en-GB")
    .replace(/^\[/u, "")
    .replace(/\]$/u, "")
    .replace(/\.$/u, "");
  if (!hostname.includes(":")) {
    try {
      hostname = new URL(`https://${hostname}/`).hostname
        .toLocaleLowerCase("en-GB")
        .replace(/\.$/u, "");
    } catch {
      return true;
    }
  }
  const localSuffixes = [
    "localhost",
    "local",
    "localdomain",
    "internal",
    "lan",
    "home",
    "home.arpa",
  ];
  if (localSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) {
    return true;
  }
  if (!hostname.includes(".") && !hostname.includes(":")) return true;

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) return true;
    const [first, second] = octets;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      first >= 224
    );
  }

  if (hostname.includes(":")) {
    return (
      hostname === "::" ||
      hostname === "::1" ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      /^fe[89ab](?::|$)/u.test(hostname) ||
      hostname.startsWith("::ffff:")
    );
  }
  return false;
}

function trimMarkdownDelimitedUrl(value: string, start: number, rawUrl: string) {
  const prefix = value.slice(Math.max(0, start - 2), start);
  const marker = prefix.endsWith("~~")
    ? "~~"
    : prefix.endsWith("__")
      ? "__"
      : prefix.endsWith("_")
        ? "_"
        : undefined;
  if (!marker) return rawUrl;
  const close = rawUrl.indexOf(marker, rawUrl.indexOf("://") + 3);
  return close < 0 ? rawUrl : rawUrl.slice(0, close);
}

function hasPublicUrlBoundary(value: string, start: number) {
  if (start === 0) return true;
  return /[\s(\[<{>"'`*_~=:;,&?!#—–-]/u.test(value[start - 1]);
}

function maskPublicHttpUrlPaths(value: string) {
  let result = "";
  let cursor = 0;
  for (const match of value.matchAll(PUBLIC_HTTP_URL)) {
    const start = match.index;
    if (!hasPublicUrlBoundary(value, start)) continue;
    const rawUrl = trimMarkdownDelimitedUrl(value, match.index, match[0]);
    try {
      const parsed = new URL(rawUrl);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password ||
        isDisallowedLocalHostname(parsed.hostname)
      ) {
        continue;
      }
      const authorityStart = rawUrl.indexOf("://") + 3;
      const backslashStart = rawUrl.indexOf("\\", authorityStart);
      const maskLength = backslashStart < 0 ? rawUrl.length : backslashStart;
      result += value.slice(cursor, start);
      result += " ".repeat(maskLength);
      result += match[0].slice(maskLength);
      cursor = start + match[0].length;
    } catch {
      // A malformed URL-like token is left visible to the privacy scan.
    }
  }
  return result + value.slice(cursor);
}

function tolerantPercentDecode(value: string) {
  return value.replace(PERCENT_ESCAPE_RUN, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      // Preserve invalid non-ASCII byte sequences, but still recover every
      // valid ASCII escape. A stray `%ZZ` must not hide `%2Fhome` or `sk%2D`.
      return run.replace(SINGLE_PERCENT_ESCAPE, (encoded, hex: string) => {
        const byte = Number.parseInt(hex, 16);
        return byte <= 0x7f ? String.fromCharCode(byte) : encoded;
      });
    }
  });
}

function securityTextCandidates(value: string) {
  const candidates: string[] = [];
  const seen = new Set<string>();
  let candidate = value;

  for (let pass = 0; pass < SECURITY_DECODE_MAX_PASSES; pass += 1) {
    const normalized = normalizedSecurityText(candidate);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      candidates.push(normalized);
    }
    const decoded = tolerantPercentDecode(normalized);
    if (decoded === normalized) return { candidates, decodeLimitExceeded: false };
    candidate = decoded;
  }
  return { candidates, decodeLimitExceeded: true };
}

function canonicalizePathSegments(value: string) {
  let candidate = value.replace(/\\/gu, "/");
  for (let pass = 0; pass < 16; pass += 1) {
    const next = candidate
      .replace(/(^|\/)[^/\s"'<>|?*]+\/\.\.\//gu, "$1")
      .replace(/(^|\/)\.\.\//gu, "$1")
      .replace(/(^|\/)\.\//gu, "$1");
    if (next === candidate) return candidate;
    candidate = next;
  }
  return candidate;
}

const CREDENTIAL_QUERY_KEY =
  /(?:key|token|secret|password|signature|credential|auth|session|x-amz-|sig|code)/iu;
const URL_PARAMETER = /(?:^|[?&#;/])([^?&#;/=]+)=/gu;

function hasCredentialParameter(value: string) {
  const { candidates, decodeLimitExceeded } = securityTextCandidates(value);
  if (decodeLimitExceeded) return true;
  return candidates.some((candidate) =>
    [...candidate.matchAll(URL_PARAMETER)].some((match) => CREDENTIAL_QUERY_KEY.test(match[1])),
  );
}

function hasCredentialQueryKey(parsed: URL) {
  const keyMatch = [...parsed.searchParams.keys()].some((key) => {
    const { candidates, decodeLimitExceeded } = securityTextCandidates(key);
    return decodeLimitExceeded || candidates.some((candidate) => CREDENTIAL_QUERY_KEY.test(candidate));
  });
  if (keyMatch) return true;
  return hasCredentialParameter(parsed.search);
}

function hasCredentialFragment(parsed: URL) {
  return hasCredentialParameter(parsed.hash);
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function utf8Bytes(value: string) {
  return Buffer.byteLength(value, "utf8");
}

export function sliceUtf8(value: string, startByte: number, endByte: number) {
  const bytes = Buffer.from(value, "utf8");
  const slice = bytes.subarray(startByte, endByte);
  const text = slice.toString("utf8");

  // Re-encoding catches offsets that split a multi-byte character. A replacement
  // character must never be accepted as an "exact" source span.
  if (!Buffer.from(text, "utf8").equals(slice)) return undefined;
  return text;
}

export function containsSensitiveMaterial(value: string) {
  const { candidates, decodeLimitExceeded } = securityTextCandidates(value);
  return (
    decodeLimitExceeded ||
    hasCredentialParameter(value) ||
    candidates.some((candidate) =>
      SENSITIVE_MATERIAL_PATTERNS.some((pattern) => pattern.test(candidate)),
    )
  );
}

function normalizedTextContainsMachineLocalPath(value: string) {
  const variants = [value.replace(/\\/gu, "/"), canonicalizePathSegments(value)];
  return variants.some(
    (candidate) =>
      [...candidate.matchAll(UNC_PATH)].length > 0 ||
      MACHINE_LOCAL_PATH_PATTERNS.some((pattern) => [...candidate.matchAll(pattern)].length > 0),
  );
}

export function containsMachineLocalPath(value: string) {
  const seen = new Set<string>();
  // Only syntactically valid HTTP(S) URL paths present in the original value
  // receive the public-path exemption. Normalization or percent decoding must
  // not manufacture a newly trusted URL scheme around a local path.
  let candidate = normalizedSecurityText(maskPublicHttpUrlPaths(value));
  for (let pass = 0; pass < SECURITY_DECODE_MAX_PASSES; pass += 1) {
    if (normalizedTextContainsMachineLocalPath(candidate)) return true;
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    const decoded = normalizedSecurityText(tolerantPercentDecode(candidate));
    if (decoded === candidate) return false;
    candidate = decoded;
  }
  return true;
}

export function containsDisallowedPrivateMaterial(value: string) {
  return containsSensitiveMaterial(value) || containsMachineLocalPath(value);
}

export function containsDisallowedPrivateMaterialInValue(value: unknown): boolean {
  const seen = new WeakSet<object>();
  const visit = (entry: unknown): boolean => {
    if (typeof entry === "string") return containsDisallowedPrivateMaterial(entry);
    if (entry === null || typeof entry !== "object") return false;
    if (seen.has(entry)) return false;
    seen.add(entry);
    return Object.values(entry).some(visit);
  };
  return visit(value);
}

export function findTextSecurityFindings(content: string) {
  const findings: Array<{
    kind: SourceSecurityFindingKind;
    startByte: number;
    endByte: number;
    sha256: string;
  }> = [];
  for (const { kind, expression } of INJECTION_PATTERNS) {
    expression.lastIndex = 0;
    for (const match of content.matchAll(expression)) {
      if (match.index === undefined) continue;
      const startByte = utf8Bytes(content.slice(0, match.index));
      findings.push({
        kind,
        startByte,
        endByte: startByte + utf8Bytes(match[0]),
        sha256: sha256(match[0]),
      });
    }
  }
  return findings.sort(
    (left, right) => left.startByte - right.startByte || left.kind.localeCompare(right.kind, "en-GB"),
  );
}

export function containsInstructionLikeText(value: string) {
  const { candidates, decodeLimitExceeded } = securityTextCandidates(value);
  return decodeLimitExceeded || candidates.some((candidate) => findTextSecurityFindings(candidate).length > 0);
}

/**
 * Returns the shared persisted-input URL policy failures without performing any
 * I/O. Keeping this policy in one place prevents saved bundle verification from
 * becoming weaker than initial input admission.
 */
export function sourceUrlPolicyIssues(value: string, allowedDomains: readonly string[]) {
  const issues: string[] = [];
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/\s/u.test(value)) {
    try {
      const parsed = new URL(value, "https://same-origin.invalid");
      if (hasCredentialQueryKey(parsed)) {
        issues.push("must not contain credential-shaped query parameters");
      }
      if (
        hasCredentialFragment(parsed) ||
        containsDisallowedPrivateMaterial(value)
      ) {
        issues.push("contains credential-shaped sensitive material or a machine-local path");
      }
    } catch {
      issues.push("must be a valid same-origin path");
    }
    return issues;
  }

  if (!value.startsWith("https://") || value.includes("\\") || /\s/u.test(value)) {
    return ["must be an HTTPS URL or a same-origin path"];
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) {
      issues.push("must be an HTTPS URL without credentials or an explicit port");
    }
    // Exact matching is intentional. A parent domain does not silently approve
    // every subdomain; each host must be named by the owner-supplied input.
    if (!allowedDomains.includes(parsed.hostname.toLocaleLowerCase("en-GB"))) {
      issues.push("hostname is not in allowedDomains");
    }
    if (isDisallowedLocalHostname(parsed.hostname)) {
      issues.push("hostname must not identify a loopback, private, link-local or local-network host");
    }
    if (hasCredentialQueryKey(parsed)) {
      issues.push("must not contain credential-shaped query parameters");
    }
    if (
      hasCredentialFragment(parsed) ||
      containsDisallowedPrivateMaterial(value)
    ) {
      issues.push("contains credential-shaped sensitive material or a machine-local path");
    }
  } catch {
    issues.push("must be a valid HTTPS URL or same-origin path");
  }
  return issues;
}

export function findSourceSecurityFindings(
  sources: readonly OfflineSourceDocument[],
): SourceSecurityFinding[] {
  const findings: SourceSecurityFinding[] = [];

  for (const source of sources) {
    for (const finding of findTextSecurityFindings(source.content)) {
      findings.push({
        sourceId: source.id,
        ...finding,
      });
    }
  }

  return findings.sort(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId, "en-GB") ||
      left.startByte - right.startByte ||
      left.kind.localeCompare(right.kind, "en-GB"),
  );
}

export function overlapsSecurityFinding(
  sourceId: string,
  startByte: number,
  endByte: number,
  findings: readonly SourceSecurityFinding[],
) {
  return findings.some(
    (finding) =>
      finding.sourceId === sourceId &&
      startByte < finding.endByte &&
      endByte > finding.startByte,
  );
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
