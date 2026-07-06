"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlbumPicker, type AlbumOption } from "@/components/albums/album-picker";
import { ShareButton } from "@/components/shares/share-button";
import { assignPhotosToAlbum, trashPhotos } from "@/lib/photos/actions";

export function PhotoDetailActions({
  photoId,
  filename,
  albums,
}: {
  photoId: string;
  filename: string;
  albums: AlbumOption[];
}) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleTrash() {
    setPending(true);
    try {
      await trashPhotos([photoId]);
      router.push("/inbox");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <ShareButton scope="photo" targetId={photoId} label={filename} />
      <button
        onClick={() => setShowPicker(true)}
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
      >
        Add to Album…
      </button>
      <button
        disabled={pending}
        onClick={handleTrash}
        className="rounded-md border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950 disabled:opacity-50"
      >
        Trash
      </button>
      {showPicker && (
        <AlbumPicker
          albums={albums}
          onPick={(albumId) => assignPhotosToAlbum([photoId], albumId)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
