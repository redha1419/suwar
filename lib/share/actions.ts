"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shareLinks } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { generateShareToken } from "@/lib/share/tokens";

export async function createShareLink(
  scope: "photo" | "album" | "all",
  targetId: string | null,
  label?: string
) {
  const session = await requireOwner();

  const [link] = await db
    .insert(shareLinks)
    .values({
      ownerId: session.ownerId!,
      token: generateShareToken(),
      scope,
      targetId,
      label: label?.trim() || null,
    })
    .returning();

  revalidatePath("/shares");
  return link;
}

export async function revokeShareLink(linkId: string) {
  await requireOwner();
  await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(eq(shareLinks.id, linkId));
  revalidatePath("/shares");
}
