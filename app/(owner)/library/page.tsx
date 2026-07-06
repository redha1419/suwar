import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, albums } from "@/lib/db/schema";
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

  return (
    <div className="flex flex-col gap-6">
      <SelectablePhotoGrid
        photos={keptPhotos.map(toPhotoCardData)}
        albums={albumRows.map((a) => ({ id: a.id, title: a.title }))}
        actions={[
          { label: "Trash", variant: "danger", onClick: trashPhotos },
        ]}
      />
    </div>
  );
}
