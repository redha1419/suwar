import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider } from "./provider";

function client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function bucket() {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_BUCKET_NAME is not configured");
  return name;
}

export const r2Provider: StorageProvider = {
  async getPresignedUploadUrl(key, contentType, expiresInSec = 3600) {
    const cmd = new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(client(), cmd, { expiresIn: expiresInSec });
  },

  async getPresignedDownloadUrl(key, expiresInSec = 3600, responseContentDisposition) {
    const cmd = new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: responseContentDisposition,
    });
    return getSignedUrl(client(), cmd, { expiresIn: expiresInSec });
  },

  async copyObject(sourceKey, destKey) {
    await client().send(
      new CopyObjectCommand({
        Bucket: bucket(),
        Key: destKey,
        CopySource: `${bucket()}/${encodeURIComponent(sourceKey)}`,
      })
    );
    await client().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: sourceKey })
    );
  },

  async deleteObject(key) {
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  },

  async getObjectBuffer(key) {
    const res = await client().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Object not found: ${key}`);
    return Buffer.from(bytes);
  },

  async putObject(key, body, contentType) {
    await client().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  },
};
