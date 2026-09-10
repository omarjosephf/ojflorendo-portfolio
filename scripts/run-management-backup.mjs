// Explicitly armed operator entry point. Never imported by the application.
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { loadBackupContract, exportManagedBackup } from "./management-backup-export.mjs";
import { runBackupJob } from "./management-backup-job.mjs";

const requireValue = (value) => { if (!value) throw new Error("Invalid backup configuration."); };
export function backupConfiguration(env) {
  requireValue(env.EV_BACKUP_ENABLED === "true");
  const sourceId = env.EV_BACKUP_SOURCE_ID;
  requireValue(typeof sourceId === "string" && /^[a-z]{20}$/.test(sourceId));
  const database = new URL(env.EV_BACKUP_DATABASE_URL);
  const user = decodeURIComponent(database.username);
  requireValue(database.protocol === "postgresql:" && database.pathname === "/postgres" && !database.search && !database.hash && database.password.length >= 16);
  const direct = database.hostname === `db.${sourceId}.supabase.co` && user === "ev_backup_reader";
  const pooler = /^aws-[0-9]+-[a-z]+-[a-z]+-[0-9]+\.pooler\.supabase\.com$/.test(database.hostname) && user === `ev_backup_reader.${sourceId}`;
  requireValue((direct || pooler) && database.port === "5432");
  const accountId = env.EV_BACKUP_R2_ACCOUNT_ID;
  requireValue(typeof accountId === "string" && /^[a-f0-9]{32}$/.test(accountId));
  requireValue(env.EV_BACKUP_R2_BUCKET === "ev-private-backups");
  requireValue(typeof env.EV_BACKUP_R2_ACCESS_KEY_ID === "string" && /^[A-Za-z0-9]{20,128}$/.test(env.EV_BACKUP_R2_ACCESS_KEY_ID));
  requireValue(typeof env.EV_BACKUP_R2_SECRET_ACCESS_KEY === "string" && /^[A-Za-z0-9/+_=-]{32,256}$/.test(env.EV_BACKUP_R2_SECRET_ACCESS_KEY));
  requireValue(typeof env.EV_BACKUP_KEY_BASE64 === "string" && /^[A-Za-z0-9+/]{43}=$/.test(env.EV_BACKUP_KEY_BASE64));
  const key = Buffer.from(env.EV_BACKUP_KEY_BASE64, "base64");
  requireValue(key.length === 32 && key.toString("base64") === env.EV_BACKUP_KEY_BASE64);
  const ca = env.EV_BACKUP_DATABASE_CA_PEM || undefined;
  requireValue(ca === undefined || (typeof ca === "string" && ca.startsWith("-----BEGIN CERTIFICATE-----") && ca.length < 20000));
  return {
    sourceId, key,
    database: { connectionString: database.href, ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10000, query_timeout: 20000, options: "-c default_transaction_read_only=on -c statement_timeout=15000 -c idle_in_transaction_session_timeout=20000", application_name: "ev-encrypted-backup" },
    bucket: env.EV_BACKUP_R2_BUCKET,
    storage: { endpoint: `https://${accountId}.eu.r2.cloudflarestorage.com`, region: "auto", forcePathStyle: true, maxAttempts: 1, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED", credentials: { accessKeyId: env.EV_BACKUP_R2_ACCESS_KEY_ID, secretAccessKey: env.EV_BACKUP_R2_SECRET_ACCESS_KEY } },
  };
}

export function r2BackupStore(client, bucket, jobSignal) {
  const send = (command) => client.send(command, { abortSignal: AbortSignal.any([jobSignal, AbortSignal.timeout(10000)]) });
  return {
    async list(prefix, token) {
      const result = await send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 200, ...(token ? { ContinuationToken: token } : {}) }));
      if (result.IsTruncated) requireValue(typeof result.NextContinuationToken === "string" && result.NextContinuationToken.length > 0);
      return { objects: (result.Contents ?? []).map((object) => ({ key: object.Key })), nextToken: result.IsTruncated ? result.NextContinuationToken : undefined };
    },
    async put(key, envelope) {
      await send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: envelope, IfNoneMatch: "*", ContentType: "application/octet-stream", CacheControl: "no-store", StorageClass: "STANDARD", ContentLength: Buffer.byteLength(envelope), ContentMD5: createHash("md5").update(envelope).digest("base64") }));
    },
    async get(key) {
      let result;
      try { result = await send(new GetObjectCommand({ Bucket: bucket, Key: key })); }
      catch (error) { if (error?.name === "NoSuchKey" && error?.$metadata?.httpStatusCode === 404) return null; throw error; }
      const body = result.Body;
      const streamSignal = AbortSignal.any([jobSignal, AbortSignal.timeout(10000)]);
      const abortBody = () => body?.destroy(new Error("Backup download deadline exceeded."));
      streamSignal.addEventListener("abort", abortBody, { once: true });
      try {
        requireValue(!streamSignal.aborted);
        requireValue(body && Number.isSafeInteger(result.ContentLength) && result.ContentLength > 0 && result.ContentLength <= 14 * 1024 * 1024);
        let size = 0;
        const parts = [];
        for await (const chunk of body) {
          size += chunk.length;
          requireValue(size <= result.ContentLength && !jobSignal.aborted);
          parts.push(chunk);
        }
        requireValue(size === result.ContentLength);
        return Buffer.concat(parts).toString("utf8");
      } finally { streamSignal.removeEventListener("abort", abortBody); body?.destroy(); }
    },
    async remove(keys) {
      requireValue(keys.length > 0 && keys.length <= 100);
      const result = await send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
      requireValue(!result.Errors?.length);
    },
  };
}

export async function main() {
  let config, client, database;
  try {
    config = backupConfiguration(process.env);
    const contract = await loadBackupContract();
    client = new S3Client(config.storage);
    const signal = AbortSignal.timeout(180000);
    // Source connection happens only after retention cleanup, so an unavailable
    // database cannot prevent this run from removing old remote objects.
    const capture = async () => {
      database = new pg.Client(config.database);
      database.on("error", () => {}); // Query rejects; never print raw DB messages.
      await database.connect();
      try { return await exportManagedBackup(database, config.sourceId, contract); }
      finally { await database.end(); database = undefined; }
    };
    const report = await runBackupJob({ store: r2BackupStore(client, config.bucket, signal), capture, key: config.key, sourceId: config.sourceId });
    console.log(JSON.stringify(report)); // Content-free counts and capture time only.
    return 0;
  } catch {
    console.error("Encrypted E.V backup failed. Inspect access, source schema, storage retention and job configuration privately; no backup is certified by this run.");
    return 1;
  } finally {
    config?.key.fill(0);
    client?.destroy();
    await database?.end().catch(() => {});
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
