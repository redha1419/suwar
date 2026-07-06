import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, albums } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { ReviewView } from "@/components/triage/review-view";

export default async function InboxReviewPage() {
  const session = await requireOwner();

  const [inboxPhotos, albumRows] = await Promise.all([
    db.query.photos.findMany({
      where: and(eq(photos.ownerId, session.ownerId!), eq(photos.status, "inbox")),
      orderBy: desc(photos.uploadedAt),
    }),
    db.query.albums.findMany({ where: eq(albums.ownerId, session.ownerId!) }),
  ]);

  return (
    <ReviewView
      initialPhotos={inboxPhotos.map((p) => ({
        id: p.id,
        originalFilename: p.originalFilename,
        hasThumb: Boolean(p.thumbKey),
        takenAt: p.takenAt,
        manualTakenAt: p.manualTakenAt,
        cameraMake: p.cameraMake,
        cameraModel: p.cameraModel,
        manualCamera: p.manualCamera,
        lens: p.lens,
        aperture: p.aperture,
        shutterSpeed: p.shutterSpeed,
        iso: p.iso,
        focalLength: p.focalLength,
        gpsLat: p.gpsLat,
        gpsLon: p.gpsLon,
        manualLocation: p.manualLocation,
      }))}
      albums={albumRows.map((a) => ({ id: a.id, title: a.title }))}
    />
  );
}
