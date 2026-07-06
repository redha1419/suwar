"use client";

import { useState } from "react";
import { BlurhashImage } from "@/components/photo-grid/blurhash-image";
import { Lightbox } from "@/components/photo-grid/lightbox";
import type { ExifStripData } from "@/components/exif-strip/exif-strip";

export interface PublicPhotoData extends ExifStripData {
  id: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
  hasThumb: boolean;
  blurhash: string | null;
}

export function PublicPhotoGrid({
  photos,
  token,
}: {
  photos: PublicPhotoData[];
  token: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-2">
        Nothing here yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setOpenIndex(i)}
            className="group relative aspect-square overflow-hidden bg-surface"
          >
            {photo.hasThumb && (
              <BlurhashImage
                src={`/api/media/${photo.id}/thumb?t=${token}`}
                alt={photo.originalFilename}
                blurhash={photo.blurhash}
                className="transition-transform duration-300 group-hover:scale-[1.02]"
              />
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
          mediaUrl={(id) => `/api/media/${id}/preview?t=${token}`}
        />
      )}
    </>
  );
}
