"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ExifStrip, type ExifStripData } from "@/components/exif-strip/exif-strip";

export interface LightboxPhoto extends ExifStripData {
  id: string;
  originalFilename: string;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  mediaUrl: (photoId: string) => string;
  detailHref?: (photoId: string) => string;
  downloadUrl?: (photoId: string) => string;
}

export function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  mediaUrl,
  detailHref,
  downloadUrl,
}: LightboxProps) {
  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNavigate(Math.min(index + 1, photos.length - 1));
      else if (e.key === "ArrowLeft") onNavigate(Math.max(index - 1, 0));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 text-sm text-muted transition-colors hover:text-foreground"
      >
        Close
      </button>

      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
          aria-label="Previous"
          className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-muted transition-colors hover:text-foreground sm:left-5"
        >
          ‹
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
          aria-label="Next"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-muted transition-colors hover:text-foreground sm:right-5"
        >
          ›
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photo.id}
        src={mediaUrl(photo.id)}
        alt={photo.originalFilename}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[78vh] max-w-[92vw] animate-[fadein_200ms_ease-out] object-contain"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-4 flex max-w-[92vw] items-center gap-4"
      >
        <ExifStrip data={photo} />
        {downloadUrl && (
          <a
            href={downloadUrl(photo.id)}
            className="shrink-0 text-xs uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            Download
          </a>
        )}
        {detailHref && (
          <Link
            href={detailHref(photo.id)}
            className="shrink-0 text-xs uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            Details →
          </Link>
        )}
      </div>
    </div>
  );
}
