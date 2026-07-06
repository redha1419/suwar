import { notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { albums, albumPhotos, photos } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { AlbumHeaderActions } from "@/components/albums/album-header-actions";
import { AlbumPhotoGrid } from "@/components/albums/album-photo-grid";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireOwner();
  const { slug } = await params;

  const album = await db.query.albums.findFirst({
    where: and(eq(albums.slug, slug), eq(albums.ownerId, session.ownerId!)),
  });
  if (!album) notFound();

  const rows = await db
    .select({ photo: photos })
    .from(albumPhotos)
    .innerJoin(photos, eq(photos.id, albumPhotos.photoId))
    .where(eq(albumPhotos.albumId, album.id))
    .orderBy(asc(albumPhotos.position), asc(albumPhotos.addedAt));

  const allAlbums = await db.query.albums.findMany({
    where: eq(albums.ownerId, session.ownerId!),
  });

  return (
    <div className="flex flex-col gap-6">
      <AlbumHeaderActions albumId={album.id} title={album.title} />
      <AlbumPhotoGrid
        albumId={album.id}
        albums={allAlbums.map((a) => ({ id: a.id, title: a.title }))}
        photos={rows.map(({ photo: p }) => ({
          id: p.id,
          originalFilename: p.originalFilename,
          width: p.width,
          height: p.height,
          hasThumb: Boolean(p.thumbKey),
          processingError: p.processingError,
        }))}
      />
    </div>
  );
}
