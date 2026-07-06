import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { SelectablePhotoGrid } from "@/components/photo-grid/selectable-photo-grid";
import { restorePhotos, hardDeletePhotos } from "@/lib/photos/actions";
import { toPhotoCardData } from "@/lib/photos/to-card-data";

export default async function TrashPage() {
  const session = await requireOwner();

  const trashedPhotos = await db.query.photos.findMany({
    where: and(eq(photos.ownerId, session.ownerId!), eq(photos.status, "trashed")),
    orderBy: desc(photos.trashedAt),
  });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-2">
        Trashed photos are permanently deleted after 30 days.
      </p>
      <SelectablePhotoGrid
        photos={trashedPhotos.map(toPhotoCardData)}
        actions={[
          { label: "Restore", onClick: restorePhotos },
          { label: "Delete Forever", variant: "danger", onClick: hardDeletePhotos },
        ]}
      />
    </div>
  );
}
