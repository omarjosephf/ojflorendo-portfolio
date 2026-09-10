// Application backup encryption only. No network, filesystem, credential loader,
// key generation, database restore or provider activation lives in this module.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const BACKUP_TABLES = Object.freeze([
  "public.ev_knowledge_drafts", "public.ev_conversations", "public.ev_messages",
  "public.ev_answer_events", "public.ev_feedback", "public.ev_message_results",
  "ev_private.generation_requests", "ev_private.editorial_receipts",
  "public.ev_gap_reviews", "ev_private.deleted_conversations",
]);
export const BACKUP_MAX_BYTES = 10 * 1024 * 1024;
export const BACKUP_LIFETIME_MS = 7 * 86_400_000;
const ENVELOPE_MAX_BYTES = 14 * 1024 * 1024;
const encode = (value) => JSON.stringify(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const requireValue = (condition) => { if (!condition) throw new Error("Invalid backup"); };

export class BackupEnvelopeError extends Error {
  constructor() { super("Encrypted backup could not be verified."); this.name = "BackupEnvelopeError"; }
}
function keys(value, expected) {
  requireValue(object(value) && encode(Object.keys(value).sort()) === encode([...expected].sort()));
}
function timestamp(value) {
  requireValue(typeof value === "string");
  const ms = Date.parse(value);
  requireValue(Number.isSafeInteger(ms) && ms >= 0);
  return ms;
}
function context(key, options) {
  requireValue(Buffer.isBuffer(key) && key.length === 32);
  requireValue(object(options) && ["application", "deletions"].includes(options.kind));
  requireValue(typeof options.sourceId === "string" && /^[a-z0-9-]{1,80}$/.test(options.sourceId));
  const now = options.now ?? Date.now();
  requireValue(Number.isSafeInteger(now) && now >= 0);
  return now;
}
function payload(text, options, now) {
  requireValue(typeof text === "string" && Buffer.byteLength(text) > 0 && Buffer.byteLength(text) <= BACKUP_MAX_BYTES);
  requireValue(Buffer.from(text, "utf8").toString("utf8") === text);
  const data = JSON.parse(text);
  keys(data, options.kind === "application" ? ["version", "sourceId", "capturedAt", "schemaSha256", "tables"] : ["version", "sourceId", "capturedAt", "conversations"]);
  requireValue(data.version === 1 && data.sourceId === options.sourceId);
  const capturedAt = timestamp(data.capturedAt);
  requireValue(capturedAt <= now && now < capturedAt + BACKUP_LIFETIME_MS);
  if (options.kind === "application") {
    requireValue(typeof data.schemaSha256 === "string" && /^[a-f0-9]{64}$/.test(data.schemaSha256));
    keys(data.tables, BACKUP_TABLES);
    for (const table of BACKUP_TABLES) requireValue(Array.isArray(data.tables[table]) && data.tables[table].length <= 10000 && data.tables[table].every(object));
  } else {
    requireValue(Array.isArray(data.conversations) && data.conversations.length <= 10000);
    for (const row of data.conversations) {
      keys(row, ["conversation_id", "deleted_at"]);
      requireValue(typeof row.conversation_id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.conversation_id));
      requireValue(timestamp(row.deleted_at) <= capturedAt);
    }
  }
  return capturedAt;
}
function header(key, options, capturedAt) {
  return { version: 1, algorithm: "A256GCM", keyId: sha256(key), kind: options.kind, sourceId: options.sourceId, capturedAt: new Date(capturedAt).toISOString(), expiresAt: new Date(capturedAt + BACKUP_LIFETIME_MS).toISOString() };
}
function aad(value) { return Buffer.from(`ev-backup-envelope:v1\0${encode(value)}`, "utf8"); }
function decode(value, exactLength) {
  requireValue(typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value));
  const bytes = Buffer.from(value, "base64url");
  requireValue(bytes.toString("base64url") === value && bytes.length > 0 && bytes.length <= BACKUP_MAX_BYTES);
  if (exactLength !== undefined) requireValue(bytes.length === exactLength);
  return bytes;
}

/** Keys must be generated and held separately by the operator; never a password. */
export function sealBackup(text, key, options) {
  try {
    const now = context(key, options);
    const metadata = header(key, options, payload(text, options, now));
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce, { authTagLength: 16 });
    cipher.setAAD(aad(metadata));
    const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return encode({ ...metadata, nonce: nonce.toString("base64url"), ciphertext: ciphertext.toString("base64url"), tag: cipher.getAuthTag().toString("base64url") });
  } catch { throw new BackupEnvelopeError(); }
}

/** Decryption alone never authorizes restore. The caller must still reconcile
 * the independently latest deletion ledger, principal mapping and reviewed schema. */
export function openBackup(envelopeText, key, options) {
  try {
    const now = context(key, options);
    requireValue(typeof envelopeText === "string" && Buffer.byteLength(envelopeText) <= ENVELOPE_MAX_BYTES);
    const envelope = JSON.parse(envelopeText);
    keys(envelope, ["version", "algorithm", "keyId", "kind", "sourceId", "capturedAt", "expiresAt", "nonce", "ciphertext", "tag"]);
    const capturedAt = timestamp(envelope.capturedAt);
    requireValue(capturedAt <= now && now < capturedAt + BACKUP_LIFETIME_MS);
    const metadata = header(key, options, capturedAt);
    for (const [name, expected] of Object.entries(metadata)) requireValue(envelope[name] === expected);
    const decipher = createDecipheriv("aes-256-gcm", key, decode(envelope.nonce, 12), { authTagLength: 16 });
    decipher.setAAD(aad(metadata));
    decipher.setAuthTag(decode(envelope.tag, 16));
    const chunks = [];
    let plaintext;
    try {
      chunks.push(decipher.update(decode(envelope.ciphertext)));
      chunks.push(decipher.final()); // Do not return or parse bytes before authentication.
      plaintext = Buffer.concat(chunks);
      const text = plaintext.toString("utf8");
      requireValue(Buffer.from(text, "utf8").equals(plaintext));
      requireValue(payload(text, options, now) === capturedAt);
      return text;
    } finally {
      for (const chunk of chunks) chunk.fill(0);
      plaintext?.fill(0);
    }
  } catch { throw new BackupEnvelopeError(); }
}
