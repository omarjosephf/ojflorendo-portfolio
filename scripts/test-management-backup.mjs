import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { BACKUP_TABLES, BACKUP_LIFETIME_MS, BACKUP_MAX_BYTES, BackupEnvelopeError, sealBackup, openBackup } from "./management-backup.mjs";

const key = randomBytes(32), now = Date.now(), sourceId = "synthetic-encrypted-backup";
const options = { kind: "application", sourceId, now };
const data = { version: 1, sourceId, capturedAt: new Date(now).toISOString(), schemaSha256: "a".repeat(64), tables: Object.fromEntries(BACKUP_TABLES.map(table => [table, []])) };
data.tables["public.ev_knowledge_drafts"] = [{ body: "Synthetic private knowledge: café 東京", provenance: "Synthetic reviewed source" }];
const text = JSON.stringify(data), sealed = sealBackup(text, key, options);
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function reject(fn) { assert.throws(fn, error => error instanceof BackupEnvelopeError && error.message === "Encrypted backup could not be verified." && error.cause === undefined); }
function changed(field, value) { return JSON.stringify({ ...JSON.parse(sealed), [field]: value }); }
function flip(value) { const bytes = Buffer.from(value, "base64url"); bytes[0] ^= 1; return bytes.toString("base64url"); }

check("application encryption preserves exact UTF-8 bytes", () => assert.equal(openBackup(sealed, key, options), text));
check("stored envelope contains no private draft text or key bytes", () => { assert.ok(!sealed.includes("Synthetic private knowledge")); assert.ok(!sealed.includes(key.toString("hex"))); assert.ok(!sealed.includes(key.toString("base64"))); });
check("repeat backups use independent random nonces", () => { const next = sealBackup(text, key, options); assert.notEqual(JSON.parse(next).nonce, JSON.parse(sealed).nonce); assert.notEqual(next, sealed); });
check("deletion-ledger encryption preserves its separate purpose", () => {
  const ledger = JSON.stringify({ version: 1, sourceId, capturedAt: new Date(now).toISOString(), conversations: [{ conversation_id: "90000000-0000-4000-8000-000000000001", deleted_at: new Date(now).toISOString() }] });
  const context = { ...options, kind: "deletions" };
  const encrypted = sealBackup(ledger, key, context);
  assert.equal(openBackup(encrypted, key, context), ledger);
  reject(() => openBackup(encrypted, key, options));
});
check("wrong key and password-shaped keys fail without sensitive errors", () => { reject(() => openBackup(sealed, randomBytes(32), options)); reject(() => sealBackup(text, "password", options)); reject(() => openBackup(sealed, Buffer.alloc(31), options)); });
check("wrong expected source and purpose reject the entire artifact", () => { reject(() => openBackup(sealed, key, { ...options, sourceId: "another-source" })); reject(() => openBackup(sealed, key, { ...options, kind: "deletions" })); });
check("tampering with every authenticated header field rejects", () => {
  for (const [field, value] of Object.entries({ version: 2, algorithm: "A128GCM", keyId: "b".repeat(64), kind: "deletions", sourceId: "changed", capturedAt: new Date(now - 1).toISOString(), expiresAt: new Date(now + BACKUP_LIFETIME_MS + 1).toISOString() })) reject(() => openBackup(changed(field, value), key, options));
});
check("ciphertext, nonce and tag tampering never releases partial plaintext", () => { for (const field of ["ciphertext", "nonce", "tag"]) reject(() => openBackup(changed(field, flip(JSON.parse(sealed)[field])), key, options)); });
check("truncated tags, nonces and ciphertext reject", () => { for (const field of ["ciphertext", "nonce", "tag"]) reject(() => openBackup(changed(field, Buffer.from(JSON.parse(sealed)[field], "base64url").subarray(1).toString("base64url")), key, options)); });
check("malformed, noncanonical and oversized envelopes reject", () => { for (const value of ["{", "null", "[]", sealed.slice(0,-1), " ".repeat(14*1024*1024+1), changed("tag", JSON.parse(sealed).tag + "="), changed("extra", "ignored")]) reject(() => openBackup(value, key, options)); });
check("expiry is enforced at seven days without extending the capture age", () => { assert.equal(openBackup(sealed, key, { ...options, now: now + BACKUP_LIFETIME_MS - 1 }), text); reject(() => openBackup(sealed, key, { ...options, now: now + BACKUP_LIFETIME_MS })); reject(() => sealBackup(text, key, { ...options, now: now + BACKUP_LIFETIME_MS })); });
check("future capture and invalid clocks fail closed", () => { reject(() => openBackup(sealed, key, { ...options, now: now - 1 })); for (const value of [NaN, Infinity, -1, 1.5]) reject(() => sealBackup(text, key, { ...options, now: value })); });
check("extra auth and budget tables cannot enter an application backup", () => { for (const name of ["auth.users", "auth.sessions", "ev_private.owners", "budget_private.allowances"]) reject(() => sealBackup(JSON.stringify({ ...data, tables: { ...data.tables, [name]: [] } }), key, options)); });
check("missing tables, unsupported schemas and extra envelope payload fields reject", () => { const tables = { ...data.tables }; delete tables[BACKUP_TABLES[0]]; for (const value of [{ ...data, tables }, { ...data, schemaSha256: "bad" }, { ...data, refresh_token: "synthetic" }, { ...data, sourceId: "other" }]) reject(() => sealBackup(JSON.stringify(value), key, options)); });
check("row and plaintext size bounds reject before encryption", () => { reject(() => sealBackup("x".repeat(BACKUP_MAX_BYTES+1), key, options)); reject(() => sealBackup(JSON.stringify({ ...data, tables: { ...data.tables, [BACKUP_TABLES[0]]: Array.from({ length:10001 }, () => ({})) } }), key, options)); });
check("deletion ledgers reject future and unexpected identity fields", () => {
  const context = { ...options, kind: "deletions" };
  for (const row of [{ conversation_id: "90000000-0000-4000-8000-000000000001", deleted_at: new Date(now+1).toISOString() }, { conversation_id: "not-an-id", deleted_at: new Date(now).toISOString() }, { conversation_id: "90000000-0000-4000-8000-000000000001", deleted_at: new Date(now).toISOString(), token: "synthetic" }]) reject(() => sealBackup(JSON.stringify({version:1,sourceId,capturedAt:new Date(now).toISOString(),conversations:[row]}),key,context));
});
check("authenticated but inconsistent payload metadata is rejected after decryption", () => {
  const header = {version:1,algorithm:"A256GCM",keyId:createHash("sha256").update(key).digest("hex"),kind:"application",sourceId,capturedAt:new Date(now).toISOString(),expiresAt:new Date(now+BACKUP_LIFETIME_MS).toISOString()};
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm",key,nonce,{authTagLength:16});
  cipher.setAAD(Buffer.from(`ev-backup-envelope:v1\0${JSON.stringify(header)}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({...data,sourceId:"different"})),cipher.final()]);
  reject(() => openBackup(JSON.stringify({...header,nonce:nonce.toString("base64url"),ciphertext:ciphertext.toString("base64url"),tag:cipher.getAuthTag().toString("base64url")}),key,options));
});
key.fill(0);
console.log(JSON.stringify({ passed, failed: 0, scope: "Local synthetic authenticated backup encryption; no actual key, upload, scheduler or managed restore" }));
