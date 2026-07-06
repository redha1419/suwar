"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoCard, type PhotoCardData } from "./photo-card";
import { AlbumPicker, type AlbumOption } from "@/components/albums/album-picker";
import { assignPhotosToAlbum } from "@/lib/photos/actions";

export interface GridAction {
  label: string;
  variant?: "default" | "danger";
  onClick: (selectedIds: string[]) => Promise<void>;
}

interface SelectablePhotoGridProps {
  photos: PhotoCardData[];
  actions?: GridAction[];
  albums?: AlbumOption[]; // pass to enable the "Add to Album…" action
}

export function SelectablePhotoGrid({
  photos,
  actions = [],
  albums,
}: SelectablePhotoGridProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const orderedIds = useMemo(() => photos.map((p) => p.id), [photos]);

  const handleCardClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      const id = orderedIds[index];
      setSelected((prev) => {
        const next = new Set(prev);
        if (e.shiftKey && lastIndex !== null) {
          const [start, end] = [lastIndex, index].sort((a, b) => a - b);
          for (let i = start; i <= end; i++) next.add(orderedIds[i]);
        } else if (e.metaKey || e.ctrlKey) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        } else {
          if (next.size === 1 && next.has(id)) {
            next.clear();
          } else {
            next.clear();
            next.add(id);
          }
        }
        return next;
      });
      setLastIndex(index);
    },
    [orderedIds, lastIndex]
  );

  async function runAction(action: GridAction) {
    setPending(true);
    try {
      await action.onClick([...selected]);
      setSelected(new Set());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleAddToAlbum(albumId: string) {
    await assignPhotosToAlbum([...selected], albumId);
    setSelected(new Set());
    router.refresh();
  }

  if (photos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-neutral-600">
        Nothing here yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950/95 px-4 py-2 backdrop-blur">
          <span className="text-xs text-neutral-400">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            {albums && (
              <button
                disabled={pending}
                onClick={() => setShowPicker(true)}
                className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
              >
                Add to Album…
              </button>
            )}
            {actions.map((action) => (
              <button
                key={action.label}
                disabled={pending}
                onClick={() => runAction(action)}
                className={`rounded-md border px-3 py-1 text-xs disabled:opacity-50 ${
                  action.variant === "danger"
                    ? "border-red-900 text-red-400 hover:bg-red-950"
                    : "border-neutral-700 text-neutral-200 hover:bg-neutral-900"
                }`}
              >
                {action.label}
              </button>
            ))}
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md px-3 py-1 text-xs text-neutral-500 hover:text-neutral-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            selected={selected.has(photo.id)}
            onClick={(e) => handleCardClick(index, e)}
          />
        ))}
      </div>

      {showPicker && albums && (
        <AlbumPicker
          albums={albums}
          onPick={handleAddToAlbum}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
