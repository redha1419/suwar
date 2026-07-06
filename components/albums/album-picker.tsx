"use client";

import { useState } from "react";
import { createAlbum } from "@/lib/albums/actions";
import type { AssignToAlbumResult } from "@/lib/photos/actions";

export interface AlbumOption {
  id: string;
  title: string;
}

interface AlbumPickerProps {
  albums: AlbumOption[];
  onPick: (albumId: string) => Promise<AssignToAlbumResult | void>;
  onClose: () => void;
}

function describeResult(result: AssignToAlbumResult | void): string | null {
  if (!result || result.blocked === 0) return null;
  return `${result.blocked} photo${result.blocked === 1 ? "" : "s"} skipped — already in another album. Remove ${result.blocked === 1 ? "it" : "them"} from that album first.`;
}

export function AlbumPicker({ albums, onPick, onClose }: AlbumPickerProps) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [localAlbums, setLocalAlbums] = useState(albums);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = localAlbums.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  const canCreate =
    query.trim().length > 0 &&
    !localAlbums.some((a) => a.title.toLowerCase() === query.trim().toLowerCase());

  async function handlePick(albumId: string) {
    setPending(true);
    try {
      const result = await onPick(albumId);
      const message = describeResult(result);
      if (message) {
        setNotice(message);
      } else {
        onClose();
      }
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
        const result = await onPick(album.id);
        const message = describeResult(result);
        if (message) {
          setNotice(message);
        } else {
          onClose();
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-32"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find or create an album…"
          className="mb-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-muted"
        />
        {notice && (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted">
            <span>{notice}</span>
            <button
              onClick={onClose}
              className="shrink-0 text-foreground/80 hover:text-foreground"
            >
              OK
            </button>
          </div>
        )}
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((album) => (
            <button
              key={album.id}
              disabled={pending}
              onClick={() => handlePick(album.id)}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface disabled:opacity-50"
            >
              {album.title}
            </button>
          ))}
          {canCreate && (
            <button
              disabled={pending}
              onClick={handleCreateAndPick}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-surface disabled:opacity-50"
            >
              + Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-sm text-muted-2">No albums yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
