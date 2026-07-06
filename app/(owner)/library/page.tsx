import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, albums, albumPhotos } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { SelectablePhotoGrid } from "@/components/photo-grid/selectable-photo-grid";
import { trashPhotos } from "@/lib/photos/actions";
import { toPhotoCardData } from "@/lib/photos/to-card-data";

export default async function LibraryPage() {
  const session = await requireOwner();

  const [keptPhotos, albumRows] = await Promise.all([
    db.query.photos.findMany({
      where: and(eq(photos.ownerId, session.ownerId!), eq(photos.status, "kept")),
      orderBy: desc(photos.takenAt),
    }),
    db.query.albums.findMany({ where: eq(albums.ownerId, session.ownerId!) }),
  ]);

  const membership = keptPhotos.length
    ? await db
        .select({ photoId: albumPhotos.photoId, albumTitle: albums.title })
        .from(albumPhotos)
        .innerJoin(albums, eq(albums.id, albumPhotos.albumId))
        .where(
          inArray(
            albumPhotos.photoId,
            keptPhotos.map((p) => p.id)
          )
        )
    : [];
  const albumTitleByPhoto = new Map(
    membership.map((m) => [m.photoId, m.albumTitle])
  );

  return (
    <div className="flex flex-col gap-6">
      <SelectablePhotoGrid
        photos={keptPhotos.map((p) =>
          toPhotoCardData(p, albumTitleByPhoto.get(p.id) ?? null)
        )}
        albums={albumRows.map((a) => ({ id: a.id, title: a.title }))}
        actions={[
          { label: "Trash", variant: "danger", onClick: trashPhotos },
        ]}
      />
    </div>
  );
}
