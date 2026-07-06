import Link from "next/link";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, albums } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { SelectablePhotoGrid } from "@/components/photo-grid/selectable-photo-grid";
import { trashPhotos } from "@/lib/photos/actions";
import { toPhotoCardData } from "@/lib/photos/to-card-data";

export default async function InboxPage() {
  const session = await requireOwner();

  const [inboxPhotos, albumRows] = await Promise.all([
    db.query.photos.findMany({
      where: and(eq(photos.ownerId, session.ownerId!), eq(photos.status, "inbox")),
      orderBy: desc(photos.uploadedAt),
    }),
    db.query.albums.findMany({ where: eq(albums.ownerId, session.ownerId!) }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <UploadDropzone />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-2">
          Select photos, then add them to an album (which keeps them) or trash the rest.
        </p>
        {inboxPhotos.length > 0 && (
          <Link
            href="/inbox/review"
            className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
          >
            Review one-by-one →
          </Link>
        )}
      </div>
      <SelectablePhotoGrid
        photos={inboxPhotos.map(toPhotoCardData)}
        albums={albumRows.map((a) => ({ id: a.id, title: a.title }))}
        actions={[
          { label: "Trash", variant: "danger", onClick: trashPhotos },
        ]}
      />
    </div>
  );
}
