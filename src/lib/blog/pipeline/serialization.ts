import { deepFreeze, sha256 } from "./security";

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, canonicalValue(child)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalValue(value));
}

export function canonicalSha256(value: unknown) {
  return sha256(canonicalJson(value));
}

export function withIntegrity<T extends object>(value: T) {
  const result = {
    ...value,
    integrity: {
      algorithm: "sha256" as const,
      sha256: canonicalSha256(value),
    },
  };
  return deepFreeze(result);
}

export function verifyIntegrity(value: { integrity: { algorithm: "sha256"; sha256: string } }) {
  const { integrity, ...unsigned } = value;
  return integrity.algorithm === "sha256" && integrity.sha256 === canonicalSha256(unsigned);
}
