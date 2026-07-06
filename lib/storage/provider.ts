export interface StorageProvider {
  /** URL the client can PUT the raw file bytes to directly. */
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSec?: number
  ): Promise<string>;
  /**
   * Short-lived URL the browser can GET the object from. Never expose storage
   * keys directly to viewers. Pass `responseContentDisposition` (e.g.
   * `attachment; filename="foo.jpg"`) to force a browser download with a
   * specific filename even though the URL points at a generic storage key.
   */
  getPresignedDownloadUrl(
    key: string,
    expiresInSec?: number,
    responseContentDisposition?: string
  ): Promise<string>;
  copyObject(sourceKey: string, destKey: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getObjectBuffer(key: string): Promise<Buffer>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
}
