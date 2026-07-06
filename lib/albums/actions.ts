"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { albums } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { uniqueAlbumSlug } from "@/lib/albums/slug";

export async function createAlbum(title: string) {
  const session = await requireOwner();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Album title is required");

  const slug = await uniqueAlbumSlug(trimmed);
  const [album] = await db
    .insert(albums)
    .values({ ownerId: session.ownerId!, title: trimmed, slug })
    .returning();

  revalidatePath("/albums");
  return album;
}

export async function renameAlbum(albumId: string, title: string) {
  await requireOwner();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Album title is required");

  const [updated] = await db
    .update(albums)
    .set({ title: trimmed })
    .where(eq(albums.id, albumId))
    .returning({ slug: albums.slug });

  revalidatePath("/albums");
  if (updated) revalidatePath(`/albums/${updated.slug}`);
}

export async function deleteAlbum(albumId: string) {
  await requireOwner();
  await db.delete(albums).where(eq(albums.id, albumId));
  revalidatePath("/albums");
}
