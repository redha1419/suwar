import type { photos } from "@/lib/db/schema";
import type { PhotoCardData } from "@/components/photo-grid/photo-card";

type PhotoRow = typeof photos.$inferSelect;

export function toPhotoCardData(p: PhotoRow): PhotoCardData {
  return {
    id: p.id,
    originalFilename: p.originalFilename,
    width: p.width,
    height: p.height,
    hasThumb: Boolean(p.thumbKey),
    processingError: p.processingError,
    blurhash: p.blurhash,
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
  };
}
