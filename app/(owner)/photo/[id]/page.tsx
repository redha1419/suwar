import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, albums, rawFiles } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { ExifStrip } from "@/components/exif-strip/exif-strip";
import { PhotoDetailActions } from "@/components/photo-grid/photo-detail-actions";

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwner();
  const { id } = await params;

  const photo = await db.query.photos.findFirst({
    where: and(eq(photos.id, id), eq(photos.ownerId, session.ownerId!)),
  });
  if (!photo) notFound();

  const [rawFile, albumRows] = await Promise.all([
    db.query.rawFiles.findFirst({ where: eq(rawFiles.photoId, id) }),
    db.query.albums.findMany({ where: eq(albums.ownerId, session.ownerId!) }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <ExifStrip
          data={{
            takenAt: photo.takenAt,
            manualTakenAt: photo.manualTakenAt,
            cameraMake: photo.cameraMake,
            cameraModel: photo.cameraModel,
            manualCamera: photo.manualCamera,
            lens: photo.lens,
            aperture: photo.aperture,
            shutterSpeed: photo.shutterSpeed,
            iso: photo.iso,
            focalLength: photo.focalLength,
            gpsLat: photo.gpsLat,
            gpsLon: photo.gpsLon,
            manualLocation: photo.manualLocation,
          }}
        />
        <PhotoDetailActions
          photoId={photo.id}
          filename={photo.originalFilename}
          albums={albumRows.map((a) => ({ id: a.id, title: a.title }))}
        />
      </div>

      <div className="flex justify-center bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/media/${photo.id}/preview`}
          alt={photo.originalFilename}
          className="max-h-[80vh] max-w-full object-contain"
        />
      </div>

      <div className="flex gap-4 text-xs text-neutral-500">
        <a
          href={`/api/media/${photo.id}/original`}
          className="uppercase tracking-wider hover:text-neutral-100"
        >
          Download original
        </a>
        {rawFile && (
          <a
            href={`/api/media/raw/${rawFile.id}`}
            className="uppercase tracking-wider hover:text-neutral-100"
          >
            Download RAW ({rawFile.extension})
          </a>
        )}
      </div>
    </div>
  );
}
