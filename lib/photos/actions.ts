"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, albumPhotos, rawFiles } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

function revalidateCommon() {
  revalidatePath("/inbox");
  revalidatePath("/library");
  revalidatePath("/albums");
  revalidatePath("/trash");
}

export interface AssignToAlbumResult {
  added: number;
  /** Skipped because the photo already belongs to a different album — a photo can only ever be in one. */
  blocked: number;
}

export async function assignPhotosToAlbum(
  photoIds: string[],
  albumId: string
): Promise<AssignToAlbumResult> {
  const session = await requireOwner();
  if (photoIds.length === 0) return { added: 0, blocked: 0 };

  const existing = await db
    .select({ photoId: albumPhotos.photoId, albumId: albumPhotos.albumId })
    .from(albumPhotos)
    .where(inArray(albumPhotos.photoId, photoIds));
  const existingByPhoto = new Map(existing.map((row) => [row.photoId, row.albumId]));

  const eligibleIds = photoIds.filter((id) => {
    const currentAlbum = existingByPhoto.get(id);
    return !currentAlbum || currentAlbum === albumId;
  });
  const blocked = photoIds.length - eligibleIds.length;
  const toInsert = eligibleIds.filter((id) => existingByPhoto.get(id) !== albumId);

  if (eligibleIds.length > 0) {
    await db
      .update(photos)
      .set({ status: "kept" })
      .where(
        and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, eligibleIds))
      );
  }

  if (toInsert.length > 0) {
    await db.insert(albumPhotos).values(
      toInsert.map((photoId) => ({ albumId, photoId }))
    );
  }

  revalidateCommon();
  return { added: toInsert.length, blocked };
}

export async function removePhotosFromAlbum(photoIds: string[], albumId: string) {
  await requireOwner();
  if (photoIds.length === 0) return;
  await db
    .delete(albumPhotos)
    .where(
      and(eq(albumPhotos.albumId, albumId), inArray(albumPhotos.photoId, photoIds))
    );
  revalidateCommon();
}

export async function keepPhotos(photoIds: string[]) {
  const session = await requireOwner();
  if (photoIds.length === 0) return;
  await db
    .update(photos)
    .set({ status: "kept" })
    .where(
      and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, photoIds))
    );
  revalidateCommon();
}

/** Used to undo a "keep" during inbox triage — sends a photo back to the inbox. */
export async function returnPhotosToInbox(photoIds: string[]) {
  const session = await requireOwner();
  if (photoIds.length === 0) return;
  await db
    .update(photos)
    .set({ status: "inbox" })
    .where(
      and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, photoIds))
    );
  revalidateCommon();
}

export async function trashPhotos(photoIds: string[]) {
  const session = await requireOwner();
  if (photoIds.length === 0) return;
  await db
    .update(photos)
    .set({ status: "trashed", trashedAt: new Date() })
    .where(
      and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, photoIds))
    );
  revalidateCommon();
}

export async function restorePhotos(photoIds: string[]) {
  const session = await requireOwner();
  if (photoIds.length === 0) return;
  await db
    .update(photos)
    .set({ status: "kept", trashedAt: null })
    .where(
      and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, photoIds))
    );
  revalidateCommon();
}

export async function hardDeletePhotos(photoIds: string[]) {
  const session = await requireOwner();
  if (photoIds.length === 0) return;

  const rows = await db
    .select()
    .from(photos)
    .where(
      and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, photoIds))
    );

  const pairedRaws = await db.query.rawFiles.findMany({
    where: inArray(rawFiles.photoId, photoIds),
  });

  await Promise.all(
    rows.flatMap((photo) => {
      const keys = [photo.originalKey, photo.thumbKey, photo.mediumKey, photo.previewKey].filter(
        (k): k is string => Boolean(k)
      );
      return keys.map((key) => storage.deleteObject(key).catch(() => {}));
    })
  );

  await Promise.all(
    pairedRaws.map((rf) => storage.deleteObject(rf.storageKey).catch(() => {}))
  );
  if (pairedRaws.length > 0) {
    await db.delete(rawFiles).where(
      inArray(rawFiles.id, pairedRaws.map((rf) => rf.id))
    );
  }

  await db.delete(photos).where(
    and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, photoIds))
  );

  revalidateCommon();
  revalidatePath("/raw-files");
}
