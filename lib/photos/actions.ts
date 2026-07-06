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

export async function assignPhotosToAlbum(photoIds: string[], albumId: string) {
  const session = await requireOwner();
  if (photoIds.length === 0) return;

  await db
    .update(photos)
    .set({ status: "kept" })
    .where(
      and(eq(photos.ownerId, session.ownerId!), inArray(photos.id, photoIds))
    );

  await db
    .insert(albumPhotos)
    .values(photoIds.map((photoId) => ({ albumId, photoId })))
    .onConflictDoNothing();

  revalidateCommon();
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
