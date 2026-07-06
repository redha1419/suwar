"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rawFiles } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export async function deleteRawFileForever(rawFileId: string) {
  const session = await requireOwner();

  const rawFile = await db.query.rawFiles.findFirst({
    where: and(eq(rawFiles.id, rawFileId), eq(rawFiles.ownerId, session.ownerId!)),
  });
  if (!rawFile) return;

  await storage.deleteObject(rawFile.storageKey).catch(() => {});
  await db.delete(rawFiles).where(eq(rawFiles.id, rawFileId));

  revalidatePath("/raw-files");
}
