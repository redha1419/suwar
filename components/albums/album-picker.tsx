"use client";

import { useState } from "react";
import { createAlbum } from "@/lib/albums/actions";

export interface AlbumOption {
  id: string;
  title: string;
}

interface AlbumPickerProps {
  albums: AlbumOption[];
  onPick: (albumId: string) => Promise<void>;
  onClose: () => void;
}

export function AlbumPicker({ albums, onPick, onClose }: AlbumPickerProps) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [localAlbums, setLocalAlbums] = useState(albums);

  const filtered = localAlbums.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  const canCreate =
    query.trim().length > 0 &&
    !localAlbums.some((a) => a.title.toLowerCase() === query.trim().toLowerCase());

  async function handlePick(albumId: string) {
    setPending(true);
    try {
      await onPick(albumId);
      onClose();
    } finally {
      setPending(false);
    }
  }

  async function handleCreateAndPick() {
    setPending(true);
    try {
      const album = await createAlbum(query.trim());
      if (album) {
        setLocalAlbums((prev) => [...prev, { id: album.id, title: album.title }]);
        await onPick(album.id);
        onClose();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-32"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-950 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find or create an album…"
          className="mb-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((album) => (
            <button
              key={album.id}
              disabled={pending}
              onClick={() => handlePick(album.id)}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
            >
              {album.title}
            </button>
          ))}
          {canCreate && (
            <button
              disabled={pending}
              onClick={handleCreateAndPick}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-900 disabled:opacity-50"
            >
              + Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-sm text-neutral-600">No albums yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
