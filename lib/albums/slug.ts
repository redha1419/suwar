import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { albums } from "@/lib/db/schema";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "album";
}

export async function uniqueAlbumSlug(title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;
  // Small owner-only catalog — a loop here is simpler and clearer than a single
  // clever query, and it only ever runs a handful of times in practice.
  while (
    await db.query.albums.findFirst({ where: eq(albums.slug, candidate) })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
