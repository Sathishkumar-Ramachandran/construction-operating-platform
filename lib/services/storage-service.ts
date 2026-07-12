import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError, ErrorCode } from "@/lib/errors";

const STORAGE_ENV = {
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION,
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
};

export function isStorageConfigured(): boolean {
  return Boolean(
    STORAGE_ENV.bucket &&
      STORAGE_ENV.region &&
      STORAGE_ENV.accessKeyId &&
      STORAGE_ENV.secretAccessKey
  );
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (!isStorageConfigured()) {
    throw new AppError(ErrorCode.STORAGE_NOT_CONFIGURED);
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: STORAGE_ENV.region,
      credentials: {
        accessKeyId: STORAGE_ENV.accessKeyId!,
        secretAccessKey: STORAGE_ENV.secretAccessKey!,
      },
    });
  }
  return cachedClient;
}

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export function buildDocumentStorageKey(employeeId: string, originalFileName: string) {
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `employee-documents/${employeeId}/${randomUUID()}-${safeName}`;
}

/** Presigned PUT URL the browser uploads directly to — the server never
 * proxies file bytes through a request that could time out. */
export async function getUploadUrl(storageKey: string, mimeType: string): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: STORAGE_ENV.bucket,
    Key: storageKey,
    ContentType: mimeType,
  });
  return getSignedUrl(client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
}

export async function getDownloadUrl(storageKey: string): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: STORAGE_ENV.bucket, Key: storageKey });
  return getSignedUrl(client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
}

export async function deleteObject(storageKey: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: STORAGE_ENV.bucket, Key: storageKey })
  );
}
