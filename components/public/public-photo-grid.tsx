"use client";

import { useCallback, useEffect, useState } from "react";
import { ExifStrip, type ExifStripData } from "@/components/exif-strip/exif-strip";

export interface PublicPhotoData extends ExifStripData {
  id: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
  hasThumb: boolean;
}

export function PublicPhotoGrid({
  photos,
  token,
}: {
  photos: PublicPhotoData[];
  token: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : Math.min(i + 1, photos.length - 1))),
    [photos.length]
  );
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : Math.max(i - 1, 0))),
    []
  );

  useEffect(() => {
    if (openIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openIndex, close, next, prev]);

  if (photos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-neutral-600">
        Nothing here yet.
      </p>
    );
  }

  const open = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setOpenIndex(i)}
            className="relative aspect-square overflow-hidden rounded-sm bg-neutral-900"
          >
            {photo.hasThumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${photo.id}/thumb?t=${token}`}
                alt={photo.originalFilename}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
              />
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/95 p-4"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 text-sm text-neutral-400 hover:text-neutral-100"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/${open.id}/preview?t=${token}`}
            alt={open.originalFilename}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] max-w-full object-contain"
          />
          <div onClick={(e) => e.stopPropagation()}>
            <ExifStrip data={open} />
          </div>
        </div>
      )}
    </>
  );
}
