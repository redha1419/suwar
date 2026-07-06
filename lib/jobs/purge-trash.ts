import "server-only";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, rawFiles } from "@/lib/db/schema";
import { storage } from "@/lib/storage";

const TRASH_RETENTION_DAYS = 30;

/** Hard-deletes anything soft-deleted more than TRASH_RETENTION_DAYS ago. Run on a schedule once hosting is set up. */
export async function purgeExpiredTrash(): Promise<{ purged: number }> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expired = await db
    .select()
    .from(photos)
    .where(and(eq(photos.status, "trashed"), lt(photos.trashedAt, cutoff)));

  if (expired.length === 0) return { purged: 0 };

  const photoIds = expired.map((p) => p.id);
  const pairedRaws = await db.query.rawFiles.findMany({
    where: inArray(rawFiles.photoId, photoIds),
  });

  for (const photo of expired) {
    const keys = [photo.originalKey, photo.thumbKey, photo.mediumKey, photo.previewKey].filter(
      (k): k is string => Boolean(k)
    );
    await Promise.all(keys.map((key) => storage.deleteObject(key).catch(() => {})));
  }
  await Promise.all(
    pairedRaws.map((rf) => storage.deleteObject(rf.storageKey).catch(() => {}))
  );

  if (pairedRaws.length > 0) {
    await db.delete(rawFiles).where(inArray(rawFiles.id, pairedRaws.map((rf) => rf.id)));
  }
  await db.delete(photos).where(inArray(photos.id, photoIds));

  return { purged: expired.length };
}
