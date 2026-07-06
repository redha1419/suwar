import "server-only";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { shareLinks, photos, albums, albumPhotos } from "@/lib/db/schema";

export type ShareLinkRow = typeof shareLinks.$inferSelect;

/** A photo is only ever reachable through sharing once it's out of inbox/trash — this is the one predicate every public query must apply. */
const VIEWABLE = eq(photos.status, "kept");

export async function getActiveShareLink(
  token: string
): Promise<ShareLinkRow | null> {
  const link = await db.query.shareLinks.findFirst({
    where: eq(shareLinks.token, token),
  });
  if (!link) return null;
  if (link.revokedAt) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;
  return link;
}

export function bumpShareAccess(linkId: string) {
  // Fire-and-forget — a viewer's page load shouldn't wait on this write.
  db.update(shareLinks)
    .set({
      lastAccessedAt: new Date(),
      viewCount: sql`${shareLinks.viewCount} + 1`,
    })
    .where(eq(shareLinks.id, linkId))
    .catch(() => {});
}

export type ShareTarget =
  | { scope: "photo"; photo: typeof photos.$inferSelect }
  | {
      scope: "album";
      album: typeof albums.$inferSelect;
      photos: (typeof photos.$inferSelect)[];
    }
  | {
      scope: "all";
      albums: {
        album: typeof albums.$inferSelect;
        cover: typeof photos.$inferSelect | null;
        count: number;
      }[];
    };

export async function resolveShareTarget(
  link: ShareLinkRow
): Promise<ShareTarget | null> {
  if (link.scope === "photo") {
    const photo = await db.query.photos.findFirst({
      where: and(eq(photos.id, link.targetId!), VIEWABLE, eq(photos.ownerId, link.ownerId)),
    });
    return photo ? { scope: "photo", photo } : null;
  }

  if (link.scope === "album") {
    const album = await db.query.albums.findFirst({
      where: and(eq(albums.id, link.targetId!), eq(albums.ownerId, link.ownerId)),
    });
    if (!album) return null;

    const rows = await db
      .select({ photo: photos })
      .from(albumPhotos)
      .innerJoin(photos, and(eq(photos.id, albumPhotos.photoId), VIEWABLE))
      .where(eq(albumPhotos.albumId, album.id))
      .orderBy(asc(albumPhotos.position), asc(albumPhotos.addedAt));

    return { scope: "album", album, photos: rows.map((r) => r.photo) };
  }

  // scope === "all"
  const albumRows = await db.query.albums.findMany({
    where: eq(albums.ownerId, link.ownerId),
    orderBy: desc(albums.createdAt),
  });

  const withDetails = await Promise.all(
    albumRows.map(async (album) => {
      const coverRows = await db
        .select({ photo: photos })
        .from(albumPhotos)
        .innerJoin(photos, and(eq(photos.id, albumPhotos.photoId), VIEWABLE))
        .where(eq(albumPhotos.albumId, album.id))
        .orderBy(desc(albumPhotos.addedAt))
        .limit(1);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(albumPhotos)
        .innerJoin(photos, and(eq(photos.id, albumPhotos.photoId), VIEWABLE))
        .where(eq(albumPhotos.albumId, album.id));

      return { album, cover: coverRows[0]?.photo ?? null, count };
    })
  );

  return { scope: "all", albums: withDetails };
}

/** For a share of scope "all", drilling into one specific album re-validates the token still grants access to it. */
export async function resolveAlbumForAllScope(
  link: ShareLinkRow,
  albumId: string
) {
  if (link.scope !== "all") return null;
  const album = await db.query.albums.findFirst({
    where: and(eq(albums.id, albumId), eq(albums.ownerId, link.ownerId)),
  });
  if (!album) return null;

  const rows = await db
    .select({ photo: photos })
    .from(albumPhotos)
    .innerJoin(photos, and(eq(photos.id, albumPhotos.photoId), VIEWABLE))
    .where(eq(albumPhotos.albumId, album.id))
    .orderBy(asc(albumPhotos.position), asc(albumPhotos.addedAt));

  return { album, photos: rows.map((r) => r.photo) };
}

/** Used by the media route to authorize an unauthenticated image request carrying a share token. */
export async function canTokenAccessPhoto(
  token: string,
  photoId: string
): Promise<boolean> {
  const link = await getActiveShareLink(token);
  if (!link) return false;

  const photo = await db.query.photos.findFirst({
    where: and(eq(photos.id, photoId), VIEWABLE, eq(photos.ownerId, link.ownerId)),
  });
  if (!photo) return false;

  if (link.scope === "all") return true;
  if (link.scope === "photo") return link.targetId === photoId;

  // scope === "album"
  const membership = await db.query.albumPhotos.findFirst({
    where: and(
      eq(albumPhotos.albumId, link.targetId!),
      eq(albumPhotos.photoId, photoId)
    ),
  });
  return Boolean(membership);
}
