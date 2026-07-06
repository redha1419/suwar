import "server-only";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, rawFiles } from "@/lib/db/schema";
import { baseFilename, isImageFile, isRawFile } from "@/lib/media/file-classify";

export interface StagedFile {
  key: string;
  filename: string;
  contentType: string;
}

export interface PairedImage {
  file: StagedFile;
  pairedRaw: StagedFile | null;
}

export interface BatchPairingResult {
  images: PairedImage[];
  /** RAW files with no JPEG/HEIC pair in this batch — still need a cross-batch DB check. */
  standaloneRaws: StagedFile[];
  /** Anything that's neither a recognized image nor RAW extension. */
  unrecognized: StagedFile[];
}

export function pairBatch(files: StagedFile[]): BatchPairingResult {
  const rawsByBase = new Map<string, StagedFile>();
  const images: StagedFile[] = [];
  const unrecognized: StagedFile[] = [];

  for (const file of files) {
    if (isRawFile(file.filename)) {
      rawsByBase.set(baseFilename(file.filename), file);
    } else if (isImageFile(file.filename)) {
      images.push(file);
    } else {
      unrecognized.push(file);
    }
  }

  const pairedImages: PairedImage[] = images.map((file) => {
    const base = baseFilename(file.filename);
    const pairedRaw = rawsByBase.get(base) ?? null;
    if (pairedRaw) rawsByBase.delete(base);
    return { file, pairedRaw };
  });

  return {
    images: pairedImages,
    standaloneRaws: [...rawsByBase.values()],
    unrecognized,
  };
}

/**
 * A RAW with no in-batch JPEG match might still pair with a photo uploaded in
 * an earlier batch. Only matches photos that don't already have a RAW attached
 * (raw_files.photo_id is unique-per-photo at the DB level).
 */
export async function findExistingPhotoForRaw(
  ownerId: string,
  rawFilename: string
) {
  const base = baseFilename(rawFilename);

  const candidates = await db
    .select({ id: photos.id })
    .from(photos)
    .leftJoin(rawFiles, eq(rawFiles.photoId, photos.id))
    .where(
      and(
        eq(photos.ownerId, ownerId),
        eq(photos.baseFilename, base),
        isNull(rawFiles.id)
      )
    )
    .orderBy(desc(photos.uploadedAt))
    .limit(1);

  return candidates[0]?.id ?? null;
}
