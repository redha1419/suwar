import Link from "next/link";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { albums, albumPhotos, photos } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { CreateAlbumForm } from "@/components/albums/create-album-form";

export default async function AlbumsPage() {
  const session = await requireOwner();

  const albumRows = await db.query.albums.findMany({
    where: eq(albums.ownerId, session.ownerId!),
    orderBy: desc(albums.createdAt),
  });

  const withDetails = await Promise.all(
    albumRows.map(async (album) => {
      const cover = album.coverPhotoId
        ? await db.query.photos.findFirst({
            where: eq(photos.id, album.coverPhotoId),
          })
        : (
            await db
              .select({ photo: photos })
              .from(albumPhotos)
              .innerJoin(photos, eq(photos.id, albumPhotos.photoId))
              .where(eq(albumPhotos.albumId, album.id))
              .orderBy(desc(albumPhotos.addedAt))
              .limit(1)
          )[0]?.photo ?? null;

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(albumPhotos)
        .where(eq(albumPhotos.albumId, album.id));

      return { ...album, cover, count };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <CreateAlbumForm />
      {withDetails.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-2">
          No albums yet — create one, or add photos to one from the Inbox.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {withDetails.map((album) => (
            <Link
              key={album.id}
              href={`/albums/${album.slug}`}
              className="group flex flex-col gap-2"
            >
              <div className="aspect-square overflow-hidden bg-surface">
                {album.cover?.thumbKey && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${album.cover.id}/thumb`}
                    alt={album.title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-foreground">{album.title}</p>
                <p className="text-xs text-muted-2">
                  {album.count} photo{album.count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
