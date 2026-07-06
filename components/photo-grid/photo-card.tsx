import { BlurhashImage } from "./blurhash-image";
import type { ExifStripData } from "@/components/exif-strip/exif-strip";

export interface PhotoCardData extends ExifStripData {
  id: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
  hasThumb: boolean;
  processingError: string | null;
  blurhash: string | null;
  albumTitle?: string | null;
}

interface PhotoCardProps {
  photo: PhotoCardData;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onExpand?: () => void;
}

export function PhotoCard({ photo, selected, onClick, onExpand }: PhotoCardProps) {
  const aspect =
    photo.width && photo.height ? photo.width / photo.height : 1;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-surface ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "ring-2 ring-foreground" : ""}`}
      style={{ aspectRatio: aspect }}
    >
      {photo.hasThumb ? (
        <BlurhashImage
          src={`/api/media/${photo.id}/thumb`}
          alt={photo.originalFilename}
          blurhash={photo.blurhash}
          className={`transition-transform duration-300 ${
            selected ? "scale-[0.94]" : "group-hover:scale-[1.02]"
          }`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted">
          {photo.processingError ? "Processing failed" : "Processing…"}
        </div>
      )}
      {onClick && (
        <div
          className={`absolute right-2 top-2 h-4 w-4 rounded-full border ${
            selected
              ? "border-foreground bg-foreground"
              : "border-white/60 bg-black/20 opacity-0 group-hover:opacity-100"
          }`}
        />
      )}
      {photo.albumTitle && (
        <div className="absolute bottom-2 left-2 max-w-[calc(100%-2rem)] truncate rounded bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/90 backdrop-blur">
          {photo.albumTitle}
        </div>
      )}
      {photo.hasThumb && onExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="absolute bottom-2 right-2 rounded bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          View
        </button>
      )}
    </div>
  );
}
