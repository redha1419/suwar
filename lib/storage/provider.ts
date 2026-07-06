export interface StorageProvider {
  /** URL the client can PUT the raw file bytes to directly. */
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSec?: number
  ): Promise<string>;
  /** Short-lived URL the browser can GET the object from. Never expose storage keys directly to viewers. */
  getPresignedDownloadUrl(key: string, expiresInSec?: number): Promise<string>;
  copyObject(sourceKey: string, destKey: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getObjectBuffer(key: string): Promise<Buffer>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
}
