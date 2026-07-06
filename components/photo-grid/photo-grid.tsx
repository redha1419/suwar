import { PhotoCard, type PhotoCardData } from "./photo-card";

export function PhotoGrid({ photos }: { photos: PhotoCardData[] }) {
  if (photos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-2">
        Nothing here yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
