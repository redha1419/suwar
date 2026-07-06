import Link from "next/link";

export interface PhotoCardData {
  id: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
  hasThumb: boolean;
  processingError: string | null;
}

interface PhotoCardProps {
  photo: PhotoCardData;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function PhotoCard({ photo, selected, onClick }: PhotoCardProps) {
  const aspect =
    photo.width && photo.height ? photo.width / photo.height : 1;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-sm bg-neutral-900 ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "ring-2 ring-neutral-100" : ""}`}
      style={{ aspectRatio: aspect }}
    >
      {photo.hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/media/${photo.id}/thumb`}
          alt={photo.originalFilename}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-200 ${
            selected ? "scale-[0.94]" : "group-hover:scale-[1.02]"
          }`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-neutral-600">
          {photo.processingError ? "Processing failed" : "Processing…"}
        </div>
      )}
      {onClick && (
        <div
          className={`absolute right-2 top-2 h-4 w-4 rounded-full border ${
            selected
              ? "border-neutral-100 bg-neutral-100"
              : "border-white/60 bg-black/20 opacity-0 group-hover:opacity-100"
          }`}
        />
      )}
      {photo.hasThumb && (
        <Link
          href={`/photo/${photo.id}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          Open
        </Link>
      )}
    </div>
  );
}
