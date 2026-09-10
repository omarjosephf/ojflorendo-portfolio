// No filesystem or credential access. Adapters supply bounded storage operations.
import { randomUUID } from "node:crypto";
import { sealBackup, openBackup } from "./management-backup.mjs";

const DAY = 86_400_000;
const MAX_OBJECTS = 2000;
const requireValue = (condition) => { if (!condition) throw new Error("Backup operation failed."); };
export class BackupJobError extends Error {
  constructor(stage) { super(`Encrypted backup failed during ${stage}.`); this.name = "BackupJobError"; this.stage = stage; }
}
export const backupPrefix = (sourceId) => {
  requireValue(/^[a-z]{20}$/.test(sourceId));
  return `ev-backups/v1/${sourceId}/`;
};

async function inventory(store, prefix, now) {
  const objects = [];
  const tokens = new Set();
  let token;
  do {
    const page = await store.list(prefix, token);
    requireValue(Array.isArray(page.objects) && page.objects.length <= 200);
    for (const object of page.objects) {
      requireValue(typeof object.key === "string" && object.key.startsWith(prefix));
      const match = /^(\d{13})-([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\/(application|deletions)\.enc\.json$/.exec(object.key.slice(prefix.length));
      requireValue(match && Number(match[1]) <= now && Number(match[1]) > 0);
      objects.push({ key: object.key, capturedAt: Number(match[1]), kind: match[3] });
      requireValue(objects.length <= MAX_OBJECTS);
    }
    token = page.nextToken;
    if (token !== undefined) {
      requireValue(typeof token === "string" && token.length > 0 && token.length <= 4096 && !tokens.has(token));
      tokens.add(token);
      requireValue(tokens.size < 20);
    }
  } while (token !== undefined);
  requireValue(new Set(objects.map(({ key }) => key)).size === objects.length);
  return objects;
}

/** Delete only this source's recognized expired backup objects. Always verify
 * removal by listing again, including after an uncertain deletion response. */
export async function cleanBackupRetention(store, sourceId, now) {
  const prefix = backupPrefix(sourceId);
  const before = await inventory(store, prefix, now);
  const expired = before.filter((o) => now - o.capturedAt >= 6 * DAY);
  for (let offset = 0; offset < expired.length; offset += 100) {
    const keys = expired.slice(offset, offset + 100).map((o) => o.key);
    await store.remove(keys).catch(() => {}); // The authoritative re-list decides.
  }
  const after = expired.length ? await inventory(store, prefix, now) : before;
  requireValue(!after.some((o) => now - o.capturedAt >= 6 * DAY));
  return { removed: expired.length, existing: after };
}

async function uploadVerified(store, key, envelope) {
  // One retry, identical key and bytes. Conditional PUT never overwrites a file.
  for (let attempt = 0; attempt < 2; attempt++) {
    await store.put(key, envelope).catch(() => {});
    const stored = await store.get(key); // Read failure/unknown state stops retry.
    if (stored !== null) {
      requireValue(stored === envelope);
      return stored;
    }
  }
  throw new Error("Backup upload could not be verified.");
}

export async function runBackupJob({ store, capture, key, sourceId, now = Date.now }) {
  let stage = "configuration";
  try {
    requireValue(Buffer.isBuffer(key) && key.length === 32);
    const prefix = backupPrefix(sourceId);
    stage = "retention";
    const retention = await cleanBackupRetention(store, sourceId, now());
    stage = "export";
    const snapshot = await capture();
    requireValue(snapshot && Object.keys(snapshot).sort().join() === "application,deletions");
    const capturedAt = Date.parse(JSON.parse(snapshot.application).capturedAt);
    requireValue(capturedAt <= now() && now() - capturedAt < 5 * 60_000);
    requireValue(Date.parse(JSON.parse(snapshot.deletions).capturedAt) === capturedAt);
    requireValue(JSON.stringify(JSON.parse(snapshot.application).tables["ev_private.deleted_conversations"]) === JSON.stringify(JSON.parse(snapshot.deletions).conversations));
    const base = `${prefix}${capturedAt}-${randomUUID()}/`;
    stage = "encryption";
    // Validate and encrypt both files before any upload, including a retry.
    const envelopes = Object.fromEntries(["application", "deletions"].map((kind) => [kind, sealBackup(snapshot[kind], key, { kind, sourceId, now: now() })]));
    let uploadedBytes = 0;
    for (const kind of ["application", "deletions"]) {
      const context = { kind, sourceId, now: now() };
      const envelope = envelopes[kind];
      stage = "upload verification";
      const stored = await uploadVerified(store, `${base}${kind}.enc.json`, envelope);
      requireValue(openBackup(stored, key, { ...context, now: now() }) === snapshot[kind]);
      uploadedBytes += Buffer.byteLength(envelope);
    }
    const lastApplication = Math.max(0, ...retention.existing.filter((o) => o.kind === "application").map((o) => o.capturedAt));
    return { status: "verified", objectsUploaded: 2, uploadedBytes, expiredObjectsRemoved: retention.removed, previousBackupStale: lastApplication === 0 || now() - lastApplication > 2 * 3_600_000, capturedAt: new Date(capturedAt).toISOString() };
  } catch { throw new BackupJobError(stage); }
}
