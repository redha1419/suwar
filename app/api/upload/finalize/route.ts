import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getOwnerIdForApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { photos, rawFiles } from "@/lib/db/schema";
import { storage } from "@/lib/storage";
import { extractExif } from "@/lib/media/exif";
import { generateDerivatives } from "@/lib/media/derivatives";
import { generateBlurhash } from "@/lib/media/blurhash";
import {
  pairBatch,
  findExistingPhotoForRaw,
  type StagedFile,
} from "@/lib/pairing/match-raw";
import { baseFilename, extensionOf } from "@/lib/media/file-classify";

// Photos are processed sequentially and large batches can take a while —
// use the highest duration the Hobby plan allows rather than the 10s default.
export const maxDuration = 60;

const bodySchema = z
  .array(
    z.object({
      key: z.string().min(1),
      filename: z.string().min(1),
      contentType: z.string().optional().default("application/octet-stream"),
    })
  )
  .min(1)
  .max(500);

interface FinalizeResultItem {
  filename: string;
  status: "photo" | "raw-paired" | "raw-unpaired" | "error" | "skipped";
  photoId?: string;
  rawFileId?: string;
  error?: string;
}

async function processImage(
  ownerId: string,
  file: StagedFile,
  pairedRaw: StagedFile | null
): Promise<FinalizeResultItem> {
  const photoId = randomUUID();
  const ext = extensionOf(file.filename);
  const permKey = `photos/${photoId}/original.${ext}`;

  try {
    const buffer = await storage.getObjectBuffer(file.key);
    await storage.copyObject(file.key, permKey);

    let processingError: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let thumbKey: string | null = null;
    let mediumKey: string | null = null;
    let previewKey: string | null = null;
    let blurhash: string | null = null;
    let exif: Awaited<ReturnType<typeof extractExif>> | null = null;

    try {
      exif = await extractExif(buffer);
    } catch (err) {
      processingError = `EXIF extraction failed: ${(err as Error).message}`;
    }

    try {
      const derivatives = await generateDerivatives(buffer, file.filename);
      width = derivatives.width;
      height = derivatives.height;

      thumbKey = `photos/${photoId}/thumb.webp`;
      mediumKey = `photos/${photoId}/medium.webp`;
      await storage.putObject(thumbKey, derivatives.thumb, "image/webp");
      await storage.putObject(mediumKey, derivatives.medium, "image/webp");

      if (derivatives.preview) {
        previewKey = `photos/${photoId}/preview.jpg`;
        await storage.putObject(previewKey, derivatives.preview, "image/jpeg");
      }

      blurhash = await generateBlurhash(derivatives.thumb);
    } catch (err) {
      processingError =
        (processingError ? processingError + "; " : "") +
        `Derivative generation failed: ${(err as Error).message}`;
    }

    await db.insert(photos).values({
      id: photoId,
      ownerId,
      originalKey: permKey,
      originalFormat: ext,
      originalBytes: buffer.byteLength,
      previewKey,
      mediumKey,
      thumbKey,
      blurhash,
      width,
      height,
      originalFilename: file.filename,
      baseFilename: baseFilename(file.filename),
      takenAt: exif?.takenAt ?? null,
      cameraMake: exif?.cameraMake ?? null,
      cameraModel: exif?.cameraModel ?? null,
      lens: exif?.lens ?? null,
      aperture: exif?.aperture ?? null,
      shutterSpeed: exif?.shutterSpeed ?? null,
      iso: exif?.iso ?? null,
      focalLength: exif?.focalLength ?? null,
      gpsLat: exif?.gpsLat ?? null,
      gpsLon: exif?.gpsLon ?? null,
      colorProfile: exif?.colorProfile ?? null,
      rawExif: exif?.raw ?? null,
      processingError,
      status: "inbox",
    });

    let rawFileId: string | undefined;
    if (pairedRaw) {
      rawFileId = await processPairedRaw(ownerId, photoId, pairedRaw);
    }

    return { filename: file.filename, status: "photo", photoId, rawFileId };
  } catch (err) {
    return {
      filename: file.filename,
      status: "error",
      error: (err as Error).message,
    };
  }
}

async function processPairedRaw(
  ownerId: string,
  photoId: string,
  file: StagedFile
): Promise<string> {
  const rawFileId = randomUUID();
  const ext = extensionOf(file.filename);
  const permKey = `raws/${photoId}/${file.filename}`;
  const buffer = await storage.getObjectBuffer(file.key);
  await storage.copyObject(file.key, permKey);

  await db.insert(rawFiles).values({
    id: rawFileId,
    ownerId,
    photoId,
    storageKey: permKey,
    originalFilename: file.filename,
    baseFilename: baseFilename(file.filename),
    extension: ext,
    bytes: buffer.byteLength,
  });

  return rawFileId;
}

async function processStandaloneRaw(
  ownerId: string,
  file: StagedFile
): Promise<FinalizeResultItem> {
  try {
    const existingPhotoId = await findExistingPhotoForRaw(
      ownerId,
      file.filename
    );
    const rawFileId = randomUUID();
    const ext = extensionOf(file.filename);
    const permKey = existingPhotoId
      ? `raws/${existingPhotoId}/${file.filename}`
      : `raws/unmatched/${rawFileId}/${file.filename}`;

    const buffer = await storage.getObjectBuffer(file.key);
    await storage.copyObject(file.key, permKey);

    await db.insert(rawFiles).values({
      id: rawFileId,
      ownerId,
      photoId: existingPhotoId,
      storageKey: permKey,
      originalFilename: file.filename,
      baseFilename: baseFilename(file.filename),
      extension: ext,
      bytes: buffer.byteLength,
    });

    return {
      filename: file.filename,
      status: existingPhotoId ? "raw-paired" : "raw-unpaired",
      rawFileId,
      photoId: existingPhotoId ?? undefined,
    };
  } catch (err) {
    return {
      filename: file.filename,
      status: "error",
      error: (err as Error).message,
    };
  }
}

export async function POST(req: NextRequest) {
  const ownerId = await getOwnerIdForApi();
  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { images, standaloneRaws, unrecognized } = pairBatch(parsed.data);

  const results: FinalizeResultItem[] = [];

  for (const { file, pairedRaw } of images) {
    results.push(await processImage(ownerId, file, pairedRaw));
  }

  for (const file of standaloneRaws) {
    results.push(await processStandaloneRaw(ownerId, file));
  }

  for (const file of unrecognized) {
    await storage.deleteObject(file.key).catch(() => {});
    results.push({
      filename: file.filename,
      status: "skipped",
      error: "Unsupported file type",
    });
  }

  return NextResponse.json({ results });
}
