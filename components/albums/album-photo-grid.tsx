"use client";

import { SelectablePhotoGrid } from "@/components/photo-grid/selectable-photo-grid";
import type { PhotoCardData } from "@/components/photo-grid/photo-card";
import type { AlbumOption } from "@/components/albums/album-picker";
import { removePhotosFromAlbum, trashPhotos } from "@/lib/photos/actions";

export function AlbumPhotoGrid({
  photos,
  albumId,
  albums,
}: {
  photos: PhotoCardData[];
  albumId: string;
  albums: AlbumOption[];
}) {
  return (
    <SelectablePhotoGrid
      photos={photos}
      albums={albums}
      actions={[
        {
          label: "Remove from Album",
          onClick: (ids) => removePhotosFromAlbum(ids, albumId),
        },
        {
          label: "Trash",
          variant: "danger",
          onClick: (ids) => trashPhotos(ids),
        },
      ]}
    />
  );
}
