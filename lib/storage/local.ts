import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { StorageProvider } from "./provider";

const ROOT = path.join(process.cwd(), ".data", "storage");

function resolvePath(key: string): string {
  const resolved = path.resolve(ROOT, key);
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

/**
 * Dev-only stand-in for R2: same StorageProvider interface, backed by the local
 * filesystem, served through /api/storage/local (which already sits behind the
 * owner session check for uploads and is used by the media route for reads).
 */
export const localProvider: StorageProvider = {
  async getPresignedUploadUrl(key) {
    return `/api/storage/local?key=${encodeURIComponent(key)}`;
  },

  async getPresignedDownloadUrl(key) {
    return `/api/storage/local?key=${encodeURIComponent(key)}`;
  },

  async copyObject(sourceKey, destKey) {
    const src = resolvePath(sourceKey);
    const dest = resolvePath(destKey);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    await fs.unlink(src);
  },

  async deleteObject(key) {
    try {
      await fs.unlink(resolvePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  },

  async getObjectBuffer(key) {
    return fs.readFile(resolvePath(key));
  },

  async putObject(key, body) {
    const dest = resolvePath(key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
  },
};
