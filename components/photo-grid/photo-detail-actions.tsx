"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlbumPicker, type AlbumOption } from "@/components/albums/album-picker";
import { ShareButton } from "@/components/shares/share-button";
import {
  assignPhotosToAlbum,
  removePhotosFromAlbum,
  trashPhotos,
} from "@/lib/photos/actions";

interface CurrentAlbum {
  id: string;
  title: string;
  slug: string;
}

export function PhotoDetailActions({
  photoId,
  filename,
  albums,
  currentAlbum,
}: {
  photoId: string;
  filename: string;
  albums: AlbumOption[];
  currentAlbum: CurrentAlbum | null;
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

  async function handleRemoveFromAlbum() {
    if (!currentAlbum) return;
    setPending(true);
    try {
      await removePhotosFromAlbum([photoId], currentAlbum.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <ShareButton scope="photo" targetId={photoId} label={filename} />
      {currentAlbum ? (
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground/80">
          <span>
            In{" "}
            <Link
              href={`/albums/${currentAlbum.slug}`}
              className="text-foreground hover:text-accent"
            >
              {currentAlbum.title}
            </Link>
          </span>
          <button
            disabled={pending}
            onClick={handleRemoveFromAlbum}
            className="text-muted hover:text-foreground disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface"
        >
          Add to Album…
        </button>
      )}
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
          onClose={() => {
            setShowPicker(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
