import "server-only";
import exifr from "exifr";

export interface ExtractedExif {
  takenAt: Date | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  aperture: number | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLength: number | null;
  gpsLat: number | null;
  gpsLon: number | null;
  colorProfile: string | null;
  orientation: number | null;
  raw: Record<string, unknown> | null;
}

function shutterSpeedToString(exposureTime: unknown): string | null {
  if (typeof exposureTime !== "number" || !Number.isFinite(exposureTime)) {
    return null;
  }
  if (exposureTime >= 1) return `${Math.round(exposureTime * 10) / 10}s`;
  const denominator = Math.round(1 / exposureTime);
  return `1/${denominator}`;
}

export async function extractExif(buffer: Buffer): Promise<ExtractedExif> {
  const empty: ExtractedExif = {
    takenAt: null,
    cameraMake: null,
    cameraModel: null,
    lens: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    gpsLat: null,
    gpsLon: null,
    colorProfile: null,
    orientation: null,
    raw: null,
  };

  let tags: Record<string, unknown> | undefined;
  try {
    tags = await exifr.parse(buffer);
  } catch {
    return empty;
  }
  if (!tags) return empty;

  const sanitizedRaw = JSON.parse(
    JSON.stringify(tags, (_key, value) => {
      if (value instanceof Uint8Array) return undefined;
      return value;
    })
  ) as Record<string, unknown>;

  const takenAtRaw = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.ModifyDate;

  return {
    takenAt: takenAtRaw instanceof Date ? takenAtRaw : null,
    cameraMake: (tags.Make as string) ?? null,
    cameraModel: (tags.Model as string) ?? null,
    lens: (tags.LensModel as string) ?? (tags.Lens as string) ?? null,
    aperture: typeof tags.FNumber === "number" ? tags.FNumber : null,
    shutterSpeed: shutterSpeedToString(tags.ExposureTime),
    iso: typeof tags.ISO === "number" ? tags.ISO : null,
    focalLength:
      typeof tags.FocalLength === "number" ? tags.FocalLength : null,
    gpsLat: typeof tags.latitude === "number" ? tags.latitude : null,
    gpsLon: typeof tags.longitude === "number" ? tags.longitude : null,
    colorProfile:
      (tags.ProfileDescription as string) ??
      (tags.ColorSpace as string | number)?.toString() ??
      null,
    orientation: typeof tags.Orientation === "number" ? tags.Orientation : null,
    raw: sanitizedRaw,
  };
}
