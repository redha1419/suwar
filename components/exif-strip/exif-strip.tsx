export interface ExifStripData {
  takenAt: Date | null;
  manualTakenAt: Date | null;
  cameraMake: string | null;
  cameraModel: string | null;
  manualCamera: string | null;
  lens: string | null;
  aperture: number | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLength: number | null;
  gpsLat: number | null;
  gpsLon: number | null;
  manualLocation: string | null;
}

export function ExifStrip({ data }: { data: ExifStripData }) {
  const takenAt = data.takenAt ?? data.manualTakenAt;
  const camera =
    data.manualCamera ||
    [data.cameraMake, data.cameraModel].filter(Boolean).join(" ");

  const parts = [
    takenAt ? new Date(takenAt).toLocaleString() : null,
    camera || null,
    data.lens,
    data.aperture ? `f/${data.aperture}` : null,
    data.shutterSpeed,
    data.iso ? `ISO ${data.iso}` : null,
    data.focalLength ? `${data.focalLength}mm` : null,
    data.manualLocation ||
      (data.gpsLat && data.gpsLon
        ? `${data.gpsLat.toFixed(4)}, ${data.gpsLon.toFixed(4)}`
        : null),
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
      {parts.map((part, i) => (
        <span key={i}>{part}</span>
      ))}
    </div>
  );
}
